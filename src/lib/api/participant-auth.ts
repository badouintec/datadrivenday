import type { Context, Next } from 'hono';
import type {
  AppBindings,
  AppVariables,
  ParticipantSignupPayload,
  ParticipantUser,
} from './types';
import { hashPassword, verifyPassword, getClientIp, getRateLimitCount, incrementRateLimitCount } from './auth';
import {
  getParticipantByEmail,
  getParticipantById,
  insertParticipant,
  markEmailVerified,
  serializeParticipant,
  updateParticipantLastLogin,
  updateParticipantPassword,
  deleteParticipant,
} from '../server/db/participants';
import {
  generateVerificationToken,
  checkVerificationToken,
  sendVerificationEmail,
  generatePasswordResetToken,
  checkPasswordResetToken,
  sendPasswordResetEmail,
  type VerificationEmailError,
} from '../server/email';

const PARTICIPANT_SESSION_DURATION_HOURS = 24 * 14;
const PARTICIPANT_SESSION_COOKIE = 'ddd_participant_session';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string) {
  return EMAIL_RE.test(normalizeEmail(email));
}

export function normalizeOptionalUrl(value?: string | null) {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

function getCookieSessionId(cookieHeader: string) {
  const match = cookieHeader.match(new RegExp(`${PARTICIPANT_SESSION_COOKIE}=([^;]+)`));
  return match?.[1] ?? null;
}

function buildSessionCookie(c: Context, sessionId: string, maxAge: number) {
  const isSecure = new URL(c.req.url).protocol === 'https:';
  const parts = [
    `${PARTICIPANT_SESSION_COOKIE}=${sessionId}`,
    'HttpOnly',
    `SameSite=${isSecure ? 'Strict' : 'Lax'}`,
    `Max-Age=${maxAge}`,
    'Path=/',
  ];
  if (isSecure) parts.splice(2, 0, 'Secure');
  return parts.join('; ');
}

async function createParticipantSession(kv: KVNamespace, participant: ParticipantUser) {
  const sessionId = crypto.randomUUID();
  const expiresAt = new Date(
    Date.now() + PARTICIPANT_SESSION_DURATION_HOURS * 60 * 60 * 1000,
  ).toISOString();

  await kv.put(
    `participant-session:${sessionId}`,
    JSON.stringify({ ...participant, expiresAt }),
    { expirationTtl: PARTICIPANT_SESSION_DURATION_HOURS * 3600 },
  );

  return sessionId;
}

async function getParticipantSession(kv: KVNamespace, sessionId: string) {
  const data = await kv.get(`participant-session:${sessionId}`);
  if (!data) return null;

  const session = JSON.parse(data) as ParticipantUser & { expiresAt: string };
  if (new Date(session.expiresAt) < new Date()) {
    await kv.delete(`participant-session:${sessionId}`);
    return null;
  }

  return session;
}

async function syncParticipantSession(
  kv: KVNamespace,
  sessionId: string,
  participant: ParticipantUser,
  expiresAt: string,
) {
  const ttl = Math.max(1, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
  await kv.put(
    `participant-session:${sessionId}`,
    JSON.stringify({ ...participant, expiresAt }),
    { expirationTtl: ttl },
  );
}

async function verifyParticipantCredentials(db: D1Database, email: string, password: string) {
  const row = await getParticipantByEmail(db, normalizeEmail(email));
  if (!row) return null;

  const valid = await verifyPassword(password, row.password_hash);
  if (!valid) return null;

  // Migrate legacy SHA-256 hash to PBKDF2 on successful login
  if (!row.password_hash.startsWith('pbkdf2:')) {
    const newHash = await hashPassword(password);
    await db.prepare('UPDATE participants SET password_hash = ? WHERE id = ?').bind(newHash, row.id).run();
  }

  await updateParticipantLastLogin(db, row.id);
  const freshRow = await getParticipantById(db, row.id);
  return freshRow ? serializeParticipant(freshRow) : null;
}

type ParticipantContext = Context<{ Bindings: Partial<AppBindings>; Variables: AppVariables }>;

function getRequestOrigin(c: ParticipantContext) {
  return new URL(c.req.url).origin;
}

function isLocalOrigin(origin: string) {
  const hostname = new URL(origin).hostname;
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
}

function getSiteUrl(c: ParticipantContext) {
  const requestOrigin = getRequestOrigin(c);
  return isLocalOrigin(requestOrigin) ? requestOrigin : (c.env.PUBLIC_SITE_URL ?? requestOrigin);
}

function getSenderDomain(siteUrl: string) {
  const hostname = new URL(siteUrl).hostname.replace('www.', '');
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
    return undefined;
  }
  return hostname;
}

async function prepareVerificationDelivery(
  c: ParticipantContext,
  participant: ParticipantUser,
): Promise<{
  verificationEmailAvailable: boolean;
  verificationEmailSent: boolean;
  verificationDirectUrl?: string;
  verificationError?: VerificationEmailError;
}> {
  const siteUrl = getSiteUrl(c);
  const verifyToken = await generateVerificationToken(c.env.APP_SESSION!, participant.id);
  const verifyUrl = `${siteUrl}/api/participant/verify-email?token=${verifyToken}`;
  const requestOrigin = getRequestOrigin(c);
  const allowDirectUrl = isLocalOrigin(requestOrigin);
  const resendApiKey = typeof c.env.RESEND_API_KEY === 'string' ? c.env.RESEND_API_KEY : null;

  if (!resendApiKey) {
    return {
      verificationEmailAvailable: false,
      verificationEmailSent: false,
      verificationDirectUrl: allowDirectUrl ? verifyUrl : undefined,
    };
  }

  const delivery = await sendVerificationEmail(
    resendApiKey,
    participant.email,
    participant.fullName,
    verifyUrl,
    getSenderDomain(siteUrl),
  );

  return {
    verificationEmailAvailable: true,
    verificationEmailSent: delivery.ok,
    verificationDirectUrl: !delivery.ok && allowDirectUrl ? verifyUrl : undefined,
    verificationError: delivery.ok ? undefined : delivery.error ?? undefined,
  };
}

export function requireParticipantAuth() {
  return async (c: ParticipantContext, next: Next) => {
    const cookie = c.req.header('Cookie') ?? '';
    const sessionId = getCookieSessionId(cookie);

    if (!sessionId) {
      return c.json({ ok: false, error: 'unauthorized' }, 401);
    }

    const session = await getParticipantSession(c.env.APP_SESSION!, sessionId);
    if (!session) {
      return c.json({ ok: false, error: 'session_expired' }, 401);
    }

    if (c.env.DB) {
      const row = await getParticipantById(c.env.DB, session.id);
      if (!row) {
        await c.env.APP_SESSION!.delete(`participant-session:${sessionId}`);
        return c.json({ ok: false, error: 'session_expired' }, 401);
      }

      const freshParticipant = serializeParticipant(row);
      c.set('participant', freshParticipant);
      await syncParticipantSession(c.env.APP_SESSION!, sessionId, freshParticipant, session.expiresAt);
      await next();
      return;
    }

    c.set('participant', session);
    await next();
  };
}

export function requireVerifiedParticipantAuth() {
  return async (c: ParticipantContext, next: Next) => {
    const cookie = c.req.header('Cookie') ?? '';
    const sessionId = getCookieSessionId(cookie);

    if (!sessionId) {
      return c.json({ ok: false, error: 'unauthorized' }, 401);
    }

    const session = await getParticipantSession(c.env.APP_SESSION!, sessionId);
    if (!session) {
      return c.json({ ok: false, error: 'session_expired' }, 401);
    }

    const db = c.env.DB;
    if (!db) {
      return c.json({ ok: false, error: 'server_misconfigured' }, 500);
    }

    const row = await getParticipantById(db, session.id);
    if (!row) {
      await c.env.APP_SESSION!.delete(`participant-session:${sessionId}`);
      return c.json({ ok: false, error: 'session_expired' }, 401);
    }

    const freshParticipant = serializeParticipant(row);
    if (!freshParticipant.emailVerified) {
      c.set('participant', freshParticipant);
      await syncParticipantSession(c.env.APP_SESSION!, sessionId, freshParticipant, session.expiresAt);
      return c.json({ ok: false, error: 'email_verification_required' }, 403);
    }

    c.set('participant', freshParticipant);
    await syncParticipantSession(c.env.APP_SESSION!, sessionId, freshParticipant, session.expiresAt);
    await next();
  };
}

export async function handleParticipantSignup(c: ParticipantContext) {
  const body = await c.req.json<ParticipantSignupPayload>().catch(() => null);

  if (!body?.fullName || !body?.email || !body?.password) {
    return c.json({ ok: false, error: 'missing_fields' }, 400);
  }

  const fullName = body.fullName.trim();
  const email = normalizeEmail(body.email);
  const projectUrl = normalizeOptionalUrl(body.projectUrl);

  if (!fullName) {
    return c.json({ ok: false, error: 'missing_fields' }, 400);
  }

  if (!isValidEmail(email)) {
    return c.json({ ok: false, error: 'invalid_email' }, 400);
  }

  if (body.projectUrl?.trim() && !projectUrl) {
    return c.json({ ok: false, error: 'invalid_project_url' }, 400);
  }

  if (body.age != null && (body.age < 10 || body.age > 99)) {
    return c.json({ ok: false, error: 'invalid_age' }, 400);
  }

  if (!c.env.APP_SESSION) {
    return c.json({ ok: false, error: 'server_misconfigured' }, 500);
  }

  const signupIp = getClientIp(c.req);
  const signupFails = await getRateLimitCount(c.env.APP_SESSION, `signup:${signupIp}`, 3600);
  if (signupFails >= 5) {
    return c.json({ ok: false, error: 'too_many_attempts' }, 429);
  }
  await incrementRateLimitCount(c.env.APP_SESSION, `signup:${signupIp}`, 3600);

  if ((body.password ?? '').length < 8) {
    return c.json({ ok: false, error: 'weak_password' }, 400);
  }

  if (body.password.length > 128) {
    return c.json({ ok: false, error: 'weak_password' }, 400);
  }

  if (!c.env.DB || !c.env.APP_SESSION) {
    return c.json({ ok: false, error: 'server_misconfigured' }, 500);
  }

  let row;
  try {
    row = await insertParticipant(c.env.DB, {
      email,
      passwordHash: await hashPassword(body.password),
      fullName,
      occupation: body.occupation,
      organization: body.organization,
      projectUrl: projectUrl ?? undefined,
      educationLevel: body.educationLevel,
      age: body.age,
    });
  } catch (err: unknown) {
    // UNIQUE constraint on email — race-safe duplicate detection
    if (err instanceof Error && err.message.includes('UNIQUE')) {
      return c.json({ ok: false, error: 'email_taken' }, 409);
    }
    throw err;
  }

  if (!row) {
    return c.json({ ok: false, error: 'create_failed' }, 500);
  }

  const participant = serializeParticipant(row);
  const sessionId = await createParticipantSession(c.env.APP_SESSION, participant);

  const delivery = await prepareVerificationDelivery(c, participant);

  return new Response(JSON.stringify({
    ok: true,
    participant,
    needsVerification: true,
    verificationEmailAvailable: delivery.verificationEmailAvailable,
    verificationEmailSent: delivery.verificationEmailSent,
    verificationDirectUrl: delivery.verificationDirectUrl,
    verificationError: delivery.verificationError,
  }), {
    status: 201,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': buildSessionCookie(c, sessionId, PARTICIPANT_SESSION_DURATION_HOURS * 3600),
    },
  });
}

