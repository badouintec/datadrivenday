# Editor Visual de Presentaciones — Data Driven Day 2026
## Sistema completo: Auth · Editor · Preview · Presenter Mode
### Stack: Astro 5 · Cloudflare Workers · Hono · D1 · KV · CSS custom properties · JS vanilla

---

## CONCEPTO

Un editor visual que vive en `/admin/editor` dentro del mismo sitio. El presentador hace login, entra al editor, ve todos los slides en una barra lateral, puede editar cualquier campo en línea con un panel de propiedades a la derecha, previsualizar el resultado con el canvas animado, y al terminar la presentación se carga en vivo desde D1 — no desde el archivo `site.ts` hardcodeado.

No es un CMS genérico. Es un editor especializado para este tipo de presentación: canvas reactivo, partículas, audio, voz. El editor entiende esos conceptos y los expone visualmente.

---

## ARQUITECTURA COMPLETA

```
src/
├── pages/
│   ├── admin/
│   │   ├── login.astro              → Formulario de login
│   │   ├── index.astro              → Dashboard admin (redirect a /admin/editor)
│   │   └── editor.astro             → Editor visual principal
│   └── dataller/
│       ├── index.astro              → Documento público para asistentes
│       └── present.astro            → Modo presenter (carga desde D1)
│
├── lib/
│   ├── api/
│   │   ├── app.ts                   → App Hono principal (ya existe)
│   │   ├── auth.ts                  → Middleware de sesión + login
│   │   └── slides.ts                → CRUD de slides en D1
│   └── server/
│       └── db/
│           ├── submissions.ts        → Ya existe
│           └── slides.ts            → insertSlide, updateSlide, getSlides, deleteSlide
│
├── components/
│   └── editor/
│       ├── SlideSidebar.astro        → Lista de slides + drag to reorder
│       ├── CanvasPreview.astro       → Preview en vivo del canvas animado
│       ├── PropertiesPanel.astro     → Panel derecho con todos los campos
│       ├── CodeEditor.astro          → Editor de snippet de código
│       ├── ReferencesEditor.astro    → CRUD de referencias del slide
│       └── ColorPicker.astro        → Selector de accent color + particle state
│
└── db/
    └── migrations/
        └── 002_slides.sql            → Schema de slides en D1
```

---

## BASE DE DATOS — D1

### Migración 002_slides.sql

```sql
-- Tabla principal de slides
CREATE TABLE IF NOT EXISTS presentation_slides (
  id          TEXT PRIMARY KEY,          -- UUID v4
  presentacion TEXT NOT NULL DEFAULT 'dataller-2026',
  numero      INTEGER NOT NULL,          -- orden en la presentación
  tag         TEXT NOT NULL,             -- "9:00 AM · CONTEXTO"
  titulo      TEXT NOT NULL,
  subtitulo   TEXT,
  cuerpo      TEXT NOT NULL,
  notas       TEXT,                      -- notas privadas del presentador
  duracion    INTEGER NOT NULL DEFAULT 15, -- minutos
  particle_state TEXT NOT NULL DEFAULT 'chaos',
  accent_color   TEXT NOT NULL DEFAULT 'primary',
  chord_json     TEXT NOT NULL DEFAULT '[]', -- JSON array de frecuencias
  particle_speed REAL NOT NULL DEFAULT 0.04,
  command_words_json TEXT DEFAULT '[]',   -- JSON array de palabras clave
  referencias_json   TEXT DEFAULT '[]',   -- JSON array de referencias
  codigo_demo  TEXT,                     -- snippet de código opcional
  conceptos_json TEXT DEFAULT '[]',      -- JSON array de strings
  is_active    INTEGER NOT NULL DEFAULT 1, -- 0 = oculto en presenter
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Índice para ordenar
CREATE INDEX IF NOT EXISTS idx_slides_presentacion_numero
  ON presentation_slides(presentacion, numero);

-- Tabla de sesiones admin
CREATE TABLE IF NOT EXISTS admin_sessions (
  id         TEXT PRIMARY KEY,  -- token de sesión
  user_id    TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Trigger para updated_at automático
CREATE TRIGGER IF NOT EXISTS slides_updated_at
  AFTER UPDATE ON presentation_slides
  BEGIN
    UPDATE presentation_slides
    SET updated_at = datetime('now')
    WHERE id = NEW.id;
  END;
```

### Aplicar la migración

```bash
# Local
npx wrangler d1 execute datadrivenday --local --file=db/migrations/002_slides.sql

# Producción
npx wrangler d1 execute datadrivenday --file=db/migrations/002_slides.sql
```

---

## AUTH — src/lib/api/auth.ts

Sistema de auth minimalista con KV para sesiones. Sin JWT externo, sin Lucia, sin NextAuth. Solo Hono middleware + D1 + KV.

```typescript
import type { Context, Next } from 'hono';
import type { AppBindings } from './types.ts';

const SESSION_DURATION_HOURS = 8;
const SESSION_COOKIE = 'ddd_session';

// ── CREDENCIALES ───────────────────────────────────────────────────────────
// Almacenadas como variables de entorno en wrangler.jsonc
// ADMIN_USER=presentador
// ADMIN_PASS_HASH=<bcrypt hash de la contraseña>
// En desarrollo usar plaintext comparado, en prod usar hash

async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  // Si el env tiene ADMIN_PASS (plaintext para dev), comparar directo
  // En prod, ADMIN_PASS_HASH debe ser un SHA-256 hex del password
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashHex = Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  return hashHex === hash;
}

// ── CREAR SESIÓN ───────────────────────────────────────────────────────────
export async function createSession(
  kv: KVNamespace,
  userId: string
): Promise<string> {
  const sessionId = crypto.randomUUID();
  const expiresAt = new Date(
    Date.now() + SESSION_DURATION_HOURS * 60 * 60 * 1000
  ).toISOString();

  await kv.put(
    `session:${sessionId}`,
    JSON.stringify({ userId, expiresAt }),
    { expirationTtl: SESSION_DURATION_HOURS * 3600 }
  );

  return sessionId;
}

// ── VERIFICAR SESIÓN ───────────────────────────────────────────────────────
export async function getSession(
  kv: KVNamespace,
  sessionId: string
): Promise<{ userId: string } | null> {
  const data = await kv.get(`session:${sessionId}`);
  if (!data) return null;

  const session = JSON.parse(data) as { userId: string; expiresAt: string };
  if (new Date(session.expiresAt) < new Date()) {
    await kv.delete(`session:${sessionId}`);
    return null;
  }

  return { userId: session.userId };
}

// ── MIDDLEWARE AUTH ────────────────────────────────────────────────────────
export async function requireAuth(c: Context<AppBindings>, next: Next) {
  const cookie = c.req.header('Cookie') ?? '';
  const match = cookie.match(new RegExp(`${SESSION_COOKIE}=([^;]+)`));
  const sessionId = match?.[1];

  if (!sessionId) {
    return c.redirect('/admin/login?redirect=' + encodeURIComponent(c.req.path));
  }

  const session = await getSession(c.env.APP_SESSION, sessionId);
  if (!session) {
    return c.redirect('/admin/login?expired=1');
  }

  c.set('userId', session.userId);
  await next();
}

// ── ENDPOINT LOGIN ─────────────────────────────────────────────────────────
// Registrar en app.ts:
// app.post('/api/admin/login', handleLogin)
export async function handleLogin(c: Context<AppBindings>) {
  const body = await c.req.json<{ user: string; password: string }>();
  
  const expectedUser = c.env.ADMIN_USER ?? 'presentador';
  const expectedHash = c.env.ADMIN_PASS_HASH;

  if (!expectedHash) {
    return c.json({ ok: false, error: 'server_misconfigured' }, 500);
  }

  const userMatch = body.user === expectedUser;
  const passMatch = await verifyPassword(body.password, expectedHash);

  if (!userMatch || !passMatch) {
    // Timing-safe: siempre esperar aunque falle
    await new Promise(r => setTimeout(r, 200 + Math.random() * 100));
    return c.json({ ok: false, error: 'invalid_credentials' }, 401);
  }

  const sessionId = await createSession(c.env.APP_SESSION, body.user);

  return new Response(
    JSON.stringify({ ok: true }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': [
          `${SESSION_COOKIE}=${sessionId}`,
          'HttpOnly',
          'Secure',
          'SameSite=Strict',
          `Max-Age=${SESSION_DURATION_HOURS * 3600}`,
          'Path=/',
        ].join('; '),
      },
    }
  );
}

// ── ENDPOINT LOGOUT ────────────────────────────────────────────────────────
export async function handleLogout(c: Context<AppBindings>) {
  const cookie = c.req.header('Cookie') ?? '';
  const match = cookie.match(new RegExp(`${SESSION_COOKIE}=([^;]+)`));
  const sessionId = match?.[1];
  
  if (sessionId) {
    await c.env.APP_SESSION.delete(`session:${sessionId}`);
  }

  return new Response(null, {
    status: 302,
    headers: {
      Location: '/admin/login',
      'Set-Cookie': `${SESSION_COOKIE}=; HttpOnly; Secure; SameSite=Strict; Max-Age=0; Path=/`,
    },
  });
}
```

