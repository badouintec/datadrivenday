import { Hono } from 'hono';
import { requireAuth } from '../auth';
import type { AppBindings, AppVariables } from '../types';

type Env = { Bindings: Partial<AppBindings>; Variables: AppVariables };

export const registrosRoutes = new Hono<Env>();
registrosRoutes.use('*', requireAuth('registros:read'));

registrosRoutes.get('/', async (c) => {
  const page = parseInt(c.req.query('page') ?? '1');
  const limit = parseInt(c.req.query('limit') ?? '50');
  const type = c.req.query('type') ?? undefined;
  const offset = (page - 1) * limit;

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
      `SELECT name, email, organization, message, type, created_at
       FROM submissions ORDER BY created_at DESC`
    )
    .all<{
      name: string; email: string; organization: string;
      message: string; type: string; created_at: string;
    }>();

  const headers = ['nombre', 'email', 'organizacion', 'mensaje', 'tipo', 'fecha'];
  const csvRows = rows.results.map(r => [
    `"${(r.name ?? '').replace(/"/g, '""')}"`,
    `"${(r.email ?? '').replace(/"/g, '""')}"`,
    `"${(r.organization ?? '').replace(/"/g, '""')}"`,
    `"${(r.message ?? '').replace(/"/g, '""')}"`,
    r.type,
    r.created_at,
  ].join(','));

  const csv = [headers.join(','), ...csvRows].join('\n');
  const fecha = new Date().toISOString().split('T')[0];

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="registros-ddd-${fecha}.csv"`,
    },
  });
});

// Marcar asistencia
registrosRoutes.patch('/:id/asistio', async (c) => {
  const { asistio } = await c.req.json<{ asistio: boolean }>();

  await c.env.DB!
    .prepare(
      `UPDATE submissions
       SET asistio = ?, asistio_at = CASE WHEN ? = 1 THEN datetime('now') ELSE NULL END
       WHERE id = ?`
    )
    .bind(asistio ? 1 : 0, asistio ? 1 : 0, c.req.param('id'))
    .run();

  return c.json({ ok: true });
});