export async function handleParticipantLogin(c: ParticipantContext) {
  const body = await c.req.json<{ email: string; password: string }>().catch(() => null);

  if (!body?.email || !body?.password) {
    return c.json({ ok: false, error: 'missing_fields' }, 400);
  }

  if (!isValidEmail(body.email)) {
    return c.json({ ok: false, error: 'invalid_email' }, 400);
  }

  if (!c.env.DB || !c.env.APP_SESSION) {
    return c.json({ ok: false, error: 'server_misconfigured' }, 500);
  }

  const loginEmail = normalizeEmail(body.email);
  const loginIp = getClientIp(c.req);

  // Rate limit by IP
  const loginFails = await getRateLimitCount(c.env.APP_SESSION, `login-fail:${loginIp}`, 900);
  if (loginFails >= 10) {
    return c.json({ ok: false, error: 'too_many_attempts' }, 429);
  }

  // Rate limit by email address — prevents distributed credential stuffing
  const emailFails = await getRateLimitCount(c.env.APP_SESSION, `login-fail-email:${loginEmail}`, 900);
  if (emailFails >= 10) {
    return c.json({ ok: false, error: 'too_many_attempts' }, 429);
  }

  const participant = await verifyParticipantCredentials(c.env.DB, body.email, body.password);
  if (!participant) {
    await Promise.all([
      incrementRateLimitCount(c.env.APP_SESSION, `login-fail:${loginIp}`, 900),
      incrementRateLimitCount(c.env.APP_SESSION, `login-fail-email:${loginEmail}`, 900),
    ]);
    await new Promise((resolve) => setTimeout(resolve, 200 + Math.random() * 100));
    return c.json({ ok: false, error: 'invalid_credentials' }, 401);
  }

  const sessionId = await createParticipantSession(c.env.APP_SESSION, participant);

  return new Response(JSON.stringify({ ok: true, participant }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': buildSessionCookie(c, sessionId, PARTICIPANT_SESSION_DURATION_HOURS * 3600),
    },
  });
}

