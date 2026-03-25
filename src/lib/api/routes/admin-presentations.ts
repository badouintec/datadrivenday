import { Hono } from 'hono';
import { requireAuth } from '../auth';
import type { AppBindings, AppVariables } from '../types';
import { getSafeImageUpload } from '../../server/uploads';
import { logAdminAuditEvent, pickAuditFields } from '../../server/audit';
import {
  getPresentation, getPresentations, insertPresentation,
  updatePresentation, deletePresentation,
  getSlides, getSlide, getMaxSlideNumero, insertSlide, updateSlide, deleteSlide,
  reorderSlides, duplicateSlide,
} from '../../server/db/slides';
import { listPresentationComments } from '../../server/db/participants';

const VALID_SLUG_RE = /^[a-z0-9-]+$/;
const VALID_ESTADOS = new Set(['borrador', 'activo', 'archivado']);
const PRESENTATION_AUDIT_FIELDS = ['nombre', 'slug', 'descripcion', 'estado', 'pagina_url'] as const;
const SLIDE_AUDIT_FIELDS = ['presentacion', 'numero', 'tag', 'titulo', 'subtitulo', 'duracion', 'particleState', 'accentColor', 'particleSpeed', 'imagenUrl', 'isActive'] as const;

type Env = { Bindings: Partial<AppBindings>; Variables: AppVariables };

function pickPresentationAuditSnapshot(presentation: Record<string, unknown> | null | undefined) {
  return pickAuditFields(presentation, PRESENTATION_AUDIT_FIELDS);
}

function pickSlideAuditSnapshot(slide: Record<string, unknown> | null | undefined) {
  return pickAuditFields(slide, SLIDE_AUDIT_FIELDS);
}

// ── Presentaciones ────────────────────────────────────────────────────────────
export const presentationsRoutes = new Hono<Env>();
presentationsRoutes.use('*', requireAuth('presentations:read'));

presentationsRoutes.get('/', async (c) => {
  const list = await getPresentations(c.env.DB!);
  return c.json({ ok: true, presentations: list });
});

presentationsRoutes.post('/', requireAuth('presentations:write'), async (c) => {
  const body = await c.req.json<{
    nombre?: string; slug?: string;
    descripcion?: string; pagina_url?: string;
  }>().catch(() => null);

  if (!body) return c.json({ ok: false, error: 'invalid_json' }, 400);

  const nombre = body.nombre?.trim();
  const slug   = body.slug?.trim().toLowerCase();

  if (!nombre || nombre.length > 150) {
    return c.json({ ok: false, error: 'nombre_required' }, 400);
  }
  if (!slug || !VALID_SLUG_RE.test(slug) || slug.length > 80) {
    return c.json({ ok: false, error: 'invalid_slug' }, 400);
  }

  // Token is always server-generated — never client-controlled
  const token = crypto.randomUUID().replace(/-/g, '').slice(0, 16);

  try {
    const id = await insertPresentation(c.env.DB!, {
      nombre, slug, token,
      descripcion: body.descripcion?.trim() || undefined,
      pagina_url:  body.pagina_url?.trim()  || undefined,
    });

    const created = await getPresentation(c.env.DB!, id);
    await logAdminAuditEvent(c, {
      resourceType: 'presentation',
      resourceId: id,
      action: 'CREATE',
      newValues: pickPresentationAuditSnapshot(created as Record<string, unknown> | null),
    });

    return c.json({ ok: true, id }, 201);
  } catch (e: any) {
    if (String(e?.message).includes('UNIQUE constraint failed')) {
      return c.json({ ok: false, error: 'slug_taken' }, 409);
    }
    throw e;
  }
});

presentationsRoutes.patch('/:id', requireAuth('presentations:write'), async (c) => {
  const id = c.req.param('id')!;
  const body = await c.req.json().catch(() => null);
  if (!body) return c.json({ ok: false, error: 'invalid_json' }, 400);

  if (body.estado !== undefined && !VALID_ESTADOS.has(body.estado)) {
    return c.json({ ok: false, error: 'invalid_estado' }, 400);
  }
  // Token must never be altered via PATCH
  delete body.token;

  const before = await getPresentation(c.env.DB!, id);
  await updatePresentation(c.env.DB!, id, body);
  const after = await getPresentation(c.env.DB!, id);
  await logAdminAuditEvent(c, {
    resourceType: 'presentation',
    resourceId: id,
    action: 'PATCH',
    oldValues: pickPresentationAuditSnapshot(before as Record<string, unknown> | null),
    newValues: pickPresentationAuditSnapshot(after as Record<string, unknown> | null),
  });
  return c.json({ ok: true });
});

