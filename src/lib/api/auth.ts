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
    'recursos:read', 'recursos:write', 'recursos:delete',
    'users:read', 'users:write',
  ],
  editor: [
    'presentations:read', 'presentations:write',
    'blog:read', 'blog:write', 'blog:publish',
    'registros:read',
    'recursos:read', 'recursos:write',
  ],
  viewer: [
    'presentations:read',
    'blog:read',
    'registros:read',
    'recursos:read',
  ],
};

export function can(user: AdminUser, permission: string): boolean {
  return PERMISSIONS[user.rol]?.includes(permission) ?? false;
}

// ── SHA-256 ───────────────────────────────────────────────────────────────────
async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// ── Verificar credenciales contra D1 ──────────────────────────────────────────
export async function verifyCredentials(
  db: D1Database,
  username: string,
  password: string
): Promise<AdminUser | null> {
  const hash = await sha256(password);

  const row = await db
    .prepare(
      `SELECT id, username, rol, nombre FROM admin_users
       WHERE username = ? AND pass_hash = ?`
    )
    .bind(username.toLowerCase().trim(), hash)
    .first<{ id: string; username: string; rol: AdminRol; nombre: string | null }>();

  if (!row) return null;

  await db
    .prepare('UPDATE admin_users SET last_login = datetime("now") WHERE id = ?')
    .bind(row.id)
    .run();

  return row;
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

  const user = await verifyCredentials(c.env.DB, body.user, body.password);

  if (!user) {
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