export async function handleParticipantLogout(c: ParticipantContext) {
  const cookie = c.req.header('Cookie') ?? '';
  const sessionId = getCookieSessionId(cookie);
  if (sessionId) {
    await c.env.APP_SESSION!.delete(`participant-session:${sessionId}`);
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': buildSessionCookie(c, '', 0),
    },
  });
}

export async function handleParticipantMe(c: ParticipantContext) {
  const participant = c.get('participant');
  if (!participant) {
    return c.json({ ok: false, error: 'unauthorized' }, 401);
  }
  return c.json({ ok: true, participant });
}

// GET /api/participant/verify-email?token=xxx — clicked from email link
export async function handleVerifyEmail(c: ParticipantContext) {
  const token = c.req.query('token');
  const siteUrl = getSiteUrl(c);

  if (!c.env.APP_SESSION || !c.env.DB) {
    return c.redirect(`${siteUrl}/registro?verify=unavailable`);
  }

  if (!token) {
    return c.redirect(`${siteUrl}/registro?verify=invalid`);
  }

  const participantId = await checkVerificationToken(c.env.APP_SESSION, token);
  if (!participantId) {
    return c.redirect(`${siteUrl}/registro?verify=expired`);
  }

  await markEmailVerified(c.env.DB, participantId);
  return c.redirect(`${siteUrl}/registro?verify=ok`);
}

