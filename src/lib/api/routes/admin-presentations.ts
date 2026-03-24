import { Hono } from 'hono';
import { requireAuth } from '../auth';
import type { AppBindings, AppVariables } from '../types';
import {
  getPresentations, getPresentation, insertPresentation,
  updatePresentation, deletePresentation,
  getSlides, getMaxSlideNumero, insertSlide, updateSlide, deleteSlide,
  reorderSlides, duplicateSlide,
} from '../../server/db/slides';
import { listPresentationComments } from '../../server/db/participants';

const VALID_SLUG_RE = /^[a-z0-9-]+$/;
const VALID_ESTADOS = new Set(['borrador', 'activo', 'archivado']);

type Env = { Bindings: Partial<AppBindings>; Variables: AppVariables };

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
    return c.json({ ok: true, id }, 201);
  } catch (e: any) {
    if (String(e?.message).includes('UNIQUE constraint failed')) {
      return c.json({ ok: false, error: 'slug_taken' }, 409);
    }
    throw e;
  }
});

presentationsRoutes.patch('/:id', requireAuth('presentations:write'), async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body) return c.json({ ok: false, error: 'invalid_json' }, 400);

  if (body.estado !== undefined && !VALID_ESTADOS.has(body.estado)) {
    return c.json({ ok: false, error: 'invalid_estado' }, 400);
  }
  // Token must never be altered via PATCH
  delete body.token;

  await updatePresentation(c.env.DB!, c.req.param('id')!, body);
  return c.json({ ok: true });
});

presentationsRoutes.delete('/:id', requireAuth('presentations:delete'), async (c) => {
  await deletePresentation(c.env.DB!, c.req.param('id')!);
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
  const body = await c.req.json();
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
  return c.json({ ok: true, id }, 201);
});

slidesRoutes.patch('/:id', requireAuth('presentations:write'), async (c) => {
  const id = c.req.param('id')!;
  const body = await c.req.json();

  const patch: Record<string, unknown> = { ...body };
  if (body.chord) patch.chord_json = JSON.stringify(body.chord);
  if (body.commandWords) patch.command_words_json = JSON.stringify(body.commandWords);
  if (body.referencias) patch.referencias_json = JSON.stringify(body.referencias);
  if (body.conceptosClave) patch.conceptos_json = JSON.stringify(body.conceptosClave);

  delete patch.chord;
  delete patch.commandWords;
  delete patch.referencias;
  delete patch.conceptosClave;

  await updateSlide(c.env.DB!, id, patch as any);
  return c.json({ ok: true });
});

slidesRoutes.delete('/:id', requireAuth('presentations:delete'), async (c) => {
  await deleteSlide(c.env.DB!, c.req.param('id')!);
  return c.json({ ok: true });
});

slidesRoutes.post('/reorder', requireAuth('presentations:write'), async (c) => {
  const { updates } = await c.req.json<{ updates: Array<{ id: string; numero: number }> }>();
  await reorderSlides(c.env.DB!, updates);
  return c.json({ ok: true });
});

slidesRoutes.post('/:id/duplicate', requireAuth('presentations:write'), async (c) => {
  const newId = await duplicateSlide(c.env.DB!, c.req.param('id')!);
  return c.json({ ok: true, id: newId }, 201);
});

slidesRoutes.post('/:id/imagen', requireAuth('presentations:write'), async (c) => {
  const formData = await c.req.formData();
  const file = formData.get('imagen') as File | null;

  if (!file || !file.type.startsWith('image/')) {
    return c.json({ ok: false, error: 'invalid_file' }, 400);
  }
  if (file.size > 5 * 1024 * 1024) {
    return c.json({ ok: false, error: 'file_too_large' }, 400);
  }

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
  const slideId = c.req.param('id')!;
  const key = `slides/${slideId}/${crypto.randomUUID()}.${ext}`;

  await c.env.MEDIA!.put(key, file.stream(), {
    httpMetadata: { contentType: file.type },
  });

  const url = `/media/${key}`;
  await updateSlide(c.env.DB!, slideId, { imagen_url: url } as any);
  return c.json({ ok: true, url });
});

slidesRoutes.delete('/:id/imagen', requireAuth('presentations:write'), async (c) => {
  await updateSlide(c.env.DB!, c.req.param('id')!, { imagen_url: null } as any);
  return c.json({ ok: true });
});

// ── Presentation comments (read-only for admin) ───────────────────────────────
presentationsRoutes.get('/:id/comments', async (c) => {
  const id = c.req.param('id')!;
  const comments = await listPresentationComments(c.env.DB!, id, 200);
  return c.json({ ok: true, comments });
});