### Variables de entorno necesarias

```bash
# Generar hash de contraseña (Node.js)
node -e "
const crypto = require('crypto');
const pass = 'tu-contraseña-aqui';
const hash = crypto.createHash('sha256').update(pass).digest('hex');
console.log(hash);
"

# Agregar a wrangler.jsonc en [vars]:
# ADMIN_USER = "presentador"
# ADMIN_PASS_HASH = "<hash generado>"
# PRESENT_TOKEN = "dataller2026"
```

---

## CRUD DE SLIDES — src/lib/server/db/slides.ts

```typescript
import type { D1Database } from '@cloudflare/workers-types';

export interface SlideRow {
  id: string;
  presentacion: string;
  numero: number;
  tag: string;
  titulo: string;
  subtitulo: string | null;
  cuerpo: string;
  notas: string | null;
  duracion: number;
  particle_state: string;
  accent_color: string;
  chord_json: string;
  particle_speed: number;
  command_words_json: string;
  referencias_json: string;
  codigo_demo: string | null;
  conceptos_json: string;
  is_active: number;
  created_at: string;
  updated_at: string;
}

// Convertir row de D1 a objeto tipado
function parseRow(row: SlideRow) {
  return {
    ...row,
    chord: JSON.parse(row.chord_json) as number[],
    commandWords: JSON.parse(row.command_words_json) as string[],
    referencias: JSON.parse(row.referencias_json),
    conceptosClave: JSON.parse(row.conceptos_json) as string[],
    isActive: row.is_active === 1,
  };
}

// ── GET ALL ────────────────────────────────────────────────────────────────
export async function getSlides(db: D1Database, presentacion = 'dataller-2026') {
  const result = await db
    .prepare(
      `SELECT * FROM presentation_slides
       WHERE presentacion = ?
       ORDER BY numero ASC`
    )
    .bind(presentacion)
    .all<SlideRow>();

  return result.results.map(parseRow);
}

// ── GET ONE ────────────────────────────────────────────────────────────────
export async function getSlide(db: D1Database, id: string) {
  const row = await db
    .prepare('SELECT * FROM presentation_slides WHERE id = ?')
    .bind(id)
    .first<SlideRow>();

  return row ? parseRow(row) : null;
}

// ── INSERT ─────────────────────────────────────────────────────────────────
export async function insertSlide(
  db: D1Database,
  data: Omit<SlideRow, 'id' | 'created_at' | 'updated_at'>
) {
  const id = crypto.randomUUID();
  await db
    .prepare(
      `INSERT INTO presentation_slides
       (id, presentacion, numero, tag, titulo, subtitulo, cuerpo, notas,
        duracion, particle_state, accent_color, chord_json, particle_speed,
        command_words_json, referencias_json, codigo_demo, conceptos_json, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      id, data.presentacion, data.numero, data.tag, data.titulo,
      data.subtitulo ?? null, data.cuerpo, data.notas ?? null,
      data.duracion, data.particle_state, data.accent_color,
      data.chord_json, data.particle_speed, data.command_words_json,
      data.referencias_json, data.codigo_demo ?? null,
      data.conceptos_json, data.is_active
    )
    .run();

  return id;
}

// ── UPDATE ─────────────────────────────────────────────────────────────────
export async function updateSlide(
  db: D1Database,
  id: string,
  patch: Partial<Omit<SlideRow, 'id' | 'created_at' | 'updated_at'>>
) {
  const fields = Object.keys(patch)
    .map(k => `${k} = ?`)
    .join(', ');
  const values = Object.values(patch);

  await db
    .prepare(`UPDATE presentation_slides SET ${fields} WHERE id = ?`)
    .bind(...values, id)
    .run();
}

// ── DELETE ─────────────────────────────────────────────────────────────────
export async function deleteSlide(db: D1Database, id: string) {
  await db
    .prepare('DELETE FROM presentation_slides WHERE id = ?')
    .bind(id)
    .run();
}

// ── REORDER ────────────────────────────────────────────────────────────────
// Actualizar el número de orden de múltiples slides en una transacción
export async function reorderSlides(
  db: D1Database,
  updates: Array<{ id: string; numero: number }>
) {
  const statements = updates.map(({ id, numero }) =>
    db
      .prepare('UPDATE presentation_slides SET numero = ? WHERE id = ?')
      .bind(numero, id)
  );

  await db.batch(statements);
}

// ── DUPLICATE ──────────────────────────────────────────────────────────────
export async function duplicateSlide(db: D1Database, id: string) {
  const original = await getSlide(db, id);
  if (!original) throw new Error('Slide not found');

  const { id: _, created_at, updated_at, ...rest } = original as any;

  return insertSlide(db, {
    ...rest,
    numero: rest.numero + 0.5, // Se reordena después
    titulo: `${rest.titulo} (copia)`,
    chord_json: JSON.stringify(rest.chord),
    command_words_json: JSON.stringify(rest.commandWords),
    referencias_json: JSON.stringify(rest.referencias),
    conceptos_json: JSON.stringify(rest.conceptosClave),
    is_active: rest.isActive ? 1 : 0,
  });
}
```

---

## API ENDPOINTS — src/lib/api/app.ts

Agregar a la app Hono existente:

```typescript
import { requireAuth, handleLogin, handleLogout } from './auth.ts';
import {
  getSlides, insertSlide, updateSlide, deleteSlide,
  reorderSlides, duplicateSlide
} from '../server/db/slides.ts';

// ── AUTH ───────────────────────────────────────────────────────────────────
app.post('/api/admin/login', handleLogin);
app.post('/api/admin/logout', handleLogout);

// ── SLIDES API (protegida) ─────────────────────────────────────────────────
const adminSlides = new Hono<AppBindings>();
adminSlides.use('*', requireAuth);

// GET /api/admin/slides?presentacion=dataller-2026
adminSlides.get('/', async (c) => {
  const presentacion = c.req.query('presentacion') ?? 'dataller-2026';
  const slides = await getSlides(c.env.DB, presentacion);
  return c.json({ ok: true, slides });
});

