import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  all: vi.fn(),
  first: vi.fn(),
  logAdminAuditEvent: vi.fn(),
}));

vi.mock('../src/lib/api/auth.ts', () => ({
  requireAuth: () => async (c, next) => {
    c.set('user', { id: 'admin-1', username: 'juan', rol: 'editor', nombre: 'Juan' });
    await next();
  },
}));

vi.mock('../src/lib/server/audit.ts', () => ({
  logAdminAuditEvent: mocks.logAdminAuditEvent,
}));

import { registrosRoutes } from '../src/lib/api/routes/admin-registros.ts';

function createEnv() {
  return {
    DB: {
      prepare: vi.fn(() => ({
        bind: vi.fn(() => ({
          all: mocks.all,
          first: mocks.first,
        })),
        all: mocks.all,
        first: mocks.first,
      })),
    },
  };
}

describe('admin registros routes', () => {
  beforeEach(() => {
    mocks.all.mockResolvedValue({ results: [] });
    mocks.first.mockResolvedValue({ total: 0 });
    mocks.logAdminAuditEvent.mockResolvedValue(true);
  });

  it('rejects oversized limit values', async () => {
    const response = await registrosRoutes.request(
      'http://localhost/?limit=1000000',
      { method: 'GET' },
      createEnv(),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ ok: false, error: 'invalid_limit' });
  });

  it('rejects invalid page values', async () => {
    const response = await registrosRoutes.request(
      'http://localhost/?page=0',
      { method: 'GET' },
      createEnv(),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ ok: false, error: 'invalid_page' });
  });

  it('rejects offsets beyond the allowed maximum', async () => {
    const response = await registrosRoutes.request(
      'http://localhost/?page=300&limit=50',
      { method: 'GET' },
      createEnv(),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ ok: false, error: 'invalid_offset' });
  });

  it('exports attendance columns and logs the export event', async () => {
    mocks.all.mockResolvedValue({
      results: [{
        name: 'Ana',
        email: 'ana@datadriven.day',
        organization: 'DDD',
        message: 'Hola',
        type: 'registration',
        asistio: 1,
        asistio_at: '2026-03-24 20:00:00',
        created_at: '2026-03-24 19:00:00',
      }],
    });

    const response = await registrosRoutes.request(
      'http://localhost/export',
      { method: 'GET' },
      createEnv(),
    );

    const csv = await response.text();

    expect(response.status).toBe(200);
    expect(csv).toContain('nombre,email,organizacion,mensaje,tipo,asistio,asistio_at,fecha');
    expect(csv).toContain('registration,1,2026-03-24 20:00:00,2026-03-24 19:00:00');
    expect(mocks.logAdminAuditEvent).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        resourceType: 'submission',
        resourceId: 'export',
        action: 'EXPORT',
        newValues: { rowCount: 1 },
      }),
    );
  });
});