presentationsRoutes.delete('/:id', requireAuth('presentations:delete'), async (c) => {
  const id = c.req.param('id')!;
  const before = await getPresentation(c.env.DB!, id);
  await deletePresentation(c.env.DB!, id);
  await logAdminAuditEvent(c, {
    resourceType: 'presentation',
    resourceId: id,
    action: 'DELETE',
    oldValues: pickPresentationAuditSnapshot(before as Record<string, unknown> | null),
  });
  return c.json({ ok: true });
});

// ── Slides ────────────────────────────────────────────────────────────────────
export const slidesRoutes = new Hono<Env>();
slidesRoutes.use('*', requireAuth('presentations:read'));

slidesRoutes.get('/', async (c) => {
  const presentacion = c.req.query('presentacion') ?? 'pres-dataller-2026';
  const slides = await getSlides(c.env.DB!, presentacion);
  return c.json({ ok: true, slides });
});

slidesRoutes.post('/', requireAuth('presentations:write'), async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body) return c.json({ ok: false, error: 'invalid_json' }, 400);
  const presId = body.presentacion ?? 'pres-dataller-2026';
  // Auto-calculate next numero instead of hardcoding 999
  const maxNumero = body.numero ?? (await getMaxSlideNumero(c.env.DB!, presId)) + 10;
  const id = await insertSlide(c.env.DB!, {
    presentacion: presId,
    numero: maxNumero,
    tag: body.tag ?? 'NUEVO SLIDE',
    titulo: body.titulo ?? 'Sin titulo',
    subtitulo: body.subtitulo ?? null,
    cuerpo: body.cuerpo ?? '',
    notas: body.notas ?? null,
    duracion: body.duracion ?? 10,
    particle_state: body.particle_state ?? 'chaos',
    accent_color: body.accent_color ?? 'primary',
    chord_json: JSON.stringify(body.chord ?? [196, 261.63, 329.63]),
    particle_speed: body.particle_speed ?? 0.04,
    command_words_json: JSON.stringify(body.commandWords ?? []),
    referencias_json: JSON.stringify(body.referencias ?? []),
    codigo_demo: body.codigoDemo ?? null,
    conceptos_json: JSON.stringify(body.conceptosClave ?? []),
    imagen_url: null,
    is_active: 1,
  });

  const created = await getSlide(c.env.DB!, id);
  await logAdminAuditEvent(c, {
    resourceType: 'presentation_slide',
    resourceId: id,
    action: 'CREATE',
    newValues: pickSlideAuditSnapshot(created as Record<string, unknown> | null),
  });

  return c.json({ ok: true, id }, 201);
});

slidesRoutes.patch('/:id', requireAuth('presentations:write'), async (c) => {
  const id = c.req.param('id')!;
  const body = await c.req.json().catch(() => null);
  if (!body) return c.json({ ok: false, error: 'invalid_json' }, 400);

  const patch: Record<string, unknown> = { ...body };
  if (body.chord) patch.chord_json = JSON.stringify(body.chord);
  if (body.commandWords) patch.command_words_json = JSON.stringify(body.commandWords);
  if (body.referencias) patch.referencias_json = JSON.stringify(body.referencias);
  if (body.conceptosClave) patch.conceptos_json = JSON.stringify(body.conceptosClave);

  delete patch.chord;
  delete patch.commandWords;
  delete patch.referencias;
  delete patch.conceptosClave;

  const before = await getSlide(c.env.DB!, id);
  await updateSlide(c.env.DB!, id, patch as any);
  const after = await getSlide(c.env.DB!, id);
  await logAdminAuditEvent(c, {
    resourceType: 'presentation_slide',
    resourceId: id,
    action: 'PATCH',
    oldValues: pickSlideAuditSnapshot(before as Record<string, unknown> | null),
    newValues: pickSlideAuditSnapshot(after as Record<string, unknown> | null),
  });
  return c.json({ ok: true });
});

slidesRoutes.delete('/:id', requireAuth('presentations:delete'), async (c) => {
  const id = c.req.param('id')!;
  const before = await getSlide(c.env.DB!, id);
  await deleteSlide(c.env.DB!, id);
  await logAdminAuditEvent(c, {
    resourceType: 'presentation_slide',
    resourceId: id,
    action: 'DELETE',
    oldValues: pickSlideAuditSnapshot(before as Record<string, unknown> | null),
  });
  return c.json({ ok: true });
});

slidesRoutes.post('/reorder', requireAuth('presentations:write'), async (c) => {
  const body = await c.req.json<{ updates: Array<{ id: string; numero: number }> }>().catch(() => null);
  if (!body?.updates || !Array.isArray(body.updates)) return c.json({ ok: false, error: 'invalid_updates' }, 400);
  await reorderSlides(c.env.DB!, body.updates);
  await logAdminAuditEvent(c, {
    resourceType: 'presentation_slide',
    resourceId: 'reorder',
    action: 'PATCH',
    newValues: {
      rowCount: body.updates.length,
      updates: body.updates.slice(0, 20),
    },
  });
  return c.json({ ok: true });
});

