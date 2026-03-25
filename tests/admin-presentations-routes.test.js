import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  deletePresentation: vi.fn(),
  deleteSlide: vi.fn(),
  duplicateSlide: vi.fn(),
  getMaxSlideNumero: vi.fn(),
  getPresentation: vi.fn(),
  getPresentations: vi.fn(),
  getSafeImageUpload: vi.fn(),
  getSlide: vi.fn(),
  getSlides: vi.fn(),
  insertPresentation: vi.fn(),
  insertSlide: vi.fn(),
  listPresentationComments: vi.fn(),
  logAdminAuditEvent: vi.fn(),
  reorderSlides: vi.fn(),
  updatePresentation: vi.fn(),
  updateSlide: vi.fn(),
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

vi.mock('../src/lib/server/db/slides.ts', () => ({
  deletePresentation: mocks.deletePresentation,
  deleteSlide: mocks.deleteSlide,
  duplicateSlide: mocks.duplicateSlide,
  getMaxSlideNumero: mocks.getMaxSlideNumero,
  getPresentation: mocks.getPresentation,
  getPresentations: mocks.getPresentations,
  getSlide: mocks.getSlide,
  getSlides: mocks.getSlides,
  insertPresentation: mocks.insertPresentation,
  insertSlide: mocks.insertSlide,
  reorderSlides: mocks.reorderSlides,
  updatePresentation: mocks.updatePresentation,
  updateSlide: mocks.updateSlide,
}));

vi.mock('../src/lib/server/db/participants.ts', () => ({
  listPresentationComments: mocks.listPresentationComments,
}));

vi.mock('../src/lib/server/uploads.ts', () => ({
  getSafeImageUpload: mocks.getSafeImageUpload,
}));

import { presentationsRoutes, slidesRoutes } from '../src/lib/api/routes/admin-presentations.ts';

function createEnv() {
  return {
    DB: {
      prepare: vi.fn(() => ({
        bind: vi.fn(() => ({ run: vi.fn().mockResolvedValue(undefined) })),
      })),
    },
    MEDIA: { put: vi.fn().mockResolvedValue(undefined) },
  };
}

describe('admin presentations routes', () => {
  beforeEach(() => {
    mocks.deletePresentation.mockResolvedValue(undefined);
    mocks.deleteSlide.mockResolvedValue(undefined);
    mocks.duplicateSlide.mockResolvedValue('slide-2');
    mocks.getMaxSlideNumero.mockResolvedValue(20);
    mocks.getPresentations.mockResolvedValue([]);
    mocks.getSafeImageUpload.mockResolvedValue({ ok: false, error: 'missing_file' });
    mocks.getSlides.mockResolvedValue([]);
    mocks.insertPresentation.mockResolvedValue('pres-1');
    mocks.insertSlide.mockResolvedValue('slide-1');
    mocks.listPresentationComments.mockResolvedValue([]);
    mocks.logAdminAuditEvent.mockResolvedValue(true);
    mocks.reorderSlides.mockResolvedValue(undefined);
    mocks.updatePresentation.mockResolvedValue(undefined);
    mocks.updateSlide.mockResolvedValue(undefined);
  });

  it('logs presentation patch with filtered before and after values', async () => {
    mocks.getPresentation
      .mockResolvedValueOnce({
        id: 'pres-1',
        nombre: 'Antes',
        slug: 'data',
        descripcion: 'Desc A',
        estado: 'borrador',
        pagina_url: '/antes',
        token: 'secret',
      })
      .mockResolvedValueOnce({
        id: 'pres-1',
        nombre: 'Despues',
        slug: 'data',
        descripcion: 'Desc B',
        estado: 'activo',
        pagina_url: '/despues',
        token: 'secret',
      });

    const response = await presentationsRoutes.request(
      'http://localhost/pres-1',
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: 'Despues', estado: 'activo', token: 'forbidden' }),
      },
      createEnv(),
    );

    expect(response.status).toBe(200);
    expect(mocks.updatePresentation).toHaveBeenCalledWith(expect.any(Object), 'pres-1', {
      nombre: 'Despues',
      estado: 'activo',
    });
    expect(mocks.logAdminAuditEvent).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        resourceType: 'presentation',
        resourceId: 'pres-1',
        action: 'PATCH',
        oldValues: expect.objectContaining({ nombre: 'Antes', estado: 'borrador' }),
        newValues: expect.objectContaining({ nombre: 'Despues', estado: 'activo' }),
      }),
    );
  });

  it('logs slide reorder as a compact audit event', async () => {
    const updates = [
      { id: 'slide-1', numero: 10 },
      { id: 'slide-2', numero: 20 },
    ];

    const response = await slidesRoutes.request(
      'http://localhost/reorder',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      },
      createEnv(),
    );

    expect(response.status).toBe(200);
    expect(mocks.reorderSlides).toHaveBeenCalledWith(expect.any(Object), updates);
    expect(mocks.logAdminAuditEvent).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        resourceType: 'presentation_slide',
        resourceId: 'reorder',
        action: 'PATCH',
        newValues: { rowCount: 2, updates },
      }),
    );
  });
});