// POST /api/admin/slides — crear slide nuevo
adminSlides.post('/', async (c) => {
  const body = await c.req.json();
  const id = await insertSlide(c.env.DB, {
    presentacion: body.presentacion ?? 'dataller-2026',
    numero: body.numero ?? 999,
    tag: body.tag ?? 'NUEVO SLIDE',
    titulo: body.titulo ?? 'Sin título',
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

// PATCH /api/admin/slides/:id — actualizar campos parciales
adminSlides.patch('/:id', async (c) => {
  const id = c.req.param('id');
  const body = await c.req.json();

  // Serializar arrays a JSON string antes de guardar
  const patch: Record<string, unknown> = { ...body };
  if (body.chord)        patch.chord_json = JSON.stringify(body.chord);
  if (body.commandWords) patch.command_words_json = JSON.stringify(body.commandWords);
  if (body.referencias)  patch.referencias_json = JSON.stringify(body.referencias);
  if (body.conceptosClave) patch.conceptos_json = JSON.stringify(body.conceptosClave);
  
  // Limpiar claves que no son columnas de D1
  delete patch.chord;
  delete patch.commandWords;
  delete patch.referencias;
  delete patch.conceptosClave;

  await updateSlide(c.env.DB, id, patch as any);
  return c.json({ ok: true });
});

// DELETE /api/admin/slides/:id
adminSlides.delete('/:id', async (c) => {
  await deleteSlide(c.env.DB, c.req.param('id'));
  return c.json({ ok: true });
});

// POST /api/admin/slides/reorder
adminSlides.post('/reorder', async (c) => {
  const { updates } = await c.req.json<{
    updates: Array<{ id: string; numero: number }>;
  }>();
  await reorderSlides(c.env.DB, updates);
  return c.json({ ok: true });
});

// POST /api/admin/slides/:id/duplicate
adminSlides.post('/:id/duplicate', async (c) => {
  const newId = await duplicateSlide(c.env.DB, c.req.param('id'));
  return c.json({ ok: true, id: newId }, 201);
});

// Público: slides para el presenter mode (sin auth)
app.get('/api/slides', async (c) => {
  const presentacion = c.req.query('presentacion') ?? 'dataller-2026';
  const slides = await getSlides(c.env.DB, presentacion);
  // Filtrar solo activos
  return c.json({ slides: slides.filter(s => s.isActive) });
});

app.route('/api/admin/slides', adminSlides);
```

---

## PÁGINA LOGIN — src/pages/admin/login.astro

```html
---
// Si ya tiene sesión válida, redirigir al editor
const cookie = Astro.request.headers.get('cookie') ?? '';
const sessionMatch = cookie.match(/ddd_session=([^;]+)/);
if (sessionMatch) {
  // Verificar sesión contra KV — hacerlo en el middleware de Hono
  // Aquí solo hacer redirect preventivo si existe la cookie
}

const expired = Astro.url.searchParams.get('expired') === '1';
const redirect = Astro.url.searchParams.get('redirect') ?? '/admin/editor';
---

<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Acceso · Data Driven Day</title>
  <link rel="stylesheet" href="/styles/global.css" />
</head>
<body class="login-body">

  <div class="login-container">
    <header class="login-header">
      <span class="login-brand">DATA DRIVEN DAY</span>
      <h1 class="login-title">Acceso al editor</h1>
      <p class="login-sub">Dataller de IA 2026 · modo presenter</p>
    </header>

    {expired && (
      <div class="login-alert" role="alert">
        Sesión expirada. Inicia sesión de nuevo.
      </div>
    )}

    <form id="loginForm" class="login-form" novalidate>
      <div class="field-group">
        <label for="user" class="field-label">Usuario</label>
        <input
          type="text"
          id="user"
          name="user"
          class="field-input"
          required
          autocomplete="username"
          autocapitalize="none"
          spellcheck="false"
        />
      </div>

      <div class="field-group">
        <label for="password" class="field-label">Contraseña</label>
        <input
          type="password"
          id="password"
          name="password"
          class="field-input"
          required
          autocomplete="current-password"
        />
      </div>

      <div id="loginError" class="login-error" hidden role="alert">
        Credenciales incorrectas
      </div>

      <button type="submit" id="loginBtn" class="login-btn">
        <span id="loginBtnText">ENTRAR</span>
      </button>
    </form>
  </div>

  <script define:vars={{ redirect }}>
    const form = document.getElementById('loginForm');
    const errorEl = document.getElementById('loginError');
    const btn = document.getElementById('loginBtn');
    const btnText = document.getElementById('loginBtnText');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      errorEl.hidden = true;
      btn.disabled = true;
      btnText.textContent = 'VERIFICANDO...';

      const user = form.user.value.trim();
      const password = form.password.value;

      try {
        const res = await fetch('/api/admin/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user, password }),
        });

        if (res.ok) {
          window.location.href = redirect;
        } else {
          errorEl.hidden = false;
          form.password.value = '';
          form.password.focus();
        }
      } catch {
        errorEl.hidden = false;
      } finally {
        btn.disabled = false;
        btnText.textContent = 'ENTRAR';
      }
    });
  </script>

</body>
</html>
```

---

## EDITOR VISUAL — src/pages/admin/editor.astro

### Guard de auth en Astro SSR

```typescript
---
// El guard real lo hace el middleware de Hono si la ruta está protegida.
// Aquí solo estructuramos la página.
// Si se accede sin auth, el middleware redirige a /admin/login.
---
```

### Layout del editor — 3 zonas

```
┌─────────────────────────────────────────────────────────────────┐
│  TOPBAR: Logo · Nombre presentación · [Vista previa] [Publicar] │
├──────────────┬──────────────────────────┬───────────────────────┤
│              │                          │                       │
│  SIDEBAR     │   CANVAS PREVIEW         │   PROPERTIES PANEL    │
│  (slides)    │   (animado, en vivo)     │   (campos editables)  │
│              │                          │                       │
│  Cada slide  │   Muestra exactamente    │   Título, subtítulo,  │
│  como mini   │   cómo se ve en el       │   cuerpo, tag, color, │
│  card        │   presenter mode         │   partículas, audio,  │
│              │                          │   código, referencias │
│  + Drag      │   Se actualiza al editar │                       │
│  to reorder  │   cualquier campo        │                       │
│              │                          │                       │
│  + Nuevo     │                          │   + Sección de        │
│  + Dupl.     │                          │   referencias CRUD    │
│              │                          │                       │
└──────────────┴──────────────────────────┴───────────────────────┘
```

### HTML del editor

```html
<body class="editor-body" data-theme="dark">

  <!-- ── TOP BAR ──────────────────────────────────────────── -->
  <div class="editor-topbar">
    <div class="topbar-left">
      <span class="topbar-brand">DDD</span>
      <span class="topbar-divider" aria-hidden="true">/</span>
      <span class="topbar-pres-name" id="presName">Dataller de IA 2026</span>
      <span class="topbar-status" id="saveStatus" aria-live="polite">
        Guardado
      </span>
    </div>
    <div class="topbar-right">
      <button class="topbar-btn topbar-btn--ghost" id="btnPreview" type="button">
        Previsualizar →
      </button>
      <a
        href="/dataller/present?token=dataller2026"
        target="_blank"
        class="topbar-btn topbar-btn--primary"
      >
        Abrir presenter ↗
      </a>
      <a href="/api/admin/logout" class="topbar-btn topbar-btn--danger" id="btnLogout">
        Salir
      </a>
    </div>
  </div>

  <!-- ── LAYOUT PRINCIPAL ─────────────────────────────────── -->
  <div class="editor-layout">

    <!-- ── SIDEBAR: Lista de slides ────────────────────────── -->
    <aside class="editor-sidebar" aria-label="Slides de la presentación">
      <div class="sidebar-header">
        <span class="sidebar-title">Slides</span>
        <button class="sidebar-add-btn" id="btnAddSlide" type="button" aria-label="Agregar slide">
          +
        </button>
      </div>

      <!-- Lista con drag-and-drop -->
      <ul
        class="slides-list"
        id="slidesList"
        role="listbox"
        aria-label="Lista de slides, arrastra para reordenar"
      >
        <!-- Generada por JS al cargar -->
        <!-- Cada item: -->
        <!--
        <li
          class="slide-item"
          role="option"
          data-slide-id="uuid"
          data-numero="1"
          draggable="true"
          aria-selected="false"
        >
          <div class="slide-item-drag" aria-hidden="true">⠿</div>
          <div class="slide-item-info">
            <span class="slide-item-num">01</span>
            <span class="slide-item-titulo">Por qué esto importa aquí</span>
            <span class="slide-item-tag">9:00 AM · CONTEXTO</span>
          </div>
          <div class="slide-item-actions">
            <button class="slide-action-btn" data-action="duplicate" aria-label="Duplicar">⎘</button>
            <button class="slide-action-btn slide-action-btn--danger" data-action="delete" aria-label="Eliminar">×</button>
          </div>
          <div class="slide-item-state-dot" data-state="chaos" aria-hidden="true"></div>
        </li>
        -->
      </ul>
    </aside>

    <!-- ── CANVAS PREVIEW ────────────────────────────────────────── -->
    <main class="editor-canvas-area" aria-label="Vista previa del slide">
      <div class="canvas-wrapper">
        <canvas id="previewCanvas" aria-hidden="true"></canvas>
        <div class="canvas-hud" aria-hidden="true">
          <div class="preview-meta">
            <span id="prevNumero">01</span>
            <span class="preview-divider">—</span>
            <span id="prevTag">CONTEXTO</span>
          </div>
          <h2 id="prevTitulo" class="preview-titulo">Título</h2>
          <p id="prevSubtitulo" class="preview-subtitulo"></p>
        </div>
        <div class="canvas-concepts" id="prevConcepts" aria-hidden="true">
          <!-- Pills de conceptos clave -->
        </div>
        <div class="canvas-cuerpo" aria-hidden="true">
          <p id="prevCuerpo"></p>
        </div>
      </div>

      <!-- Barra de herramientas del canvas -->
      <div class="canvas-toolbar" role="toolbar" aria-label="Herramientas del canvas">
        <button class="canvas-tool" id="toolPlay" type="button" aria-label="Reproducir animación" aria-pressed="true">
          ▶
        </button>
        <button class="canvas-tool" id="toolMute" type="button" aria-label="Silenciar audio" aria-pressed="false">
          ♪
        </button>
        <div class="canvas-tool-divider" aria-hidden="true"></div>
        <button class="canvas-tool" id="btnPrevSlide" type="button" aria-label="Slide anterior">
          ←
        </button>
        <button class="canvas-tool" id="btnNextSlide" type="button" aria-label="Slide siguiente">
          →
        </button>
      </div>
    </main>

    <!-- ── PROPERTIES PANEL ──────────────────────────────────────── -->
    <aside class="editor-props" aria-label="Propiedades del slide seleccionado">
      <div class="props-scroll">

        <!-- Sección: Identidad -->
        <section class="props-section">
          <h3 class="props-section-title">IDENTIDAD</h3>

          <div class="prop-field">
            <label class="prop-label" for="propTag">Tag / hora</label>
            <input type="text" id="propTag" class="prop-input" placeholder="9:00 AM · CONTEXTO" />
          </div>

          <div class="prop-field">
            <label class="prop-label" for="propTitulo">Título</label>
            <input type="text" id="propTitulo" class="prop-input prop-input--large" placeholder="Título del slide" />
          </div>

          <div class="prop-field">
            <label class="prop-label" for="propSubtitulo">Subtítulo <span class="prop-optional">(opcional)</span></label>
            <input type="text" id="propSubtitulo" class="prop-input" placeholder="Subtítulo opcional" />
          </div>

          <div class="prop-field">
            <label class="prop-label" for="propDuracion">Duración (min)</label>
            <input type="number" id="propDuracion" class="prop-input prop-input--short" min="1" max="120" step="5" />
          </div>
        </section>

        <!-- Sección: Contenido -->
        <section class="props-section">
          <h3 class="props-section-title">CONTENIDO</h3>

          <div class="prop-field">
            <label class="prop-label" for="propCuerpo">Cuerpo (texto de apoyo)</label>
            <textarea id="propCuerpo" class="prop-textarea" rows="3" placeholder="Texto que aparece en pantalla como apoyo visual"></textarea>
          </div>

          <div class="prop-field">
            <label class="prop-label" for="propNotas">Notas privadas del presentador</label>
            <textarea id="propNotas" class="prop-textarea prop-textarea--notes" rows="4" placeholder="Estas notas solo las ves tú al presionar N durante la presentación"></textarea>
          </div>
        </section>

        <!-- Sección: Conceptos clave -->
        <section class="props-section">
          <h3 class="props-section-title">CONCEPTOS CLAVE</h3>
          <div class="tags-editor" id="conceptsEditor">
            <!-- Pills editables generadas por JS -->
            <!-- Input para agregar nuevo -->
          </div>
        </section>

        <!-- Sección: Visual -->
        <section class="props-section">
          <h3 class="props-section-title">VISUAL</h3>

          <div class="prop-field">
            <label class="prop-label">Estado de partículas</label>
            <div class="particle-state-grid" id="particleStateGrid" role="radiogroup" aria-label="Estado visual de las partículas">
              <!-- 10 opciones como botones visuales -->
              <!-- chaos, flow, cluster, network, helix, grid, pulse, orbit, collapse, expand -->
            </div>
          </div>

          <div class="prop-field">
            <label class="prop-label">Color de acento</label>
            <div class="accent-color-row" id="accentColorRow" role="radiogroup" aria-label="Color de acento">
              <!-- primary (verde) · alert (rojo) · sage (verde gris) · light (crema) · amber -->
            </div>
          </div>

          <div class="prop-field">
            <label class="prop-label" for="propSpeed">
              Velocidad de partículas
              <span class="prop-value-display" id="speedDisplay">0.04</span>
            </label>
            <input
              type="range"
              id="propSpeed"
              min="0.01" max="0.12" step="0.005"
              class="prop-range"
            />
          </div>
        </section>

        <!-- Sección: Audio -->
        <section class="props-section">
          <h3 class="props-section-title">AUDIO</h3>
          <p class="props-hint">El acorde ambiental se genera a partir de estas frecuencias (Hz)</p>
          <div class="chord-editor" id="chordEditor">
            <!-- Frecuencias como inputs numéricos pequeños -->
            <!-- + botón para agregar frecuencia -->
            <!-- Botón "Reproducir" para escuchar el acorde -->
          </div>
        </section>

        <!-- Sección: Código demo -->
        <section class="props-section">
          <h3 class="props-section-title">CÓDIGO DEMO <span class="prop-optional">(opcional)</span></h3>
          <textarea
            id="propCodigo"
            class="prop-textarea prop-textarea--code"
            rows="8"
            placeholder="# Snippet de código que aparece al presionar C durante la presentación
from tabpfn import TabPFNClassifier"
            spellcheck="false"
            autocorrect="off"
            autocapitalize="off"
          ></textarea>
        </section>

        <!-- Sección: Referencias -->
        <section class="props-section">
          <h3 class="props-section-title">REFERENCIAS</h3>
          <div id="refsEditor" class="refs-editor">
            <!-- Lista de referencias editables -->
            <!-- Botón "Agregar referencia" -->
          </div>
        </section>

        <!-- Sección: Comandos de voz -->
        <section class="props-section">
          <h3 class="props-section-title">PALABRAS CLAVE DE VOZ</h3>
          <p class="props-hint">Palabras que el sistema detecta cuando las dices</p>
          <div class="tags-editor" id="commandWordsEditor">
            <!-- Tags editables igual que conceptos clave -->
          </div>
        </section>

        <!-- Sección: Visibilidad -->
        <section class="props-section">
          <h3 class="props-section-title">VISIBILIDAD</h3>
          <label class="prop-toggle-label">
            <input type="checkbox" id="propIsActive" class="prop-toggle-input" />
            <span class="prop-toggle-track" aria-hidden="true"></span>
            Visible en la presentación
          </label>
        </section>

        <!-- Acciones del slide -->
        <div class="props-actions">
          <button class="props-action-btn props-action-btn--danger" id="btnDeleteSlide" type="button">
            Eliminar slide
          </button>
        </div>

      </div>
    </aside>

  </div><!-- /editor-layout -->

  <!-- ── MODAL CONFIRMAR ELIMINACIÓN ──────────────────────── -->
  <div class="modal-overlay" id="deleteModal" hidden role="dialog" aria-modal="true" aria-labelledby="deleteModalTitle">
    <div class="modal-box">
      <h2 id="deleteModalTitle">¿Eliminar este slide?</h2>
      <p>Esta acción no se puede deshacer.</p>
      <div class="modal-actions">
        <button class="modal-btn modal-btn--ghost" id="deleteCancel" type="button">Cancelar</button>
        <button class="modal-btn modal-btn--danger" id="deleteConfirm" type="button">Eliminar</button>
      </div>
    </div>
  </div>

  <script src="/scripts/dataller-editor.js" type="module"></script>
</body>
```

---

## EDITOR JS — public/scripts/dataller-editor.js

### Arquitectura del script

```javascript
/**
 * DATALLER EDITOR ENGINE
 * Vanilla JS · Canvas API · Web Audio API · Fetch API
 * Autosave con debounce a /api/admin/slides/:id
 */

// ── ESTADO ──────────────────────────────────────────────────────────────────
const EDITOR = {
  slides: [],
  selectedId: null,
  isDirty: false,
  saveTimer: null,
  
  // Canvas
  canvas: null,
  ctx: null,
  animFrame: null,
  particles: [],
  animTime: 0,
  
  // Audio
  audioCtx: null,
  activeOscs: [],
  
  // Drag and drop
  dragSourceId: null,
};

// ── INIT ─────────────────────────────────────────────────────────────────────
async function init() {
  EDITOR.canvas = document.getElementById('previewCanvas');
  EDITOR.ctx = EDITOR.canvas.getContext('2d');
  
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
  
  await loadSlides();
  renderSidebarList();
  
  if (EDITOR.slides.length > 0) {
    selectSlide(EDITOR.slides[0].id);
  }
  
  startCanvasLoop();
  bindTopbar();
  bindSidebarActions();
  bindPropsPanel();
  bindCanvasToolbar();
}

// ── CARGAR SLIDES DESDE D1 ───────────────────────────────────────────────────
async function loadSlides() {
  const res = await fetch('/api/admin/slides?presentacion=dataller-2026');
  const data = await res.json();
  EDITOR.slides = data.slides;
}

// ── SELECCIONAR SLIDE ────────────────────────────────────────────────────────
function selectSlide(id) {
  EDITOR.selectedId = id;
  const slide = getSelectedSlide();
  if (!slide) return;
  
  // Actualizar sidebar
  document.querySelectorAll('.slide-item').forEach(el => {
    el.classList.toggle('is-selected', el.dataset.slideId === id);
    el.setAttribute('aria-selected', el.dataset.slideId === id ? 'true' : 'false');
  });
  
  // Actualizar canvas preview
  updateCanvasPreview(slide);
  
  // Rellenar properties panel
  fillPropsPanel(slide);
}

function getSelectedSlide() {
  return EDITOR.slides.find(s => s.id === EDITOR.selectedId) ?? null;
}

// ── PROPERTIES PANEL ──────────────────────────────────────────────────────────
function fillPropsPanel(slide) {
  // Campos de texto simples
  document.getElementById('propTag').value       = slide.tag ?? '';
  document.getElementById('propTitulo').value    = slide.titulo ?? '';
  document.getElementById('propSubtitulo').value = slide.subtitulo ?? '';
  document.getElementById('propDuracion').value  = slide.duracion ?? 10;
  document.getElementById('propCuerpo').value    = slide.cuerpo ?? '';
  document.getElementById('propNotas').value     = slide.notas ?? '';
  document.getElementById('propCodigo').value    = slide.codigoDemo ?? '';
  document.getElementById('propIsActive').checked = slide.isActive;
  document.getElementById('propSpeed').value     = slide.particleSpeed ?? 0.04;
  document.getElementById('speedDisplay').textContent = slide.particleSpeed ?? 0.04;
  
  // Estado de partículas
  renderParticleStateGrid(slide.particleState);
  
  // Color de acento
  renderAccentColorRow(slide.accentColor);
  
  // Tags editables (conceptos y palabras clave)
  renderTagsEditor('conceptsEditor', slide.conceptosClave, 'conceptosClave');
  renderTagsEditor('commandWordsEditor', slide.commandWords, 'commandWords');
  
  // Acorde de audio
  renderChordEditor(slide.chord);
  
  // Referencias
  renderRefsEditor(slide.referencias);
}

// ── PARTICLE STATE GRID ────────────────────────────────────────────────────────
const PARTICLE_STATES = [
  { id: 'chaos',    label: 'Caos',      icon: '⬡' },
  { id: 'flow',     label: 'Flujo',     icon: '→' },
  { id: 'cluster',  label: 'Clusters',  icon: '◉' },
  { id: 'network',  label: 'Red',       icon: '⊞' },
  { id: 'helix',    label: 'Hélice',    icon: '∫' },
  { id: 'grid',     label: 'Cuadrícula',icon: '▦' },
  { id: 'pulse',    label: 'Pulso',     icon: '◎' },
  { id: 'orbit',    label: 'Órbita',    icon: '○' },
  { id: 'collapse', label: 'Colapso',   icon: '⊙' },
  { id: 'expand',   label: 'Expansión', icon: '✦' },
];

function renderParticleStateGrid(currentState) {
  const grid = document.getElementById('particleStateGrid');
  grid.innerHTML = '';
  
  PARTICLE_STATES.forEach(({ id, label, icon }) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `particle-state-btn ${id === currentState ? 'is-active' : ''}`;
    btn.setAttribute('role', 'radio');
    btn.setAttribute('aria-checked', id === currentState ? 'true' : 'false');
    btn.setAttribute('aria-label', label);
    btn.dataset.state = id;
    btn.innerHTML = `<span class="state-icon" aria-hidden="true">${icon}</span><span class="state-label">${label}</span>`;
    
    btn.addEventListener('click', () => {
      setSlideField('particleState', id);
      renderParticleStateGrid(id);
    });
    
    grid.appendChild(btn);
  });
}

