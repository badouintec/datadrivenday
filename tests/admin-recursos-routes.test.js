import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  deleteRecurso: vi.fn(),
  getRecurso: vi.fn(),
  getRecursos: vi.fn(),
  insertRecurso: vi.fn(),
  logAdminAuditEvent: vi.fn(),
  reorderRecursos: vi.fn(),
  updateRecurso: vi.fn(),
}));

vi.mock('../src/lib/api/auth.ts', () => ({
  requireAuth: () => async (c, next) => {
    c.set('user', { id: 'admin-1', username: 'juan', rol: 'editor', nombre: 'Juan' });
    await next();
  },
}));

vi.mock('../src/lib/server/audit.ts', () => ({
  logAdminAuditEvent: mocks.logAdminAuditEvent,
  pickAuditFields: (source, fields) => {
    if (!source) return null;
    return Object.fromEntries(fields.filter((field) => field in source).map((field) => [field, source[field]]));
  },
}));

vi.mock('../src/lib/server/db/recursos.ts', () => ({
  deleteRecurso: mocks.deleteRecurso,
  getRecurso: mocks.getRecurso,
  getRecursos: mocks.getRecursos,
  insertRecurso: mocks.insertRecurso,
  reorderRecursos: mocks.reorderRecursos,
  updateRecurso: mocks.updateRecurso,
}));

import { recursosRoutes } from '../src/lib/api/routes/admin-recursos.ts';

function createEnv() {
  return {
    DB: {
      prepare: vi.fn(() => ({
        bind: vi.fn(() => ({ run: vi.fn().mockResolvedValue(undefined) })),
      })),
    },
  };
}

describe('admin recursos routes', () => {
  beforeEach(() => {
    mocks.deleteRecurso.mockResolvedValue(undefined);
    mocks.getRecursos.mockResolvedValue([]);
    mocks.insertRecurso.mockResolvedValue('rec-1');
    mocks.logAdminAuditEvent.mockResolvedValue(true);
    mocks.reorderRecursos.mockResolvedValue(undefined);
    mocks.updateRecurso.mockResolvedValue(undefined);
  });

  it('logs recurso patch with filtered before and after values', async () => {
    mocks.getRecurso
      .mockResolvedValueOnce({
        id: 'rec-1',
        titulo: 'Antes',
        fuente: 'DDD',
        anio: '2025',
        url: 'https://antes.test',
        tipo: 'informe',
        categoria: 'tecnologia',
        descripcion: 'Desc A',
        is_featured: 0,
        is_active: 1,
        orden: 1,
      })
      .mockResolvedValueOnce({
        id: 'rec-1',
        titulo: 'Despues',
        fuente: 'DDD',
        anio: '2026',
        url: 'https://despues.test',
        tipo: 'informe',
        categoria: 'tecnologia',
        descripcion: 'Desc B',
        is_featured: 1,
        is_active: 1,
        orden: 2,
      });

    const response = await recursosRoutes.request(
      'http://localhost/rec-1',
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titulo: 'Despues', orden: 2, is_featured: 1 }),
      },
      createEnv(),
    );

    expect(response.status).toBe(200);
    expect(mocks.updateRecurso).toHaveBeenCalledWith(expect.any(Object), 'rec-1', {
      titulo: 'Despues',
      orden: 2,
      is_featured: 1,
    });
    expect(mocks.logAdminAuditEvent).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        resourceType: 'recurso',
        resourceId: 'rec-1',
        action: 'PATCH',
        oldValues: expect.objectContaining({ titulo: 'Antes', orden: 1 }),
        newValues: expect.objectContaining({ titulo: 'Despues', orden: 2 }),
      }),
    );
  });

  it('logs recurso reorder as a compact audit event', async () => {
    const updates = [
      { id: 'rec-1', orden: 1 },
      { id: 'rec-2', orden: 2 },
    ];

    const response = await recursosRoutes.request(
      'http://localhost/reorder',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      },
      createEnv(),
    );

    expect(response.status).toBe(200);
    expect(mocks.reorderRecursos).toHaveBeenCalledWith(expect.any(Object), updates);
    expect(mocks.logAdminAuditEvent).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        resourceType: 'recurso',
        resourceId: 'reorder',
        action: 'PATCH',
        newValues: { rowCount: 2, updates },
      }),
    );
  });
});