export async function handleResendVerification(c: ParticipantContext) {
  const participant = c.get('participant');
  if (!participant) {
    return c.json({ ok: false, error: 'unauthorized' }, 401);
  }

  if (participant.emailVerified) {
    return c.json({ ok: true, already: true });
  }

  if (!c.env.APP_SESSION) {
    return c.json({ ok: false, error: 'email_not_configured' }, 500);
  }

  const resendFails = await getRateLimitCount(c.env.APP_SESSION, `resend:${participant.email}`, 3600);
  if (resendFails >= 5) {
    return c.json({ ok: false, error: 'too_many_attempts' }, 429);
  }
  await incrementRateLimitCount(c.env.APP_SESSION, `resend:${participant.email}`, 3600);

  const delivery = await prepareVerificationDelivery(c, participant);

  if (!delivery.verificationEmailAvailable) {
    return c.json({
      ok: false,
      error: 'email_not_configured',
      verificationDirectUrl: delivery.verificationDirectUrl,
    }, 500);
  }

  if (!delivery.verificationEmailSent && !delivery.verificationDirectUrl) {
    return c.json({
      ok: false,
      error: 'send_failed',
      verificationError: delivery.verificationError,
    }, 500);
  }

  return c.json({
    ok: true,
    delivered: delivery.verificationEmailSent,
    verificationDirectUrl: delivery.verificationDirectUrl,
    verificationError: delivery.verificationError,
  });
}