// ── ACCENT COLOR ROW ────────────────────────────────────────────────────────
const ACCENT_COLORS = [
  { id: 'primary', label: 'Verde',    hex: '#6DA300' },
  { id: 'alert',   label: 'Rojo',     hex: '#A63437' },
  { id: 'sage',    label: 'Salvia',   hex: '#8EA676' },
  { id: 'light',   label: 'Crema',    hex: '#EAEBE6' },
  { id: 'amber',   label: 'Ámbar',    hex: '#D4A017' },
];

function renderAccentColorRow(currentColor) {
  const row = document.getElementById('accentColorRow');
  row.innerHTML = '';
  
  ACCENT_COLORS.forEach(({ id, label, hex }) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `accent-color-btn ${id === currentColor ? 'is-active' : ''}`;
    btn.setAttribute('role', 'radio');
    btn.setAttribute('aria-checked', id === currentColor ? 'true' : 'false');
    btn.setAttribute('aria-label', label);
    btn.style.setProperty('--accent-hex', hex);
    btn.dataset.color = id;
    
    btn.addEventListener('click', () => {
      setSlideField('accentColor', id);
      renderAccentColorRow(id);
    });
    
    row.appendChild(btn);
  });
}

// ── TAGS EDITOR (conceptos y palabras clave) ────────────────────────────────
function renderTagsEditor(containerId, tags, fieldKey) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  
  tags.forEach((tag, i) => {
    const pill = document.createElement('div');
    pill.className = 'tag-pill';
    
    const text = document.createElement('span');
    text.className = 'tag-pill-text';
    text.contentEditable = 'true';
    text.textContent = tag;
    text.setAttribute('aria-label', `Editar: ${tag}`);
    
    text.addEventListener('blur', () => {
      const newTags = [...tags];
      newTags[i] = text.textContent.trim();
      setSlideField(fieldKey, newTags.filter(Boolean));
    });
    
    text.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); text.blur(); }
    });
    
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'tag-pill-remove';
    removeBtn.textContent = '×';
    removeBtn.setAttribute('aria-label', `Eliminar: ${tag}`);
    removeBtn.addEventListener('click', () => {
      const newTags = tags.filter((_, idx) => idx !== i);
      setSlideField(fieldKey, newTags);
      renderTagsEditor(containerId, newTags, fieldKey);
    });
    
    pill.appendChild(text);
    pill.appendChild(removeBtn);
    container.appendChild(pill);
  });
  
  // Input para agregar nuevo
  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.className = 'tag-add-btn';
  addBtn.textContent = '+ agregar';
  addBtn.addEventListener('click', () => {
    const newTag = prompt('Nuevo elemento:');
    if (newTag?.trim()) {
      const newTags = [...tags, newTag.trim()];
      setSlideField(fieldKey, newTags);
      renderTagsEditor(containerId, newTags, fieldKey);
    }
  });
  container.appendChild(addBtn);
}

