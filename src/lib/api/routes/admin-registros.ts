import { Hono } from 'hono';
import { requireAuth } from '../auth';
import type { AppBindings, AppVariables } from '../types';
import { logAdminAuditEvent } from '../../server/audit';

type Env = { Bindings: Partial<AppBindings>; Variables: AppVariables };

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;
const MAX_OFFSET = 10_000;

interface SubmissionAttendanceRow {
  id: string;
  asistio: number | null;
  asistio_at: string | null;
}

async function getSubmissionAttendance(db: D1Database, id: string) {
  return db
    .prepare('SELECT id, asistio, asistio_at FROM submissions WHERE id = ?')
    .bind(id)
    .first<SubmissionAttendanceRow>();
}

export const registrosRoutes = new Hono<Env>();
registrosRoutes.use('*', requireAuth('registros:read'));

registrosRoutes.get('/', async (c) => {
  const page = parseInt(c.req.query('page') ?? '1', 10);
  const limit = parseInt(c.req.query('limit') ?? String(DEFAULT_LIMIT), 10);
  const type = c.req.query('type') ?? undefined;
  const offset = (page - 1) * limit;

  if (!Number.isInteger(page) || page < 1) {
    return c.json({ ok: false, error: 'invalid_page' }, 400);
  }

  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
    return c.json({ ok: false, error: 'invalid_limit' }, 400);
  }

  if (!Number.isInteger(offset) || offset < 0 || offset > MAX_OFFSET) {
    return c.json({ ok: false, error: 'invalid_offset' }, 400);
  }

  let query = 'SELECT * FROM submissions';
  let countQuery = 'SELECT COUNT(*) as total FROM submissions';
  const params: (string | number)[] = [];
  const countParams: string[] = [];

  if (type) {
    query += ' WHERE type = ?';
    countQuery += ' WHERE type = ?';
    params.push(type);
    countParams.push(type);
  }

  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);

  const [rows, countResult] = await Promise.all([
    (countParams.length
      ? c.env.DB!.prepare(query).bind(...params)
      : c.env.DB!.prepare(query).bind(...params)
    ).all(),
    (countParams.length
      ? c.env.DB!.prepare(countQuery).bind(...countParams)
      : c.env.DB!.prepare(countQuery)
    ).first<{ total: number }>(),
  ]);

  return c.json({
    ok: true,
    registros: rows.results,
    total: countResult?.total ?? 0,
    page,
    limit,
    pages: Math.ceil((countResult?.total ?? 0) / limit),
  });
});

// Export CSV
registrosRoutes.get('/export', requireAuth('registros:export'), async (c) => {
  const rows = await c.env.DB!
    .prepare(
      `SELECT name, email, organization, message, type, asistio, asistio_at, created_at
       FROM submissions ORDER BY created_at DESC`
    )
    .all<{
      name: string; email: string; organization: string;
      message: string; type: string; asistio: number | null; asistio_at: string | null; created_at: string;
    }>();

  const headers = ['nombre', 'email', 'organizacion', 'mensaje', 'tipo', 'asistio', 'asistio_at', 'fecha'];
  const csvRows = rows.results.map(r => [
    `"${(r.name ?? '').replace(/"/g, '""')}"`,
    `"${(r.email ?? '').replace(/"/g, '""')}"`,
    `"${(r.organization ?? '').replace(/"/g, '""')}"`,
    `"${(r.message ?? '').replace(/"/g, '""')}"`,
    r.type,
    String(r.asistio ?? 0),
    r.asistio_at ?? '',
    r.created_at,
  ].join(','));

  const csv = [headers.join(','), ...csvRows].join('\n');
  const fecha = new Date().toISOString().split('T')[0];

  await logAdminAuditEvent(c, {
    resourceType: 'submission',
    resourceId: 'export',
    action: 'EXPORT',
    newValues: { rowCount: rows.results.length },
  });

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="registros-ddd-${fecha}.csv"`,
    },
  });
});

// Marcar asistencia
registrosRoutes.patch('/:id/asistio', requireAuth('registros:export'), async (c) => {
  const submissionId = c.req.param('id');
  if (!submissionId) {
    return c.json({ ok: false, error: 'missing_id' }, 400);
  }

  const body = await c.req.json<{ asistio?: boolean }>().catch(() => null);
  if (!body || typeof body.asistio !== 'boolean') {
    return c.json({ ok: false, error: 'invalid_body' }, 400);
  }

  const before = await getSubmissionAttendance(c.env.DB!, submissionId);
  if (!before) {
    return c.json({ ok: false, error: 'not_found' }, 404);
  }

  await c.env.DB!
    .prepare(
      `UPDATE submissions
       SET asistio = ?, asistio_at = CASE WHEN ? = 1 THEN datetime('now') ELSE NULL END
       WHERE id = ?`
    )
    .bind(body.asistio ? 1 : 0, body.asistio ? 1 : 0, submissionId)
    .run();

  const after = await getSubmissionAttendance(c.env.DB!, submissionId);
  await logAdminAuditEvent(c, {
    resourceType: 'submission',
    resourceId: submissionId,
    action: 'PATCH',
    oldValues: before ? { asistio: Boolean(before.asistio), asistioAt: before.asistio_at } : null,
    newValues: after ? { asistio: Boolean(after.asistio), asistioAt: after.asistio_at } : null,
  });

  return c.json({ ok: true });
});
