import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { getCityDashboard } from '../server/db/cityData';
import { insertSubmission } from '../server/db/submissions';
import { getSlides, getPresentation } from '../server/db/slides';
import { getBlogPosts, getBlogPostBySlug } from '../server/db/blog';
import { getPublicRecursos } from '../server/db/recursos';
import { handleLogin, handleLogout, handleMe, requireAuth, getClientIp, getRateLimitCount, incrementRateLimitCount } from './auth';
import { isValidEmail } from './participant-auth';
import { presentationsRoutes, slidesRoutes } from './routes/admin-presentations';
import { blogRoutes } from './routes/admin-blog';
import { registrosRoutes } from './routes/admin-registros';
import { recursosRoutes } from './routes/admin-recursos';
import { adminParticipantsRoutes, participantRoutes } from './routes/participant';
import type { AppBindings, AppVariables, SubmissionPayload } from './types';

function getAllowedCorsOrigins(siteUrl?: string, requestUrl?: string) {
  const allowedOrigins = new Set<string>([
    'http://localhost:4321',
    'http://127.0.0.1:4321',
    'http://localhost:4322',
    'http://127.0.0.1:4322',
    'http://localhost:8787',
    'http://127.0.0.1:8787',
  ]);

  if (siteUrl) {
    try {
      allowedOrigins.add(new URL(siteUrl).origin);
    } catch {
      console.warn('[api] Ignoring invalid PUBLIC_SITE_URL for CORS allowlist.');
    }
  }

  if (requestUrl) {
    allowedOrigins.add(new URL(requestUrl).origin);
  }

  return allowedOrigins;
}

// ── Fallback data (served when D1 binding is not configured) ──────────────────
// Mirrors exactly what getCityDashboard() returns from the DB seed.
const FALLBACK_HMO = {
  movilidad: {
    years: [2019, 2020, 2021, 2022, 2023, 2024],
    modal_share: {
      tp:        [35.4, 28.6, 23.9, 25.1, 22.4, 23.8],
      auto:      [28.0, 33.2, 37.1, 38.9, 40.5, 41.5],
      caminando: [10.0, 11.2, 12.8, 12.0, 13.1, 12.4],
    },
    subsidio: [92.87, 252.49, 427.51, 482.43, 613.54, 723.36],
    recaudo:  [159.41, 153.71, 236.90, 289.54, 281.46, 218.32],
    viajes:   [17.71, 17.08, 26.32, 32.17, 31.27, 24.26],
    zonas: {
      norte:  [45.8, 21.5, 25.2, 28.0, 18.3, 28.4],
      centro: [31.9, 17.3, 13.4, 24.0, 10.1, 23.7],
      sur:    [40.6, 23.5, 30.6, 26.7, 15.9, 33.3],
    },
    modal_2019: [
      { label: 'Vehículo privado', value: 28.0 },
      { label: 'Transporte Público', value: 35.4 },
      { label: 'Bicicleta', value: 8.4 },
      { label: 'Rideshare', value: 6.3 },
      { label: 'Taxi', value: 3.2 },
      { label: 'Caminando', value: 10.0 },
    ],
    modal_2024: [
      { label: 'Vehículo privado', value: 41.5 },
      { label: 'Transporte Público', value: 23.8 },
      { label: 'Caminando', value: 12.4 },
      { label: 'Taxi', value: 6.5 },
      { label: 'Rideshare', value: 5.1 },
      { label: 'Bicicleta', value: 4.2 },
    ],
  },
  agua: {
    satisf_years: [2016, 2017, 2018, 2019, 2020],
    satisfaccion: [54, 58, 62, 68, 73],
    asequibilidad: [
      { label: 'Monterrey', value: 58 },
      { label: 'Promedio MX', value: 50 },
      { label: 'Guadalajara', value: 49 },
      { label: 'CDMX', value: 46 },
      { label: 'Tijuana', value: 42 },
      { label: 'Hermosillo', value: 35 },
    ],
  },
  economia: {
    digital_years: [2020, 2021, 2022, 2023, 2024, 2025, 2026],
    digital_idx:   [100, 115, 132, 152, 175, 201, 231],
    diversificacion: [
      { label: 'Monterrey', value: 8.2 },
      { label: 'Guadalajara', value: 6.9 },
      { label: 'Tijuana', value: 5.8 },
      { label: 'Ciudad Juárez', value: 4.7 },
      { label: 'León', value: 4.1 },
      { label: 'Querétaro', value: 3.5 },
      { label: 'Mexicali', value: 3.1 },
      { label: 'Hermosillo', value: 2.3 },
    ],
    solar_mw: [
      { label: 'Sonora', value: 1423 },
      { label: 'Coahuila', value: 891 },
      { label: 'Yucatán', value: 762 },
      { label: 'Jalisco', value: 634 },
      { label: 'Chihuahua', value: 521 },
    ],
  },
  oportunidades: {
    arizona_imports: [
      { label: 'Electrónica y semiconductores', value: 4.2 },
      { label: 'Dispositivos médicos', value: 2.8 },
      { label: 'Baterías y vehículos eléctricos', value: 1.9 },
      { label: 'Maquinaria industrial', value: 1.5 },
      { label: 'Software e ingeniería', value: 0.8 },
      { label: 'Química especializada', value: 0.6 },
      { label: 'Vidrio y cerámica', value: 0.4 },
    ],
    energia_sonora:   [
      { label: 'Solar', value: 38 },
      { label: 'Gas natural', value: 45 },
      { label: 'Hidroeléctrica', value: 6 },
      { label: 'Eólica', value: 8 },
      { label: 'Nuclear', value: 0 },
      { label: 'Carbón', value: 3 },
    ],
    energia_nacional: [
      { label: 'Solar', value: 8 },
      { label: 'Gas natural', value: 52 },
      { label: 'Hidroeléctrica', value: 10 },
      { label: 'Eólica', value: 5 },
      { label: 'Nuclear', value: 4 },
      { label: 'Carbón', value: 6 },
    ],
  },
};

