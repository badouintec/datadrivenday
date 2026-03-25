import type { Context } from 'hono';
import { getClientIp } from '../api/auth';
import type { AppBindings, AppVariables } from '../api/types';

type AuditContext = Context<{ Bindings: Partial<AppBindings>; Variables: AppVariables }>;

export type AuditAction = 'CREATE' | 'PATCH' | 'DELETE' | 'PUBLISH' | 'ARCHIVE' | 'EXPORT';
export type AuditStatus = 'success' | 'error' | 'rejected';

export interface AuditLogInput {
  resourceType: string;
  resourceId: string;
  action: AuditAction;
  status?: AuditStatus;
  errorCode?: string | null;
  oldValues?: Record<string, unknown> | null;
  newValues?: Record<string, unknown> | null;
}

function safeJsonStringify(value: unknown) {
  if (value == null) return null;
  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function pickAuditFields<T extends Record<string, unknown>>(
  source: T | null | undefined,
  allowedFields: readonly string[],
) {
  if (!source) return null;

  const snapshot: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (field in source) {
      snapshot[field] = source[field];
    }
  }

  return Object.keys(snapshot).length ? snapshot : null;
}

export function countAuditChanges(
  oldValues?: Record<string, unknown> | null,
  newValues?: Record<string, unknown> | null,
) {
  const keys = new Set<string>([
    ...Object.keys(oldValues ?? {}),
    ...Object.keys(newValues ?? {}),
  ]);

  let changes = 0;
  for (const key of keys) {
    const before = oldValues?.[key];
    const after = newValues?.[key];
    if (JSON.stringify(before) !== JSON.stringify(after)) {
      changes += 1;
    }
  }

  return changes;
}

export async function logAdminAuditEvent(c: AuditContext, input: AuditLogInput) {
  const user = c.get('user');
  const db = c.env.DB;
  if (!user || !db) return false;

  const oldValues = isRecord(input.oldValues) ? input.oldValues : null;
  const newValues = isRecord(input.newValues) ? input.newValues : null;

  try {
    await db
      .prepare(
        `INSERT INTO audit_logs (
          id, user_id, username, user_rol, endpoint, resource_type, resource_id,
          action, status, error_code, old_values, new_values, changes_count,
          request_id, client_ip, user_agent, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        crypto.randomUUID(),
        user.id,
        user.username,
        user.rol,
        `${c.req.method} ${c.req.path}`,
        input.resourceType,
        input.resourceId,
        input.action,
        input.status ?? 'success',
        input.errorCode ?? null,
        safeJsonStringify(oldValues),
        safeJsonStringify(newValues),
        countAuditChanges(oldValues, newValues),
        c.get('requestId') ?? null,
        getClientIp(c.req),
        c.req.header('User-Agent')?.slice(0, 500) ?? null,
        new Date().toISOString(),
      )
      .run();

    return true;
  } catch (error) {
    console.error('[audit] Failed to persist admin audit event', error);
    return false;
  }
}