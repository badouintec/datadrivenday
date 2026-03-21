import { Hono } from 'hono';
import { requireAuth } from '../auth';
import type { AppBindings, AppVariables } from '../types';
import {
  getPresentations, getPresentation, insertPresentation,
  updatePresentation, deletePresentation,
  getSlides, insertSlide, updateSlide, deleteSlide,
  reorderSlides, duplicateSlide,
} from '../../server/db/slides';

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
    nombre: string; slug: string; token: string;
    descripcion?: string; pagina_url?: string;
  }>();
  const id = await insertPresentation(c.env.DB!, body);
  return c.json({ ok: true, id }, 201);
});

presentationsRoutes.patch('/:id', requireAuth('presentations:write'), async (c) => {
  const body = await c.req.json();
  await updatePresentation(c.env.DB!, c.req.param('id'), body);
  return c.json({ ok: true });
});

presentationsRoutes.delete('/:id', requireAuth('presentations:delete'), async (c) => {
  await deletePresentation(c.env.DB!, c.req.param('id'));
  return c.json({ ok: true });
});

// ── Slides ────────────────────────────────────────────────────────────────────
export const slidesRoutes = new Hono<Env>();
slidesRoutes.use('*', requireAuth('presentations:read'));

slidesRoutes.get('/', async (c) => {
  const presentacion = c.req.query('presentacion') ?? 'dataller-2026';
  const slides = await getSlides(c.env.DB!, presentacion);
  return c.json({ ok: true, slides });
});

slidesRoutes.post('/', requireAuth('presentations:write'), async (c) => {
  const body = await c.req.json();
  const id = await insertSlide(c.env.DB!, {
    presentacion: body.presentacion ?? 'dataller-2026',
    numero: body.numero ?? 999,
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
    is_active: 1,
  });
  return c.json({ ok: true, id }, 201);
});

slidesRoutes.patch('/:id', requireAuth('presentations:write'), async (c) => {
  const id = c.req.param('id');
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
  await deleteSlide(c.env.DB!, c.req.param('id'));
  return c.json({ ok: true });
});

slidesRoutes.post('/reorder', requireAuth('presentations:write'), async (c) => {
  const { updates } = await c.req.json<{ updates: Array<{ id: string; numero: number }> }>();
  await reorderSlides(c.env.DB!, updates);
  return c.json({ ok: true });
});

slidesRoutes.post('/:id/duplicate', requireAuth('presentations:write'), async (c) => {
  const newId = await duplicateSlide(c.env.DB!, c.req.param('id'));
  return c.json({ ok: true, id: newId }, 201);
});