const app = new Hono<{ Bindings: Partial<AppBindings>; Variables: AppVariables }>().basePath('/api');

app.use('*', logger());

app.use(
  '*',
  cors({
    origin: (origin, c) => {
      if (!origin) return null;
      const allowedOrigins = getAllowedCorsOrigins(c.env.PUBLIC_SITE_URL, c.req.url);
      return allowedOrigins.has(origin) ? origin : null;
    },
    allowHeaders: ['Content-Type'],
    allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  }),
);

app.use('*', async (c, next) => {
  c.set('requestId', crypto.randomUUID());
  await next();
  // Security headers on every response
  c.res.headers.set('X-Content-Type-Options', 'nosniff');
  c.res.headers.set('X-Frame-Options', 'DENY');
  c.res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  c.res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  c.res.headers.set('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
});

app.onError((err, c) => {
  console.error('[api] Unhandled error:', err.message, err.stack);
  return c.json({ ok: false, error: err.message }, 500);
});

app.get('/health', (c) => {
  return c.json({
    ok: true,
    service: 'datadrivenday-api',
    requestId: c.get('requestId'),
    hasDatabase: Boolean(c.env.DB),
    hasMediaBucket: Boolean(c.env.MEDIA)
  });
});

app.post('/submissions', async (c) => {
  const body = await c.req.json<Partial<SubmissionPayload>>().catch(() => null);

  if (!body) {
    return c.json({ ok: false, error: 'Invalid JSON body.' }, 400);
  }

  if (!body.type || !body.name || !body.email) {
    return c.json({ ok: false, error: 'type, name and email are required.' }, 400);
  }

  const normalizedEmail = body.email.trim().toLowerCase();
  if (!isValidEmail(normalizedEmail)) {
    return c.json({ ok: false, error: 'Invalid email address.' }, 400);
  }

  const allowedTypes = ['registration', 'interest', 'contact', 'feedback', 'sponsor'];
  if (!allowedTypes.includes(body.type)) {
    return c.json({ ok: false, error: 'Invalid submission type.' }, 400);
  }

  // Rate limit by IP: 10 submissions per hour
  if (c.env.APP_SESSION) {
    const ip = getClientIp(c.req);
    const submissionCount = await getRateLimitCount(c.env.APP_SESSION, `submissions:${ip}`, 3600);
    if (submissionCount >= 10) {
      return c.json({ ok: false, error: 'Too many submissions. Please try again later.' }, 429);
    }
    await incrementRateLimitCount(c.env.APP_SESSION, `submissions:${ip}`, 3600);
  }

  const payload: SubmissionPayload = {
    type: body.type,
    name: body.name.trim(),
    email: normalizedEmail,
    organization: body.organization?.trim(),
    message: body.message?.trim(),
    metadata: body.metadata
  };

  if (!c.env.DB) {
    return c.json(
      {
        ok: true,
        requestId: c.get('requestId'),
        persisted: false,
        reason: 'D1 binding is not configured yet.',
        payload
      },
      202
    );
  }

  const stored = await insertSubmission(c.env.DB, payload);

  return c.json({
    ok: true,
    requestId: c.get('requestId'),
    persisted: true,
    submission: stored
  });
});

// ── City dashboard data ───────────────────────────────────────────────────────
app.get('/city-data/:city', async (c) => {
  const city = c.req.param('city').toLowerCase();

  // Only hermosillo is supported for now
  if (city !== 'hermosillo') {
    return c.json({ ok: false, error: 'City not found.' }, 404);
  }

  if (!c.env.DB) {
    return c.json({ ok: true, source: 'fallback', data: FALLBACK_HMO });
  }

  try {
    const data = await getCityDashboard(c.env.DB, city);
    return c.json({ ok: true, source: 'db', data });
  } catch (err) {
    console.error('[city-data] DB error, returning fallback:', err);
    return c.json({ ok: true, source: 'fallback', data: FALLBACK_HMO });
  }
});

// ── Auth ────────────────────────────────────────────────────────────────────
app.post('/admin/login', handleLogin);
app.post('/admin/logout', handleLogout);
app.get('/admin/me', requireAuth(), handleMe);

// ── Dashboard ─────────────────────────────────────────────────────────────────
app.get('/admin/dashboard', requireAuth(), async (c) => {
  const db = c.env.DB;
  if (!db) return c.json({ ok: false, error: 'no_db' }, 500);

  const [registros, blog, recursos, slides] = await db.batch([
    db.prepare('SELECT COUNT(*) as total FROM submissions WHERE type = "registration"'),
    db.prepare('SELECT estado, COUNT(*) as n FROM blog_posts GROUP BY estado'),
    db.prepare('SELECT COUNT(*) as total FROM recursos WHERE is_active = 1'),
    db.prepare('SELECT COUNT(*) as total FROM presentation_slides WHERE is_active = 1'),
  ]);

  return c.json({
    ok: true,
    registros: registros.results[0],
    blog: blog.results,
    recursos: recursos.results[0],
    slides: slides.results[0],
  });
});

// ── Admin routes ──────────────────────────────────────────────────────────────
app.route('/admin/presentaciones', presentationsRoutes);
app.route('/admin/slides', slidesRoutes);
app.route('/admin/blog', blogRoutes);
app.route('/admin/registros', registrosRoutes);
app.route('/admin/recursos', recursosRoutes);
app.route('/admin/participants', adminParticipantsRoutes);

// ── Participant routes ───────────────────────────────────────────────────────
app.route('/participant', participantRoutes);

// ── Public endpoints ──────────────────────────────────────────────────────────
app.get('/slides', requireAuth('presentations:read'), async (c) => {
  if (!c.env.DB) return c.json({ slides: [], presentation: null });
  const presentacion = c.req.query('presentacion') ?? 'pres-dataller-2026';
  const [slides, presentation] = await Promise.all([
    getSlides(c.env.DB, presentacion),
    getPresentation(c.env.DB, presentacion),
  ]);
  // Do not expose archived presentations publicly
  if (presentation?.estado === 'archivado') {
    return c.json({ slides: [], presentation: null }, 200, { 'Cache-Control': 'no-store' });
  }
  return c.json({
    slides: slides.filter(s => s.isActive),
    presentation: presentation ? { nombre: presentation.nombre, descripcion: presentation.descripcion } : null,
  }, 200, { 'Cache-Control': 'no-store' });
});

app.post('/slides/live-graph', async (c) => {
  const body = await c.req.json<{
    slide: { titulo: string; subtitulo?: string; cuerpo?: string; conceptosClave?: string[]; tag?: string };
    transcript: string;
    existingNodes: string[];
  }>().catch(() => null);
  if (!body?.transcript || !body?.slide?.titulo) return c.json({ ok: false, error: 'invalid_body' }, 400);

  try {
    const { buildFallbackConceptGraph, extractConceptGraph } = await import('../server/ai');
    const ai = c.env.AI;
    if (ai) {
      const graph = await extractConceptGraph(ai, body.slide, body.transcript, body.existingNodes ?? []);
      return c.json({ ok: true, graph, source: 'ai' });
    }

    const graph = buildFallbackConceptGraph(body.slide, body.transcript, body.existingNodes ?? []);
    return c.json({ ok: true, graph, source: 'fallback' });
  } catch {
    const { buildFallbackConceptGraph } = await import('../server/ai');
    return c.json({
      ok: true,
      graph: buildFallbackConceptGraph(body.slide, body.transcript, body.existingNodes ?? []),
      source: 'fallback',
    });
  }
});

app.get('/blog', async (c) => {
  if (!c.env.DB) return c.json({ posts: [] });
  const posts = await getBlogPosts(c.env.DB, 'publicado');
  return c.json({ posts }, 200, { 'Cache-Control': 'public, max-age=60' });
});

app.get('/blog/:slug', async (c) => {
  if (!c.env.DB) return c.json({ ok: false, error: 'no_db' }, 500);
  const post = await getBlogPostBySlug(c.env.DB, c.req.param('slug'));
  if (!post) return c.json({ ok: false, error: 'not_found' }, 404);
  return c.json({ ok: true, post }, 200, { 'Cache-Control': 'public, max-age=60' });
});

app.get('/recursos', async (c) => {
  if (!c.env.DB) return c.json({ recursos: [] });
  const categoria = c.req.query('categoria') ?? undefined;
  const recursos = await getPublicRecursos(c.env.DB, categoria);
  return c.json({ recursos }, 200, { 'Cache-Control': 'public, max-age=60' });
});

// ── AI Chat (streaming SSE) ───────────────────────────────────────────────────
app.post('/chat', async (c) => {
  const body = await c.req.json<{
    mode: string;
    messages: Array<{ role: string; content: string }>;
    context?: Record<string, unknown>;
  }>().catch(() => null);

  if (!body || !Array.isArray(body.messages) || body.messages.length === 0) {
    return c.json({ ok: false, error: 'invalid_body' }, 400);
  }

  // Validate and sanitize input
  const mode = body.mode === 'presenter' ? 'presenter' : 'participant';
  const sanitizedMessages = body.messages
    .filter(m => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .slice(-10)
    .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content.slice(0, 2000) }));

  if (sanitizedMessages.length === 0) {
    return c.json({ ok: false, error: 'no_messages' }, 400);
  }

  // Rate limit: 20 requests per minute per IP
  if (c.env.APP_SESSION) {
    const ip = getClientIp(c.req);
    const count = await getRateLimitCount(c.env.APP_SESSION, `chat:${ip}`, 60);
    if (count >= 20) {
      return c.json({ ok: false, error: 'Demasiadas solicitudes. Intenta en un momento.' }, 429);
    }
    await incrementRateLimitCount(c.env.APP_SESSION, `chat:${ip}`, 60);
  }

  // Build system prompt
  let systemPrompt: string;
  if (mode === 'presenter') {
    const ctx = (body.context ?? {}) as Record<string, unknown>;
    const slideTitle = String(ctx.slideTitle ?? '').slice(0, 200);
    const slideSubtitulo = String(ctx.slideSubtitulo ?? '').slice(0, 200);
    const rawConcepts = ctx.conceptosClave;
    const conceptosClave = Array.isArray(rawConcepts)
      ? rawConcepts.map(x => String(x).slice(0, 50)).slice(0, 10).join(', ')
      : '';
    const slideInfo = slideTitle
      ? `\nDiapositiva actual: "${slideTitle}"${slideSubtitulo ? ` — ${slideSubtitulo}` : ''}${conceptosClave ? `\nConceptos clave: ${conceptosClave}` : ''}`
      : '';
    systemPrompt = `Eres un asistente de presentaciones en vivo para Data Driven Day 2026, un evento de datos y tecnología en Hermosillo, Sonora, México. Tu rol es ayudar al presentador con:
- Explicar ecuaciones matemáticas y conceptos técnicos con claridad
- Generar esquemas conceptuales y mapas de ideas
- Responder preguntas técnicas sobre datos, IA, urbanismo y tecnología
- Ser conciso: el presentador está en escena en tiempo real

Cuando expliques una ecuación, usa notación matemática clara (ejemplo: E = mc², ȳ = Σxᵢ/n).
Cuando sugieras un esquema de conceptos, incluye exactamente esta línea al final de tu respuesta:
ESQUEMA: concepto_raiz → rama1, rama2, rama3
(Usa términos breves, sin tildes, máximo 4 ramas)${slideInfo}

Responde en español. Sé breve y preciso.`;
  } else {
    systemPrompt = `Eres un asistente inteligente de Data Driven Day 2026, un evento de datos, tecnología e inteligencia urbana en Hermosillo, Sonora, México.

El evento incluye:
- Conferencias sobre IA, datos urbanos, movilidad, agua y economía digital
- Un Dataller (taller intensivo) de análisis y visualización de datos
- Herramientas: Python, SQL, visualización de datos, LLMs
- Ponentes expertos en tecnología y política pública

Tu rol:
- Responder preguntas sobre el programa, actividades y logística del evento
- Explicar conceptos técnicos de forma accesible
- Orientar sobre el Dataller y sus recursos
- Ser amigable, conciso y útil

Responde en español.`;
  }

  const ai = c.env.AI;
  if (!ai) {
    return c.json({ ok: false, error: 'El chat de IA no está disponible en este entorno.' }, 503);
  }

  const allMessages = [
    { role: 'system' as const, content: systemPrompt },
    ...sanitizedMessages,
  ];

  const stream = await ai.run('@cf/meta/llama-3.1-8b-instruct-fp8' as keyof AiModels, {
    messages: allMessages,
    stream: true,
  });

  return new Response(stream as unknown as ReadableStream, {
    headers: { 'content-type': 'text/event-stream' },
  });
});

// ── Serve media from R2 ──────────────────────────────────────────────────────
app.get('/media/*', async (c) => {
  const key = c.req.path.replace('/media/', '');
  if (!c.env.MEDIA) return c.notFound();
  const object = await c.env.MEDIA.get(key);
  if (!object) return c.notFound();
  return new Response(object.body as ReadableStream, {
    headers: {
      'Content-Type': object.httpMetadata?.contentType ?? 'application/octet-stream',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
});

export { app };
