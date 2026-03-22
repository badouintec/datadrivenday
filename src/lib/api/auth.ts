import type { Context, Next } from 'hono';
import type { AdminRol, AdminUser, AppBindings, AppVariables } from './types';

const SESSION_DURATION_HOURS = 8;
const SESSION_COOKIE = 'ddd_session';

// ── Permisos por rol ──────────────────────────────────────────────────────────
const PERMISSIONS: Record<AdminRol, string[]> = {
  superadmin: [
    'presentations:read', 'presentations:write', 'presentations:delete',
    'blog:read', 'blog:write', 'blog:delete', 'blog:publish',
    'registros:read', 'registros:export',
    'participants:read', 'participants:write',
    'recursos:read', 'recursos:write', 'recursos:delete',
    'users:read', 'users:write',
  ],
  editor: [
    'presentations:read', 'presentations:write',
    'blog:read', 'blog:write', 'blog:publish',
    'registros:read',
    'participants:read', 'participants:write',
    'recursos:read', 'recursos:write',
  ],
  viewer: [
    'presentations:read',
    'blog:read',
    'registros:read',
    'participants:read',
    'recursos:read',
  ],
};

export function can(user: AdminUser, permission: string): boolean {
  return PERMISSIONS[user.rol]?.includes(permission) ?? false;
}

// ── Password hashing (PBKDF2 + salt) ─────────────────────────────────────────
const PBKDF2_ITERATIONS = 100_000;
const SALT_BYTES = 16;

async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits'],
  );
  const derived = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    key, 256,
  );
  const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
  const hashHex = Array.from(new Uint8Array(derived)).map(b => b.toString(16).padStart(2, '0')).join('');
  return `pbkdf2:${PBKDF2_ITERATIONS}:${saltHex}:${hashHex}`;
}

// Constant-time string comparison to prevent timing side-channel attacks
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  // Support legacy SHA-256 hashes (64 hex chars, no prefix)
  if (!stored.startsWith('pbkdf2:')) {
    const legacyBuf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password));
    const legacyHash = Array.from(new Uint8Array(legacyBuf)).map(b => b.toString(16).padStart(2, '0')).join('');
    return timingSafeEqual(legacyHash, stored);
  }

  const [, iterStr, saltHex, hashHex] = stored.split(':');
  const iterations = parseInt(iterStr, 10);
  if (!Number.isFinite(iterations) || iterations < 10_000) return false;
  const salt = new Uint8Array(saltHex.match(/.{2}/g)!.map(h => parseInt(h, 16)));
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits'],
  );
  const derived = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    key, 256,
  );
  const computedHex = Array.from(new Uint8Array(derived)).map(b => b.toString(16).padStart(2, '0')).join('');
  return timingSafeEqual(computedHex, hashHex);
}

export { hashPassword, verifyPassword };

// ── Verificar credenciales contra D1 ──────────────────────────────────────────
export async function verifyCredentials(
  db: D1Database,
  username: string,
  password: string
): Promise<AdminUser | null> {
  const row = await db
    .prepare(
      `SELECT id, username, rol, nombre, pass_hash FROM admin_users
       WHERE username = ?`
    )
    .bind(username.toLowerCase().trim())
    .first<{ id: string; username: string; rol: AdminRol; nombre: string | null; pass_hash: string }>();

  if (!row) return null;

  const valid = await verifyPassword(password, row.pass_hash);
  if (!valid) return null;

  // Migrate legacy SHA-256 hash to PBKDF2 on successful login
  if (!row.pass_hash.startsWith('pbkdf2:')) {
    const newHash = await hashPassword(password);
    await db.prepare('UPDATE admin_users SET pass_hash = ? WHERE id = ?').bind(newHash, row.id).run();
  }

  await db
    .prepare('UPDATE admin_users SET last_login = datetime("now") WHERE id = ?')
    .bind(row.id)
    .run();

  return { id: row.id, username: row.username, rol: row.rol, nombre: row.nombre };
}

// ── Crear sesión en KV ────────────────────────────────────────────────────────
export async function createSession(
  kv: KVNamespace,
  user: AdminUser
): Promise<string> {
  const sessionId = crypto.randomUUID();
  const expiresAt = new Date(
    Date.now() + SESSION_DURATION_HOURS * 60 * 60 * 1000
  ).toISOString();

  await kv.put(
    `session:${sessionId}`,
    JSON.stringify({ ...user, expiresAt }),
    { expirationTtl: SESSION_DURATION_HOURS * 3600 }
  );

  return sessionId;
}

// ── Leer sesión de KV ─────────────────────────────────────────────────────────
export async function getSession(
  kv: KVNamespace,
  sessionId: string
): Promise<(AdminUser & { expiresAt: string }) | null> {
  const data = await kv.get(`session:${sessionId}`);
  if (!data) return null;

  const session = JSON.parse(data) as AdminUser & { expiresAt: string };
  if (new Date(session.expiresAt) < new Date()) {
    await kv.delete(`session:${sessionId}`);
    return null;
  }

  return session;
}

// ── Extraer session ID de cookie ──────────────────────────────────────────────
function getSessionIdFromCookie(cookieHeader: string): string | null {
  const match = cookieHeader.match(new RegExp(`${SESSION_COOKIE}=([^;]+)`));
  return match?.[1] ?? null;
}

