import type { APIRoute } from 'astro';
import { app } from '../../lib/api/app';
import type { AppBindings } from '../../lib/api/types';

export const prerender = false;

let _cfEnv: Partial<AppBindings> | null = null;

async function getCfEnv(): Promise<Partial<AppBindings>> {
  if (_cfEnv) return _cfEnv;
  try {
    const mod = await import('cloudflare:workers');
    _cfEnv = (mod.env ?? {}) as Partial<AppBindings>;
  } catch {
    _cfEnv = {};
  }
  return _cfEnv;
}

const handler: APIRoute = async (context) => {
  const env = await getCfEnv();
  const ctx = (context.locals as { cfContext?: ExecutionContext }).cfContext;
  return app.fetch(context.request, env, ctx);
};

export const ALL = handler;