slidesRoutes.post('/:id/duplicate', requireAuth('presentations:write'), async (c) => {
  const sourceId = c.req.param('id')!;
  const before = await getSlide(c.env.DB!, sourceId);
  const newId = await duplicateSlide(c.env.DB!, sourceId);
  const duplicated = await getSlide(c.env.DB!, newId);
  await logAdminAuditEvent(c, {
    resourceType: 'presentation_slide',
    resourceId: newId,
    action: 'CREATE',
    oldValues: pickSlideAuditSnapshot(before as Record<string, unknown> | null),
    newValues: pickSlideAuditSnapshot(duplicated as Record<string, unknown> | null),
  });
  return c.json({ ok: true, id: newId }, 201);
});

slidesRoutes.post('/:id/imagen', requireAuth('presentations:write'), async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get('imagen') as File | null;
    const upload = await getSafeImageUpload(file);
    if (!upload.ok) {
      return c.json({ ok: false, error: upload.error }, 400);
    }

    const slideId = c.req.param('id')!;
    const key = `slides/${slideId}/${crypto.randomUUID()}.${upload.extension}`;

    if (!c.env.MEDIA) return c.json({ ok: false, error: 'storage_not_available' }, 503);
    await c.env.MEDIA.put(key, upload.buffer, {
      httpMetadata: { contentType: upload.contentType },
    });

    const url = `/media/${key}`;
    const before = await getSlide(c.env.DB!, slideId);
    await updateSlide(c.env.DB!, slideId, { imagen_url: url } as any);
    const after = await getSlide(c.env.DB!, slideId);
    await logAdminAuditEvent(c, {
      resourceType: 'presentation_slide',
      resourceId: slideId,
      action: 'PATCH',
      oldValues: pickSlideAuditSnapshot(before as Record<string, unknown> | null),
      newValues: pickSlideAuditSnapshot(after as Record<string, unknown> | null),
    });
    return c.json({ ok: true, url });
  } catch {
    return c.json({ ok: false, error: 'upload_failed' }, 500);
  }
});

slidesRoutes.delete('/:id/imagen', requireAuth('presentations:write'), async (c) => {
  const id = c.req.param('id')!;
  const before = await getSlide(c.env.DB!, id);
  await updateSlide(c.env.DB!, id, { imagen_url: null } as any);
  const after = await getSlide(c.env.DB!, id);
  await logAdminAuditEvent(c, {
    resourceType: 'presentation_slide',
    resourceId: id,
    action: 'PATCH',
    oldValues: pickSlideAuditSnapshot(before as Record<string, unknown> | null),
    newValues: pickSlideAuditSnapshot(after as Record<string, unknown> | null),
  });
  return c.json({ ok: true });
});

// ── AI-powered slide helpers ────────────────────────────────────────────────────
slidesRoutes.post('/:id/generate-notes', requireAuth('presentations:write'), async (c) => {
  if (!c.env.AI) return c.json({ ok: false, error: 'ai_not_available' }, 503);
  const slide = await getSlide(c.env.DB!, c.req.param('id')!);
  if (!slide) return c.json({ ok: false, error: 'not_found' }, 404);

  try {
    const { generateNotes } = await import('../../server/ai');
    const notes = await generateNotes(c.env.AI, {
      titulo: slide.titulo,
      subtitulo: slide.subtitulo,
      cuerpo: slide.cuerpo,
      conceptosClave: slide.conceptosClave,
      tag: slide.tag,
    });
    return c.json({ ok: true, notes });
  } catch {
    return c.json({ ok: false, error: 'ai_error' }, 500);
  }
});

slidesRoutes.post('/:id/suggest-concepts', requireAuth('presentations:write'), async (c) => {
  if (!c.env.AI) return c.json({ ok: false, error: 'ai_not_available' }, 503);
  const slide = await getSlide(c.env.DB!, c.req.param('id')!);
  if (!slide) return c.json({ ok: false, error: 'not_found' }, 404);

  try {
    const { suggestConcepts } = await import('../../server/ai');
    const concepts = await suggestConcepts(c.env.AI, {
      titulo: slide.titulo,
      subtitulo: slide.subtitulo,
      cuerpo: slide.cuerpo,
      conceptosClave: slide.conceptosClave,
      tag: slide.tag,
    });
    return c.json({ ok: true, concepts });
  } catch {
    return c.json({ ok: false, error: 'ai_error' }, 500);
  }
});

// ── Presentation comments (read-only for admin) ───────────────────────────────
presentationsRoutes.get('/:id/comments', async (c) => {
  const id = c.req.param('id')!;
  const comments = await listPresentationComments(c.env.DB!, id, 200);
  return c.json({ ok: true, comments });
});
