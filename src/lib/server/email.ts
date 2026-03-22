const VERIFY_TOKEN_TTL_SECONDS = 60 * 60; // 1 hour
const PASSWORD_RESET_TOKEN_TTL_SECONDS = 60 * 60; // 1 hour

export type VerificationEmailError =
  | 'domain_not_verified'
  | 'testing_recipient_restricted'
  | 'invalid_sender'
  | 'api_error';

export interface VerificationEmailResult {
  ok: boolean;
  status: number;
  error: VerificationEmailError | null;
  message: string | null;
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function getSafeFirstName(name: string) {
  return escapeHtml((name.trim().split(/\s+/)[0] || 'Participante').slice(0, 80));
}

function getSafeVerifyUrl(verifyUrl: string) {
  try {
    const parsed = new URL(verifyUrl);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return escapeHtml(parsed.toString());
    }
  } catch {
    return null;
  }

  return null;
}

export async function generateVerificationToken(
  kv: KVNamespace,
  participantId: string,
): Promise<string> {
  const token = crypto.randomUUID();
  // Store token → participantId mapping (so we can look up who to verify)
  await kv.put(
    `email-verify:${token}`,
    participantId,
    { expirationTtl: VERIFY_TOKEN_TTL_SECONDS },
  );
  return token;
}

export async function checkVerificationToken(
  kv: KVNamespace,
  token: string,
): Promise<string | null> {
  const participantId = await kv.get(`email-verify:${token}`);
  if (!participantId) return null;
  await kv.delete(`email-verify:${token}`);
  return participantId;
}

export async function generatePasswordResetToken(
  kv: KVNamespace,
  participantId: string,
): Promise<string> {
  const token = crypto.randomUUID();
  await kv.put(
    `pwd-reset:${token}`,
    participantId,
    { expirationTtl: PASSWORD_RESET_TOKEN_TTL_SECONDS },
  );
  return token;
}

export async function checkPasswordResetToken(
  kv: KVNamespace,
  token: string,
): Promise<string | null> {
  const participantId = await kv.get(`pwd-reset:${token}`);
  if (!participantId) return null;
  // Token is single-use — delete immediately on read
  await kv.delete(`pwd-reset:${token}`);
  return participantId;
}

export async function sendVerificationEmail(
  apiKey: string,
  to: string,
  name: string,
  verifyUrl: string,
  fromDomain?: string,
): Promise<VerificationEmailResult> {
  const safeVerifyUrl = getSafeVerifyUrl(verifyUrl);
  if (!safeVerifyUrl) {
    return {
      ok: false,
      status: 400,
      error: 'api_error',
      message: 'Invalid verification URL.',
    };
  }

  const from = fromDomain
    ? `Data Driven Day <noreply@${fromDomain}>`
    : 'Data Driven Day <onboarding@resend.dev>';

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: 'Verifica tu correo — Data Driven Day',
      html: `
        <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;">
          <h2 style="margin:0 0 8px;font-size:20px;color:#111;">Hola, ${getSafeFirstName(name)}</h2>
          <p style="margin:0 0 24px;color:#555;font-size:15px;">
            Da click en el botón para verificar tu correo en Data Driven Day:
          </p>
          <div style="text-align:center;margin:0 0 24px;">
            <a href="${safeVerifyUrl}"
               style="display:inline-block;background:#6366f1;color:#fff;font-weight:600;font-size:16px;padding:14px 32px;border-radius:8px;text-decoration:none;">
              Verificar mi correo
            </a>
          </div>
          <p style="margin:0 0 8px;color:#888;font-size:13px;">
            O copia y pega este link en tu navegador:
          </p>
          <p style="margin:0;color:#6366f1;font-size:13px;word-break:break-all;">
            ${safeVerifyUrl}
          </p>
          <p style="margin:24px 0 0;color:#888;font-size:13px;">
            Este link expira en 1 hora. Si no creaste una cuenta, ignora este correo.
          </p>
        </div>
      `,
    }),
  });

  if (res.ok) {
    return {
      ok: true,
      status: res.status,
      error: null,
      message: null,
    };
  }

  let message: string | null = null;

  try {
    const payload = await res.json() as { message?: string };
    message = typeof payload.message === 'string' ? payload.message : null;
  } catch {
    message = await res.text().catch(() => null);
  }

  const normalized = (message || '').toLowerCase();
  let error: VerificationEmailError = 'api_error';

  if (normalized.includes('domain is not verified')) {
    error = 'domain_not_verified';
  } else if (normalized.includes('only send testing emails to your own email address')) {
    error = 'testing_recipient_restricted';
  } else if (normalized.includes('invalid `from` address') || normalized.includes('invalid from address')) {
    error = 'invalid_sender';
  }

  return {
    ok: false,
    status: res.status,
    error,
    message,
  };
}

export async function sendPasswordResetEmail(
  apiKey: string,
  to: string,
  name: string,
  resetUrl: string,
  fromDomain?: string,
): Promise<VerificationEmailResult> {
  const safeResetUrl = getSafeVerifyUrl(resetUrl);
  if (!safeResetUrl) {
    return { ok: false, status: 400, error: 'api_error', message: 'Invalid reset URL.' };
  }

  const from = fromDomain
    ? `Data Driven Day <noreply@${fromDomain}>`
    : 'Data Driven Day <onboarding@resend.dev>';

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: 'Restablece tu contraseña — Data Driven Day',
      html: `
        <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;">
          <h2 style="margin:0 0 8px;font-size:20px;color:#111;">Hola, ${getSafeFirstName(name)}</h2>
          <p style="margin:0 0 24px;color:#555;font-size:15px;">
            Recibimos una solicitud para restablecer la contraseña de tu cuenta en Data Driven Day.
          </p>
          <div style="text-align:center;margin:0 0 24px;">
            <a href="${safeResetUrl}"
               style="display:inline-block;background:#6366f1;color:#fff;font-weight:600;font-size:16px;padding:14px 32px;border-radius:8px;text-decoration:none;">
              Cambiar mi contraseña
            </a>
          </div>
          <p style="margin:0 0 8px;color:#888;font-size:13px;">
            O copia y pega este link en tu navegador:
          </p>
          <p style="margin:0;color:#6366f1;font-size:13px;word-break:break-all;">
            ${safeResetUrl}
          </p>
          <p style="margin:24px 0 0;color:#888;font-size:13px;">
            Este link expira en 1 hora. Si no solicitaste esto, ignora este correo. Tu contraseña no cambiará.
          </p>
        </div>
      `,
    }),
  });

  if (res.ok) {
    return { ok: true, status: res.status, error: null, message: null };
  }

  let message: string | null = null;
  try {
    const payload = await res.json() as { message?: string };
    message = typeof payload.message === 'string' ? payload.message : null;
  } catch {
    message = await res.text().catch(() => null);
  }

  const normalized = (message || '').toLowerCase();
  let error: VerificationEmailError = 'api_error';
  if (normalized.includes('domain is not verified')) error = 'domain_not_verified';
  else if (normalized.includes('only send testing emails to your own email address')) error = 'testing_recipient_restricted';
  else if (normalized.includes('invalid `from` address') || normalized.includes('invalid from address')) error = 'invalid_sender';

  return { ok: false, status: res.status, error, message };
}