// ── Middleware: requiere auth + permiso opcional ──────────────────────────────
export function requireAuth(permission?: string) {
  return async (c: Context<{ Bindings: Partial<AppBindings>; Variables: AppVariables }>, next: Next) => {
    const cookie = c.req.header('Cookie') ?? '';
    const sessionId = getSessionIdFromCookie(cookie);

    if (!sessionId) {
      const isApi = c.req.path.startsWith('/api/');
      return isApi
        ? c.json({ ok: false, error: 'unauthorized' }, 401)
        : c.redirect('/admin/login?redirect=' + encodeURIComponent(c.req.path));
    }

    const session = await getSession(c.env.APP_SESSION!, sessionId);
    if (!session) {
      const isApi = c.req.path.startsWith('/api/');
      return isApi
        ? c.json({ ok: false, error: 'session_expired' }, 401)
        : c.redirect('/admin/login?expired=1');
    }

    if (permission && !can(session, permission)) {
      return c.json({ ok: false, error: 'forbidden' }, 403);
    }

    c.set('user', session);
    await next();
  };
}

// ── Handler: POST /api/admin/login ────────────────────────────────────────────
export async function handleLogin(c: Context<{ Bindings: Partial<AppBindings>; Variables: AppVariables }>) {
  const body = await c.req.json<{ user: string; password: string }>().catch(() => null);

  if (!body?.user || !body?.password) {
    return c.json({ ok: false, error: 'missing_fields' }, 400);
  }

  if (!c.env.DB) {
    return c.json({ ok: false, error: 'server_misconfigured' }, 500);
  }

  const loginIp = getClientIp(c.req);
  const adminLoginFails = await getRateLimitCount(c.env.APP_SESSION!, `admin-login-fail:${loginIp}`, 900);
  if (adminLoginFails >= 5) {
    await new Promise(r => setTimeout(r, 200 + Math.random() * 100));
    return c.json({ ok: false, error: 'too_many_attempts' }, 429);
  }

  const user = await verifyCredentials(c.env.DB, body.user, body.password);

  if (!user) {
    await incrementRateLimitCount(c.env.APP_SESSION!, `admin-login-fail:${loginIp}`, 900);
    // Timing-safe delay
    await new Promise(r => setTimeout(r, 200 + Math.random() * 100));
    return c.json({ ok: false, error: 'invalid_credentials' }, 401);
  }

  const sessionId = await createSession(c.env.APP_SESSION!, user);

  const isSecure = new URL(c.req.url).protocol === 'https:';
  const cookieParts = [
    `${SESSION_COOKIE}=${sessionId}`,
    'HttpOnly',
    `SameSite=${isSecure ? 'Strict' : 'Lax'}`,
    `Max-Age=${SESSION_DURATION_HOURS * 3600}`,
    'Path=/',
  ];
  if (isSecure) cookieParts.splice(2, 0, 'Secure');

  return new Response(
    JSON.stringify({ ok: true, user: { username: user.username, rol: user.rol, nombre: user.nombre } }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': cookieParts.join('; '),
      },
    }
  );
}

// ── Handler: POST /api/admin/logout ───────────────────────────────────────────
export async function handleLogout(c: Context<{ Bindings: Partial<AppBindings>; Variables: AppVariables }>) {
  const cookie = c.req.header('Cookie') ?? '';
  const sessionId = getSessionIdFromCookie(cookie);

  if (sessionId) {
    await c.env.APP_SESSION!.delete(`session:${sessionId}`);
  }

  const isSecure = new URL(c.req.url).protocol === 'https:';
  const clearParts = [
    `${SESSION_COOKIE}=`,
    'HttpOnly',
    `SameSite=${isSecure ? 'Strict' : 'Lax'}`,
    'Max-Age=0',
    'Path=/',
  ];
  if (isSecure) clearParts.splice(2, 0, 'Secure');

  return new Response(null, {
    status: 302,
    headers: {
      Location: '/admin/login',
      'Set-Cookie': clearParts.join('; '),
    },
  });
}

// ── Handler: GET /api/admin/me ────────────────────────────────────────────────
export async function handleMe(c: Context<{ Bindings: Partial<AppBindings>; Variables: AppVariables }>) {
  const user = c.get('user');
  if (!user) {
    return c.json({ ok: false, error: 'unauthorized' }, 401);
  }
  return c.json({ ok: true, user });
}

// ── Rate limiting utilities ───────────────────────────────────────────────────
// Uses APP_SESSION KV for per-key attempt counters with time-window expiry.
// Keys are namespaced with "rl:" to avoid collision with session keys.

export function getClientIp(req: { header: (name: string) => string | undefined }): string {
  return req.header('CF-Connecting-IP')?.trim()
    ?? req.header('X-Forwarded-For')?.split(',')[0]?.trim()
    ?? 'unknown';
}

export async function getRateLimitCount(
  kv: KVNamespace,
  rateLimitKey: string,
  windowSecs: number,
): Promise<number> {
  const window = Math.floor(Date.now() / (windowSecs * 1000));
  const raw = await kv.get(`rl:${rateLimitKey}:${window}`);
  return raw ? parseInt(raw, 10) : 0;
}

export async function incrementRateLimitCount(
  kv: KVNamespace,
  rateLimitKey: string,
  windowSecs: number,
): Promise<void> {
  const window = Math.floor(Date.now() / (windowSecs * 1000));
  const kvKey = `rl:${rateLimitKey}:${window}`;
  const raw = await kv.get(kvKey);
  await kv.put(kvKey, String((raw ? parseInt(raw, 10) : 0) + 1), {
    expirationTtl: windowSecs + 60,
  });
}
