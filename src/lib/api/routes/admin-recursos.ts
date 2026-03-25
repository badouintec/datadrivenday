import { Hono } from 'hono';
import { requireAuth } from '../auth';
import type { AppBindings, AppVariables } from '../types';
import { logAdminAuditEvent, pickAuditFields } from '../../server/audit';
import {
  getRecurso, getRecursos, insertRecurso, updateRecurso,
  deleteRecurso, reorderRecursos,
} from '../../server/db/recursos';

type Env = { Bindings: Partial<AppBindings>; Variables: AppVariables };
const RECURSO_AUDIT_FIELDS = ['titulo', 'fuente', 'anio', 'url', 'tipo', 'categoria', 'descripcion', 'is_featured', 'is_active', 'orden'] as const;

function pickRecursoAuditSnapshot(recurso: Record<string, unknown> | null | undefined) {
  return pickAuditFields(recurso, RECURSO_AUDIT_FIELDS);
}

export const recursosRoutes = new Hono<Env>();
recursosRoutes.use('*', requireAuth('recursos:read'));

recursosRoutes.get('/', async (c) => {
  const categoria = c.req.query('categoria') ?? undefined;
  const recursos = await getRecursos(c.env.DB!, categoria);
  return c.json({ ok: true, recursos });
});

recursosRoutes.post('/', requireAuth('recursos:write'), async (c) => {
  const body = await c.req.json();
  const id = await insertRecurso(c.env.DB!, {
    titulo: body.titulo,
    fuente: body.fuente,
    anio: body.anio,
    url: body.url,
    tipo: body.tipo ?? 'informe',
    categoria: body.categoria ?? 'tecnologia',
    descripcion: body.descripcion ?? null,
    is_featured: body.is_featured ?? 0,
    is_active: body.is_active ?? 1,
    orden: body.orden ?? 0,
  });

  const created = await getRecurso(c.env.DB!, id);
  await logAdminAuditEvent(c, {
    resourceType: 'recurso',
    resourceId: id,
    action: 'CREATE',
    newValues: pickRecursoAuditSnapshot(created as Record<string, unknown> | null),
  });

  return c.json({ ok: true, id }, 201);
});

recursosRoutes.patch('/:id', requireAuth('recursos:write'), async (c) => {
  const id = c.req.param('id')!;
  const body = await c.req.json();
  const before = await getRecurso(c.env.DB!, id);
  await updateRecurso(c.env.DB!, id, body);
  const after = await getRecurso(c.env.DB!, id);
  await logAdminAuditEvent(c, {
    resourceType: 'recurso',
    resourceId: id,
    action: 'PATCH',
    oldValues: pickRecursoAuditSnapshot(before as Record<string, unknown> | null),
    newValues: pickRecursoAuditSnapshot(after as Record<string, unknown> | null),
  });
  return c.json({ ok: true });
});

recursosRoutes.delete('/:id', requireAuth('recursos:delete'), async (c) => {
  const id = c.req.param('id')!;
  const before = await getRecurso(c.env.DB!, id);
  await deleteRecurso(c.env.DB!, id);
  await logAdminAuditEvent(c, {
    resourceType: 'recurso',
    resourceId: id,
    action: 'DELETE',
    oldValues: pickRecursoAuditSnapshot(before as Record<string, unknown> | null),
  });
  return c.json({ ok: true });
});

recursosRoutes.post('/reorder', requireAuth('recursos:write'), async (c) => {
  const { updates } = await c.req.json<{ updates: Array<{ id: string; orden: number }> }>();
  await reorderRecursos(c.env.DB!, updates);
  await logAdminAuditEvent(c, {
    resourceType: 'recurso',
    resourceId: 'reorder',
    action: 'PATCH',
    newValues: {
      rowCount: updates.length,
      updates: updates.slice(0, 20),
    },
  });
  return c.json({ ok: true });
});