// ── CHORD EDITOR ─────────────────────────────────────────────────────────────
function renderChordEditor(chord) {
  const container = document.getElementById('chordEditor');
  container.innerHTML = '';
  
  chord.forEach((freq, i) => {
    const row = document.createElement('div');
    row.className = 'chord-freq-row';
    
    const input = document.createElement('input');
    input.type = 'number';
    input.className = 'chord-freq-input';
    input.value = freq;
    input.min = 40;
    input.max = 2000;
    input.step = 0.5;
    input.setAttribute('aria-label', `Frecuencia ${i + 1} en Hz`);
    
    input.addEventListener('change', () => {
      const newChord = [...chord];
      newChord[i] = parseFloat(input.value);
      setSlideField('chord', newChord);
    });
    
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'chord-remove-btn';
    removeBtn.textContent = '×';
    removeBtn.setAttribute('aria-label', `Eliminar frecuencia ${freq}Hz`);
    removeBtn.addEventListener('click', () => {
      const newChord = chord.filter((_, idx) => idx !== i);
      setSlideField('chord', newChord);
      renderChordEditor(newChord);
    });
    
    row.appendChild(input);
    row.appendChild(removeBtn);
    container.appendChild(row);
  });
  
  // Botones de acción del acorde
  const actions = document.createElement('div');
  actions.className = 'chord-actions';
  
  const addFreqBtn = document.createElement('button');
  addFreqBtn.type = 'button';
  addFreqBtn.className = 'chord-action-btn';
  addFreqBtn.textContent = '+ frecuencia';
  addFreqBtn.addEventListener('click', () => {
    const newChord = [...chord, 261.63];
    setSlideField('chord', newChord);
    renderChordEditor(newChord);
  });
  
  const playBtn = document.createElement('button');
  playBtn.type = 'button';
  playBtn.className = 'chord-action-btn chord-action-btn--play';
  playBtn.textContent = '▶ escuchar';
  playBtn.addEventListener('click', () => previewChord(chord));
  
  actions.appendChild(addFreqBtn);
  actions.appendChild(playBtn);
  container.appendChild(actions);
}

// ── REFERENCIAS EDITOR ────────────────────────────────────────────────────────
function renderRefsEditor(refs) {
  const container = document.getElementById('refsEditor');
  container.innerHTML = '';
  
  refs.forEach((ref, i) => {
    const item = document.createElement('div');
    item.className = 'ref-edit-item';
    
    item.innerHTML = `
      <div class="ref-edit-header">
        <select class="ref-tipo-select" data-idx="${i}" aria-label="Tipo de referencia">
          ${['paper','libro','herramienta','informe','repo'].map(t =>
            `<option value="${t}" ${ref.tipo === t ? 'selected' : ''}>${t}</option>`
          ).join('')}
        </select>
        <button type="button" class="ref-remove-btn" data-idx="${i}" aria-label="Eliminar referencia">×</button>
      </div>
      <input type="text" class="prop-input ref-field" data-idx="${i}" data-field="titulo" value="${ref.titulo}" placeholder="Título" />
      <input type="text" class="prop-input ref-field" data-idx="${i}" data-field="fuente" value="${ref.fuente}" placeholder="Fuente / autor" />
      <input type="text" class="prop-input ref-field ref-field--short" data-idx="${i}" data-field="anio" value="${ref.anio}" placeholder="Año" />
      <input type="url"  class="prop-input ref-field" data-idx="${i}" data-field="url"   value="${ref.url}"  placeholder="https://..." />
    `;
    
    // Bind eventos
    item.querySelectorAll('.ref-field').forEach(field => {
      field.addEventListener('blur', () => {
        const newRefs = [...refs];
        newRefs[parseInt(field.dataset.idx)][field.dataset.field] = field.value;
        setSlideField('referencias', newRefs);
      });
    });
    
    item.querySelector('.ref-tipo-select').addEventListener('change', (e) => {
      const newRefs = [...refs];
      newRefs[i].tipo = e.target.value;
      setSlideField('referencias', newRefs);
    });
    
    item.querySelector('.ref-remove-btn').addEventListener('click', () => {
      const newRefs = refs.filter((_, idx) => idx !== i);
      setSlideField('referencias', newRefs);
      renderRefsEditor(newRefs);
    });
    
    container.appendChild(item);
  });
  
  const addRefBtn = document.createElement('button');
  addRefBtn.type = 'button';
  addRefBtn.className = 'refs-add-btn';
  addRefBtn.textContent = '+ agregar referencia';
  addRefBtn.addEventListener('click', () => {
    const newRefs = [
      ...refs,
      { titulo: '', fuente: '', anio: new Date().getFullYear().toString(), url: '', tipo: 'informe' }
    ];
    setSlideField('referencias', newRefs);
    renderRefsEditor(newRefs);
  });
  container.appendChild(addRefBtn);
}