// POST /api/participant/forgot-password — request a password reset email
export async function handleForgotPassword(c: ParticipantContext) {
  const body = await c.req.json<{ email: string }>().catch(() => null);

  if (!body?.email || !isValidEmail(body.email)) {
    return c.json({ ok: false, error: 'invalid_email' }, 400);
  }

  if (!c.env.APP_SESSION) {
    return c.json({ ok: false, error: 'server_misconfigured' }, 500);
  }

  // Rate limit: 3 requests per hour per IP to prevent email flooding
  const ip = getClientIp(c.req);
  const forgotCount = await getRateLimitCount(c.env.APP_SESSION, `forgot-pwd:${ip}`, 3600);
  if (forgotCount >= 3) {
    // Return ok:true to avoid user enumeration via timing
    return c.json({ ok: true });
  }
  await incrementRateLimitCount(c.env.APP_SESSION, `forgot-pwd:${ip}`, 3600);

  const email = normalizeEmail(body.email);

  if (!c.env.DB) {
    return c.json({ ok: false, error: 'server_misconfigured' }, 500);
  }

  const row = await getParticipantByEmail(c.env.DB, email);

  // Always return ok:true — do not leak whether email exists
  if (!row) {
    await new Promise(r => setTimeout(r, 200 + Math.random() * 100));
    return c.json({ ok: true });
  }

  const resendApiKey = typeof c.env.RESEND_API_KEY === 'string' ? c.env.RESEND_API_KEY : null;
  if (!resendApiKey) {
    // In dev without email: still create token and return direct URL for testing
    const token = await generatePasswordResetToken(c.env.APP_SESSION, row.id);
    const siteUrl = getSiteUrl(c);
    const resetUrl = `${siteUrl}/registro?reset_token=${token}`;
    const allowDirectUrl = isLocalOrigin(getRequestOrigin(c));
    return c.json({ ok: true, resetDirectUrl: allowDirectUrl ? resetUrl : undefined });
  }

  const token = await generatePasswordResetToken(c.env.APP_SESSION, row.id);
  const siteUrl = getSiteUrl(c);
  const resetUrl = `${siteUrl}/registro?reset_token=${token}`;
  const fromDomain = getSenderDomain(siteUrl);
  const participant = serializeParticipant(row);

  await sendPasswordResetEmail(resendApiKey, email, participant.fullName, resetUrl, fromDomain);

  return c.json({ ok: true });
}

// POST /api/participant/reset-password — set new password using token
export async function handleResetPassword(c: ParticipantContext) {
  const body = await c.req.json<{ token: string; password: string }>().catch(() => null);

  if (!body?.token || !body?.password) {
    return c.json({ ok: false, error: 'missing_fields' }, 400);
  }

  if (body.password.length < 8) {
    return c.json({ ok: false, error: 'password_too_short' }, 400);
  }

  if (body.password.length > 128) {
    return c.json({ ok: false, error: 'password_too_long' }, 400);
  }

  if (!c.env.APP_SESSION || !c.env.DB) {
    return c.json({ ok: false, error: 'server_misconfigured' }, 500);
  }

  const participantId = await checkPasswordResetToken(c.env.APP_SESSION, body.token);
  if (!participantId) {
    return c.json({ ok: false, error: 'token_invalid_or_expired' }, 400);
  }

  const newHash = await hashPassword(body.password);
  await updateParticipantPassword(c.env.DB, participantId, newHash);

  // Invalidate all existing sessions for this participant for security
  // (KV doesn't support prefix scan in Workers free tier, so we rely on
  //  short session TTL and the user re-logging in)

  return c.json({ ok: true });
}

// DELETE /api/participant/account — erase participant account (GDPR/LFPDPPP)
export async function handleDeleteAccount(c: ParticipantContext) {
  const participant = c.get('participant');
  if (!participant) {
    return c.json({ ok: false, error: 'unauthorized' }, 401);
  }

  // Require password confirmation to prevent accidental/CSRF deletion
  const body = await c.req.json<{ password: string }>().catch(() => null);
  if (!body?.password) {
    return c.json({ ok: false, error: 'password_required' }, 400);
  }

  if (!c.env.DB || !c.env.APP_SESSION) {
    return c.json({ ok: false, error: 'server_misconfigured' }, 500);
  }

  const row = await getParticipantById(c.env.DB, participant.id);
  if (!row) {
    return c.json({ ok: false, error: 'not_found' }, 404);
  }

  const valid = await verifyPassword(body.password, row.password_hash);
  if (!valid) {
    return c.json({ ok: false, error: 'invalid_password' }, 401);
  }

  // Delete participant data from DB
  await deleteParticipant(c.env.DB, participant.id);

  // Clear current session cookie
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': buildSessionCookie(c, '', 0),
    },
  });
}