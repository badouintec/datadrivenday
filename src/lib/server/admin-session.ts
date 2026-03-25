import { can, getSession, getSessionIdFromCookie } from '../api/auth';
import type { AdminUser, AppBindings } from '../api/types';

async function getCloudflareEnv(): Promise<Partial<AppBindings>> {
  try {
    const mod = await import('cloudflare:workers');
    return (mod.env ?? {}) as Partial<AppBindings>;
  } catch {
    return {};
  }
}

export async function getAdminUserFromRequest(
  request: Request,
  permission?: string,
): Promise<AdminUser | null> {
  const env = await getCloudflareEnv();
  if (!env.APP_SESSION) return null;

  const cookie = request.headers.get('cookie') ?? '';
  const sessionId = getSessionIdFromCookie(cookie);
  if (!sessionId) return null;

  const session = await getSession(env.APP_SESSION, sessionId);
  if (!session) return null;
  if (permission && !can(session, permission)) return null;

  return {
    id: session.id,
    username: session.username,
    rol: session.rol,
    nombre: session.nombre,
  };
}