// ── ACTUALIZAR CAMPO CON AUTOSAVE ─────────────────────────────────────────────
function setSlideField(field, value) {
  const slide = getSelectedSlide();
  if (!slide) return;
  
  slide[field] = value;
  EDITOR.isDirty = true;
  
  // Actualizar preview inmediatamente
  updateCanvasPreview(slide);
  
  // Autosave con debounce de 800ms
  clearTimeout(EDITOR.saveTimer);
  document.getElementById('saveStatus').textContent = 'Guardando...';
  
  EDITOR.saveTimer = setTimeout(() => saveSlide(slide), 800);
}

// ── GUARDAR EN D1 ────────────────────────────────────────────────────────────
async function saveSlide(slide) {
  try {
    const patch = {
      tag:            slide.tag,
      titulo:         slide.titulo,
      subtitulo:      slide.subtitulo,
      cuerpo:         slide.cuerpo,
      notas:          slide.notas,
      duracion:       slide.duracion,
      particle_state: slide.particleState,
      accent_color:   slide.accentColor,
      particle_speed: slide.particleSpeed,
      is_active:      slide.isActive ? 1 : 0,
      codigo_demo:    slide.codigoDemo,
      // Arrays → JSON strings (el endpoint los serializa)
      chord:          slide.chord,
      commandWords:   slide.commandWords,
      referencias:    slide.referencias,
      conceptosClave: slide.conceptosClave,
    };
    
    const res = await fetch(`/api/admin/slides/${slide.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    
    if (res.ok) {
      EDITOR.isDirty = false;
      document.getElementById('saveStatus').textContent = 'Guardado ✓';
    } else {
      document.getElementById('saveStatus').textContent = 'Error al guardar ✗';
    }
  } catch {
    document.getElementById('saveStatus').textContent = 'Sin conexión ✗';
  }
}

// ── DRAG AND DROP PARA REORDENAR ──────────────────────────────────────────────
function bindDragAndDrop() {
  // Usar la API nativa de Drag and Drop sobre los items del sidebar
  // Con Touch Events fallback para móvil
  
  // El patrón: dragstart guarda el ID, dragover permite el drop,
  // drop calcula el nuevo orden y llama a /api/admin/slides/reorder
  
  document.getElementById('slidesList').addEventListener('dragstart', (e) => {
    const item = e.target.closest('.slide-item');
    if (!item) return;
    EDITOR.dragSourceId = item.dataset.slideId;
    item.classList.add('is-dragging');
    e.dataTransfer.effectAllowed = 'move';
  });
  
  document.getElementById('slidesList').addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const item = e.target.closest('.slide-item');
    if (item && item.dataset.slideId !== EDITOR.dragSourceId) {
      item.classList.add('drag-over');
    }
  });
  
  document.getElementById('slidesList').addEventListener('dragleave', (e) => {
    e.target.closest('.slide-item')?.classList.remove('drag-over');
  });
  
  document.getElementById('slidesList').addEventListener('drop', async (e) => {
    e.preventDefault();
    const targetItem = e.target.closest('.slide-item');
    if (!targetItem || targetItem.dataset.slideId === EDITOR.dragSourceId) return;
    
    // Reordenar el array local
    const sourceIdx = EDITOR.slides.findIndex(s => s.id === EDITOR.dragSourceId);
    const targetIdx = EDITOR.slides.findIndex(s => s.id === targetItem.dataset.slideId);
    
    const [moved] = EDITOR.slides.splice(sourceIdx, 1);
    EDITOR.slides.splice(targetIdx, 0, moved);
    
    // Reasignar números
    EDITOR.slides.forEach((s, i) => { s.numero = i + 1; });
    
    // Persistir en D1
    await fetch('/api/admin/slides/reorder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        updates: EDITOR.slides.map(s => ({ id: s.id, numero: s.numero }))
      }),
    });
    
    renderSidebarList();
    document.querySelectorAll('.drag-over, .is-dragging')
      .forEach(el => el.classList.remove('drag-over', 'is-dragging'));
  });
}

// ── PREVIEW CHORD ────────────────────────────────────────────────────────────
function previewChord(freqs) {
  if (!EDITOR.audioCtx) {
    EDITOR.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  const t = EDITOR.audioCtx.currentTime;
  
  freqs.forEach((freq) => {
    const osc = EDITOR.audioCtx.createOscillator();
    const gain = EDITOR.audioCtx.createGain();
    osc.frequency.value = freq;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.1, t + 0.3);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 2.5);
    osc.connect(gain);
    gain.connect(EDITOR.audioCtx.destination);
    osc.start(t);
    osc.stop(t + 2.6);
  });
}

// ── CANVAS PREVIEW (mini engine) ─────────────────────────────────────────────
// El editor tiene su propio mini canvas engine — idéntico al presenter
// pero más ligero: 400 partículas en lugar de 800, sin audio reactivo
// (el audio se simula con un valor estático de micEnergy = 30)

function resizeCanvas() {
  const wrapper = document.querySelector('.canvas-wrapper');
  EDITOR.canvas.width  = wrapper.clientWidth;
  EDITOR.canvas.height = wrapper.clientHeight;
}

function updateCanvasPreview(slide) {
  // Actualizar HUD del preview
  const num = String(slide.numero).padStart(2, '0');
  document.getElementById('prevNumero').textContent  = num;
  document.getElementById('prevTag').textContent     = slide.tag;
  document.getElementById('prevTitulo').textContent  = slide.titulo;
  document.getElementById('prevSubtitulo').textContent = slide.subtitulo ?? '';
  document.getElementById('prevCuerpo').textContent  = slide.cuerpo;
  
  // Actualizar pills de conceptos en el preview
  const concepts = document.getElementById('prevConcepts');
  concepts.innerHTML = slide.conceptosClave
    .map(c => `<span class="preview-concept-pill">${c}</span>`)
    .join('');
  
  // Cambiar estado de partículas
  EDITOR.currentParticleState = slide.particleState;
  EDITOR.currentAccentColor   = slide.accentColor;
}

// ── AGREGAR SLIDE NUEVO ───────────────────────────────────────────────────────
async function addNewSlide() {
  const res = await fetch('/api/admin/slides', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      presentacion: 'dataller-2026',
      numero: EDITOR.slides.length + 1,
      titulo: 'Nuevo slide',
      tag: 'NUEVO',
      cuerpo: '',
    }),
  });
  
  const data = await res.json();
  await loadSlides();
  renderSidebarList();
  selectSlide(data.id);
}

// ── ELIMINAR SLIDE ────────────────────────────────────────────────────────────
let pendingDeleteId = null;

function showDeleteModal(id) {
  pendingDeleteId = id;
  document.getElementById('deleteModal').hidden = false;
  document.getElementById('deleteConfirm').focus();
}

document.getElementById('deleteCancel').addEventListener('click', () => {
  document.getElementById('deleteModal').hidden = true;
  pendingDeleteId = null;
});

document.getElementById('deleteConfirm').addEventListener('click', async () => {
  if (!pendingDeleteId) return;
  await fetch(`/api/admin/slides/${pendingDeleteId}`, { method: 'DELETE' });
  document.getElementById('deleteModal').hidden = true;
  await loadSlides();
  renderSidebarList();
  if (EDITOR.slides.length > 0) selectSlide(EDITOR.slides[0].id);
  pendingDeleteId = null;
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !document.getElementById('deleteModal').hidden) {
    document.getElementById('deleteModal').hidden = true;
    pendingDeleteId = null;
  }
});

// ── INIT ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', init);
```

---

## VARIABLES DE ENTORNO — wrangler.jsonc

Agregar al bloque `[vars]`:

```jsonc
{
  "name": "datadrivenday",
  "compatibility_date": "2024-11-01",
  "kv_namespaces": [
    { "binding": "APP_SESSION", "id": "REEMPLAZAR" }
  ],
  "d1_databases": [
    { "binding": "DB", "database_id": "REEMPLAZAR" }
  ],
  "r2_buckets": [
    { "binding": "MEDIA", "bucket_name": "datadrivenday-assets" }
  ],
  "vars": {
    "ADMIN_USER": "presentador",
    "ADMIN_PASS_HASH": "REEMPLAZAR_CON_HASH_SHA256",
    "PRESENT_TOKEN": "dataller2026"
  }
}
```

---

## CSS DEL EDITOR — agregar a global.css o editor.css

```css
/* ── LAYOUT ─────────────────────────────────────── */
.editor-body {
  background: var(--color-bg);
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  font-family: var(--font-mono);
}

.editor-topbar {
  height: 48px;
  border-bottom: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--space-md);
  background: var(--color-surface);
  flex-shrink: 0;
}

.editor-layout {
  flex: 1;
  display: grid;
  grid-template-columns: 240px 1fr 320px;
  overflow: hidden;
}

/* ── SIDEBAR ─────────────────────────────────────── */
.editor-sidebar {
  border-right: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--color-surface);
}

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-sm) var(--space-md);
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.slides-list {
  flex: 1;
  overflow-y: auto;
  list-style: none;
  padding: var(--space-xs) 0;
}

.slide-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px var(--space-sm);
  cursor: pointer;
  border-left: 2px solid transparent;
  transition: background-color 150ms, border-color 150ms;
}

.slide-item:hover { background: color-mix(in srgb, var(--color-accent-amber) 8%, transparent); }
.slide-item.is-selected {
  background: color-mix(in srgb, var(--color-accent-amber) 12%, transparent);
  border-left-color: var(--color-accent-amber);
}

.slide-item.is-dragging { opacity: 0.4; }
.slide-item.drag-over   { background: color-mix(in srgb, var(--color-accent-go) 15%, transparent); }

.slide-item-drag {
  color: var(--color-text-muted);
  cursor: grab;
  font-size: 1rem;
  flex-shrink: 0;
}

.slide-item-info {
  flex: 1;
  min-width: 0;
}

.slide-item-num {
  font-size: 0.6rem;
  color: var(--color-text-muted);
  letter-spacing: 0.1em;
  display: block;
}

.slide-item-titulo {
  font-size: 0.78rem;
  color: var(--color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: block;
}

.slide-item-tag {
  font-size: 0.62rem;
  color: var(--color-text-muted);
  display: block;
}

.slide-item-state-dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: var(--color-accent-go);
  flex-shrink: 0;
}

/* ── CANVAS AREA ─────────────────────────────────── */
.editor-canvas-area {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
  background: #1a1a1a;
}

.canvas-wrapper {
  flex: 1;
  position: relative;
  overflow: hidden;
}

#previewCanvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.canvas-hud {
  position: absolute;
  top: 8%;
  left: 6%;
  z-index: 10;
  max-width: 60%;
  pointer-events: none;
  color: #EAEBE6;
}

.preview-meta {
  font-size: 0.65rem;
  color: #8EA676;
  letter-spacing: 0.1em;
  margin-bottom: 8px;
  display: flex;
  gap: 8px;
}

.canvas-hud h2 {
  font-size: clamp(1.2rem, 3vw, 2.2rem);
  font-weight: 700;
  line-height: 1.05;
  color: #EAEBE6;
}

.canvas-concepts {
  position: absolute;
  bottom: 12%;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  justify-content: center;
  z-index: 10;
  pointer-events: none;
}

.preview-concept-pill {
  font-size: 0.6rem;
  letter-spacing: 0.08em;
  padding: 2px 8px;
  border: 1px solid rgba(109, 163, 0, 0.35);
  color: rgba(142, 166, 118, 0.7);
  border-radius: 2px;
  background: rgba(0, 0, 0, 0.25);
}

.canvas-toolbar {
  height: 40px;
  background: var(--color-surface);
  border-top: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0 var(--space-sm);
  flex-shrink: 0;
}

.canvas-tool {
  background: transparent;
  border: 1px solid var(--color-border);
  color: var(--color-text-muted);
  font-size: 0.75rem;
  padding: 4px 10px;
  cursor: pointer;
  font-family: var(--font-mono);
  transition: color 150ms, border-color 150ms;
  border-radius: 2px;
}

.canvas-tool:hover { color: var(--color-text-primary); border-color: var(--color-text-muted); }
.canvas-tool[aria-pressed="true"] { color: var(--color-accent-amber); border-color: var(--color-accent-amber); }
.canvas-tool-divider { width: 1px; height: 20px; background: var(--color-border); margin: 0 4px; }

/* ── PROPERTIES PANEL ────────────────────────────── */
.editor-props {
  border-left: 1px solid var(--color-border);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: var(--color-surface);
}

.props-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 0 0 var(--space-lg) 0;
}

.props-section {
  padding: var(--space-md);
  border-bottom: 1px solid var(--color-border);
}

.props-section-title {
  font-size: 0.6rem;
  letter-spacing: 0.15em;
  color: var(--color-text-muted);
  margin-bottom: var(--space-sm);
}

.prop-field { margin-bottom: var(--space-sm); }

.prop-label {
  display: block;
  font-size: 0.7rem;
  color: var(--color-text-muted);
  margin-bottom: 4px;
  letter-spacing: 0.04em;
}

.prop-optional {
  font-size: 0.65rem;
  opacity: 0.6;
}

.prop-input {
  width: 100%;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  color: var(--color-text-primary);
  font-family: var(--font-mono);
  font-size: 0.78rem;
  padding: 6px 8px;
  border-radius: 2px;
  transition: border-color 150ms;
}

.prop-input:focus {
  outline: none;
  border-color: var(--color-accent-amber);
}

.prop-input--large { font-size: 0.88rem; font-weight: 700; }
.prop-input--short { width: 80px; }

.prop-textarea {
  width: 100%;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  color: var(--color-text-primary);
  font-family: var(--font-mono);
  font-size: 0.75rem;
  padding: 8px;
  border-radius: 2px;
  resize: vertical;
  line-height: 1.5;
}

.prop-textarea--code {
  font-size: 0.7rem;
  line-height: 1.6;
  min-height: 160px;
}

.prop-textarea--notes {
  border-color: rgba(166, 52, 55, 0.3);
}

.prop-textarea--notes:focus {
  border-color: #A63437;
}

/* Particle state grid */
.particle-state-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 4px;
}

.particle-state-btn {
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  color: var(--color-text-muted);
  font-family: var(--font-mono);
  font-size: 0.62rem;
  padding: 6px 4px;
  cursor: pointer;
  border-radius: 2px;
  text-align: center;
  transition: all 150ms;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.particle-state-btn:hover { border-color: var(--color-text-muted); color: var(--color-text-primary); }
.particle-state-btn.is-active {
  background: color-mix(in srgb, var(--color-accent-go) 15%, transparent);
  border-color: var(--color-accent-go);
  color: var(--color-accent-go);
}

.state-icon { font-size: 1rem; }
.state-label { font-size: 0.55rem; letter-spacing: 0.04em; }

/* Accent color row */
.accent-color-row {
  display: flex;
  gap: 8px;
}

.accent-color-btn {
  width: 28px; height: 28px;
  border-radius: 50%;
  border: 2px solid transparent;
  background: var(--accent-hex);
  cursor: pointer;
  transition: border-color 150ms, transform 150ms;
}

.accent-color-btn:hover { transform: scale(1.1); }
.accent-color-btn.is-active { border-color: var(--color-text-primary); transform: scale(1.15); }

/* Tags editor */
.tags-editor {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
}

.tag-pill {
  display: flex;
  align-items: center;
  background: color-mix(in srgb, var(--color-accent-go) 12%, transparent);
  border: 1px solid rgba(109, 163, 0, 0.3);
  border-radius: 2px;
  padding: 2px 4px 2px 8px;
  font-size: 0.68rem;
  color: var(--color-text-primary);
}

.tag-pill-text { outline: none; min-width: 20px; }
.tag-pill-remove {
  background: none;
  border: none;
  color: var(--color-text-muted);
  cursor: pointer;
  padding: 0 2px 0 4px;
  font-size: 1rem;
  line-height: 1;
}

.tag-add-btn {
  background: transparent;
  border: 1px dashed var(--color-border);
  color: var(--color-text-muted);
  font-family: var(--font-mono);
  font-size: 0.65rem;
  padding: 3px 8px;
  cursor: pointer;
  border-radius: 2px;
  transition: border-color 150ms, color 150ms;
}

.tag-add-btn:hover { border-color: var(--color-accent-go); color: var(--color-accent-go); }

/* Chord editor */
.chord-freq-row {
  display: flex;
  gap: 4px;
  margin-bottom: 4px;
}

.chord-freq-input {
  flex: 1;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  color: var(--color-text-primary);
  font-family: var(--font-mono);
  font-size: 0.75rem;
  padding: 5px 8px;
  border-radius: 2px;
}

.chord-actions { display: flex; gap: 6px; margin-top: 8px; }

.chord-action-btn {
  background: transparent;
  border: 1px solid var(--color-border);
  color: var(--color-text-muted);
  font-family: var(--font-mono);
  font-size: 0.65rem;
  padding: 4px 10px;
  cursor: pointer;
  border-radius: 2px;
  transition: all 150ms;
}

.chord-action-btn--play { border-color: var(--color-accent-go); color: var(--color-accent-go); }
.chord-action-btn--play:hover { background: color-mix(in srgb, var(--color-accent-go) 12%, transparent); }

/* References editor */
.ref-edit-item {
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  padding: var(--space-sm);
  margin-bottom: 8px;
  border-radius: 2px;
}

.ref-edit-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.ref-tipo-select {
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  color: var(--color-text-muted);
  font-family: var(--font-mono);
  font-size: 0.65rem;
  padding: 2px 6px;
  border-radius: 2px;
}

.refs-add-btn {
  width: 100%;
  background: transparent;
  border: 1px dashed var(--color-border);
  color: var(--color-text-muted);
  font-family: var(--font-mono);
  font-size: 0.72rem;
  padding: 8px;
  cursor: pointer;
  border-radius: 2px;
  transition: all 150ms;
}

.refs-add-btn:hover { border-color: var(--color-accent-amber); color: var(--color-accent-amber); }

/* Toggle */
.prop-toggle-label {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  font-size: 0.78rem;
  color: var(--color-text-primary);
  user-select: none;
}

.prop-toggle-input { display: none; }

.prop-toggle-track {
  width: 36px; height: 20px;
  background: var(--color-border);
  border-radius: 10px;
  position: relative;
  transition: background 200ms;
}

.prop-toggle-track::after {
  content: '';
  position: absolute;
  top: 2px; left: 2px;
  width: 16px; height: 16px;
  background: white;
  border-radius: 50%;
  transition: transform 200ms;
}

.prop-toggle-input:checked + .prop-toggle-track {
  background: var(--color-accent-go);
}

.prop-toggle-input:checked + .prop-toggle-track::after {
  transform: translateX(16px);
}

/* Range */
.prop-range { width: 100%; }

.prop-value-display {
  font-family: var(--font-mono);
  font-size: 0.7rem;
  color: var(--color-accent-amber);
  float: right;
}

/* Modal */
.modal-overlay {
  position: fixed; inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex; align-items: center; justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(2px);
}

.modal-box {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  padding: var(--space-lg);
  max-width: 360px;
  width: 90%;
}

.modal-box h2 { font-size: 1rem; margin-bottom: var(--space-xs); }
.modal-box p  { font-size: 0.82rem; color: var(--color-text-muted); margin-bottom: var(--space-md); }

.modal-actions { display: flex; gap: var(--space-sm); justify-content: flex-end; }

.modal-btn {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  padding: 6px 16px;
  border: 1px solid;
  cursor: pointer;
  border-radius: 2px;
  background: transparent;
  transition: all 150ms;
}

.modal-btn--ghost { border-color: var(--color-border); color: var(--color-text-muted); }
.modal-btn--ghost:hover { border-color: var(--color-text-muted); color: var(--color-text-primary); }
.modal-btn--danger { border-color: var(--color-accent-heat); color: var(--color-accent-heat); }
.modal-btn--danger:hover { background: color-mix(in srgb, var(--color-accent-heat) 15%, transparent); }

/* Save status */
.topbar-status {
  font-size: 0.65rem;
  color: var(--color-text-muted);
  letter-spacing: 0.08em;
}

/* Topbar buttons */
.topbar-btn {
  font-family: var(--font-mono);
  font-size: 0.7rem;
  letter-spacing: 0.06em;
  padding: 5px 12px;
  border: 1px solid var(--color-border);
  background: transparent;
  color: var(--color-text-muted);
  cursor: pointer;
  text-decoration: none;
  border-radius: 2px;
  transition: all 150ms;
}

.topbar-btn:hover { color: var(--color-text-primary); border-color: var(--color-text-muted); }
.topbar-btn--primary { border-color: var(--color-accent-amber); color: var(--color-accent-amber); }
.topbar-btn--primary:hover { background: color-mix(in srgb, var(--color-accent-amber) 12%, transparent); }
.topbar-btn--danger { border-color: var(--color-accent-heat); color: var(--color-accent-heat); }

/* Login page */
.login-body {
  background: var(--color-bg);
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-mono);
}

.login-container { width: 100%; max-width: 360px; padding: var(--space-md); }

.login-header { text-align: center; margin-bottom: var(--space-lg); }
.login-brand { font-size: 0.65rem; letter-spacing: 0.2em; color: var(--color-text-muted); }
.login-title { font-size: 1.5rem; font-weight: 700; margin: 8px 0 4px; color: var(--color-text-primary); }
.login-sub   { font-size: 0.78rem; color: var(--color-text-muted); }

.login-form { display: flex; flex-direction: column; gap: var(--space-sm); }

.field-group { display: flex; flex-direction: column; gap: 4px; }
.field-label { font-size: 0.7rem; color: var(--color-text-muted); letter-spacing: 0.08em; }
.field-input {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  color: var(--color-text-primary);
  font-family: var(--font-mono);
  font-size: 0.9rem;
  padding: 10px 12px;
  border-radius: 2px;
  transition: border-color 150ms;
}

.field-input:focus { outline: none; border-color: var(--color-accent-amber); }

.login-btn {
  background: transparent;
  border: 1px solid var(--color-accent-amber);
  color: var(--color-accent-amber);
  font-family: var(--font-mono);
  font-size: 0.78rem;
  letter-spacing: 0.15em;
  padding: 10px;
  cursor: pointer;
  border-radius: 2px;
  margin-top: var(--space-xs);
  transition: all 200ms;
}

.login-btn:hover { background: color-mix(in srgb, var(--color-accent-amber) 12%, transparent); }
.login-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.login-error {
  background: color-mix(in srgb, var(--color-accent-heat) 12%, transparent);
  border: 1px solid var(--color-accent-heat);
  color: var(--color-accent-heat);
  font-size: 0.75rem;
  padding: 8px 12px;
  border-radius: 2px;
}

.login-alert {
  background: color-mix(in srgb, var(--color-accent-amber) 12%, transparent);
  border: 1px solid var(--color-accent-amber);
  color: var(--color-accent-amber);
  font-size: 0.75rem;
  padding: 8px 12px;
  margin-bottom: var(--space-md);
  border-radius: 2px;
}
```

---

## FLUJO COMPLETO

```
Presentador abre /admin/login
  ↓ ingresa credenciales
  ↓ POST /api/admin/login → Hono verifica contra env vars → crea sesión en KV
  ↓ redirect a /admin/editor
  ↓ GET /api/admin/slides → D1 → lista de slides
  ↓ Editor carga, selecciona primer slide
  ↓ Canvas animado arranca en mini modo (400 partículas, sin micrófono)
  ↓ Presentador edita campos → autosave con debounce 800ms → PATCH /api/admin/slides/:id → D1
  ↓ Drag to reorder → POST /api/admin/slides/reorder → D1
  ↓ Click "Abrir presenter" → /dataller/present?token=xxx
  ↓ Presenter mode carga desde GET /api/slides (público, solo activos)
  ↓ Canvas completo, micrófono, voz, audio reactivo
  ↓ Los asistentes abren /dataller → documento público estático desde D1
```

---

## CHECKLIST PARA COPILOT

- [ ] Crear `db/migrations/002_slides.sql` y ejecutar en local y prod
- [ ] Crear `src/lib/api/auth.ts` con createSession, getSession, requireAuth, handleLogin, handleLogout
- [ ] Crear `src/lib/server/db/slides.ts` con CRUD completo
- [ ] Agregar endpoints a `src/lib/api/app.ts`: login, logout, GET/POST/PATCH/DELETE/reorder slides
- [ ] Crear `src/pages/admin/login.astro`
- [ ] Crear `src/pages/admin/editor.astro` con el layout completo
- [ ] Crear `public/scripts/dataller-editor.js` con el engine del editor
- [ ] Actualizar `src/pages/dataller/present.astro` para cargar desde `/api/slides` en lugar de `site.ts`
- [ ] Agregar variables al `wrangler.jsonc`: ADMIN_USER, ADMIN_PASS_HASH, PRESENT_TOKEN
- [ ] Generar hash SHA-256 de la contraseña y agregarlo al env
- [ ] El editor JS NO usa React ni ningún framework — todo vanilla con el mismo patrón del engine principal
- [ ] El canvas del editor usa 400 partículas (no 800) para no saturar la CPU mientras se edita
- [ ] El autosave usa debounce de 800ms — no hacer fetch en cada keystroke
- [ ] El modal de confirmación de eliminación es accesible: role="dialog", aria-modal, focus trap, cierre con Escape
- [ ] El drag-and-drop usa la API nativa de HTML5, no librerías externas