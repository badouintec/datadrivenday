# Sistema de Administración — Data Driven Day 2026
## Login · CMS · Presentaciones · Blog · Registros · Recursos
### Stack: Astro 5 · Cloudflare Workers · Hono · D1 · KV · R2 · CSS custom properties · JS vanilla

---

## VISIÓN GENERAL

Un panel de administración que vive en `/admin` dentro del mismo sitio. No es un CMS externo, no es Sanity, no es Contentful. Es una interfaz propia construida con el mismo stack del sitio, que sirve para cuatro cosas concretas:

1. **Presentaciones** — crear, editar y publicar la presentación del Dataller (el engine que ya diseñamos)
2. **Blog** — editar entradas, crear nuevas, administrar borradores
3. **Registros** — ver quién se registró al evento, exportar lista, marcar asistencia
4. **Recursos** — agregar, editar y categorizar los recursos bibliográficos del sitio

Todo esto protegido por el mismo sistema de sesiones con KV que ya definimos, extendido con roles.

---

## ARQUITECTURA COMPLETA

```
src/
├── pages/
│   └── admin/
│       ├── login.astro              → Pantalla de acceso
│       ├── index.astro              → Dashboard (redirect según rol)
│       ├── presentaciones/
│       │   ├── index.astro          → Lista de presentaciones
│       │   └── [id].astro           → Editor de presentación (el engine)
│       ├── blog/
│       │   ├── index.astro          → Lista de entradas
│       │   └── [id].astro           → Editor de entrada individual
│       ├── registros/
│       │   └── index.astro          → Tabla de registros + export
│       └── recursos/
│           └── index.astro          → CRUD de recursos bibliográficos
│
├── components/
│   └── admin/
│       ├── AdminLayout.astro        → Shell: sidebar nav + topbar + main
│       ├── AdminSidebar.astro       → Navegación lateral del admin
│       ├── AdminTopbar.astro        → Header con nombre usuario + logout
│       ├── StatCard.astro           → Tarjeta de métrica para el dashboard
│       ├── DataTable.astro          → Tabla reutilizable con sort/filter
│       └── ConfirmModal.astro       → Modal de confirmación reutilizable
│
├── lib/
│   ├── api/
│   │   ├── app.ts                   → App Hono (ya existe, extender)
│   │   ├── auth.ts                  → Auth con roles (extender)
│   │   └── routes/
│   │       ├── admin-presentations.ts → CRUD presentaciones
│   │       ├── admin-blog.ts          → CRUD blog
│   │       ├── admin-registros.ts     → Read + export registros
│   │       └── admin-recursos.ts      → CRUD recursos
│   └── server/
│       └── db/
│           ├── submissions.ts       → Ya existe
│           ├── slides.ts            → Ya existe
│           ├── blog.ts              → Nuevo
│           └── recursos.ts          → Nuevo
│
└── db/
    └── migrations/
        ├── 001_submissions.sql      → Ya existe
        ├── 002_slides.sql           → Ya existe
        ├── 003_blog.sql             → Nuevo
        └── 004_recursos.sql         → Nuevo
```

---

## BASE DE DATOS — Migraciones nuevas

### 003_blog.sql

```sql
CREATE TABLE IF NOT EXISTS blog_posts (
  id           TEXT PRIMARY KEY,
  slug         TEXT NOT NULL UNIQUE,
  titulo       TEXT NOT NULL,
  subtitulo    TEXT,
  cuerpo_md    TEXT NOT NULL DEFAULT '',   -- Markdown
  extracto     TEXT,                        -- Resumen para listados
  imagen_url   TEXT,                        -- URL en R2
  autor        TEXT NOT NULL DEFAULT 'Data Driven Day',
  tags_json    TEXT NOT NULL DEFAULT '[]',  -- JSON array de strings
  estado       TEXT NOT NULL DEFAULT 'borrador', -- borrador | publicado | archivado
  publicado_en TEXT,                        -- ISO 8601, null si es borrador
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_blog_estado
  ON blog_posts(estado, publicado_en DESC);

CREATE INDEX IF NOT EXISTS idx_blog_slug
  ON blog_posts(slug);

CREATE TRIGGER IF NOT EXISTS blog_updated_at
  AFTER UPDATE ON blog_posts
  BEGIN
    UPDATE blog_posts SET updated_at = datetime('now') WHERE id = NEW.id;
  END;
```

### 004_recursos.sql

```sql
CREATE TABLE IF NOT EXISTS recursos (
  id           TEXT PRIMARY KEY,
  titulo       TEXT NOT NULL,
  fuente       TEXT NOT NULL,              -- Autor/organización
  anio         TEXT NOT NULL,
  url          TEXT NOT NULL,
  tipo         TEXT NOT NULL DEFAULT 'informe', -- paper|libro|herramienta|informe|repo
  categoria    TEXT NOT NULL DEFAULT 'tecnologia', -- gobernanza|tecnologia|sonora|ciudad
  descripcion  TEXT,
  is_featured  INTEGER NOT NULL DEFAULT 0, -- 1 = aparece destacado en el sitio
  is_active    INTEGER NOT NULL DEFAULT 1,
  orden        INTEGER NOT NULL DEFAULT 0, -- orden en el listado público
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_recursos_categoria
  ON recursos(categoria, orden ASC);

CREATE TRIGGER IF NOT EXISTS recursos_updated_at
  AFTER UPDATE ON recursos
  BEGIN
    UPDATE recursos SET updated_at = datetime('now') WHERE id = NEW.id;
  END;
```

### Tabla de roles para usuarios admin

```sql
-- Agregar a 002_slides.sql o crear 005_admin_users.sql

CREATE TABLE IF NOT EXISTS admin_users (
  id           TEXT PRIMARY KEY,
  username     TEXT NOT NULL UNIQUE,
  pass_hash    TEXT NOT NULL,             -- SHA-256 hex
  rol          TEXT NOT NULL DEFAULT 'editor', -- superadmin | editor | viewer
  nombre       TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  last_login   TEXT
);

-- Usuario inicial — se inserta via script, no hardcodeado en vars
-- Ver sección "Seeding" más abajo
```

---

## AUTH EXTENDIDO CON ROLES — src/lib/api/auth.ts

Extender el auth existente para soportar múltiples usuarios con roles desde D1 en lugar de variables de entorno hardcodeadas.

```typescript
export type AdminRol = 'superadmin' | 'editor' | 'viewer';

export interface AdminUser {
  id: string;
  username: string;
  rol: AdminRol;
  nombre: string | null;
}

// ── PERMISOS POR ROL ────────────────────────────────────────────────────────
const PERMISSIONS: Record<AdminRol, string[]> = {
  superadmin: [
    'presentations:read', 'presentations:write', 'presentations:delete',
    'blog:read', 'blog:write', 'blog:delete', 'blog:publish',
    'registros:read', 'registros:export',
    'recursos:read', 'recursos:write', 'recursos:delete',
    'users:read', 'users:write',
  ],
  editor: [
    'presentations:read', 'presentations:write',
    'blog:read', 'blog:write', 'blog:publish',
    'registros:read',
    'recursos:read', 'recursos:write',
  ],
  viewer: [
    'presentations:read',
    'blog:read',
    'registros:read',
    'recursos:read',
  ],
};

export function can(user: AdminUser, permission: string): boolean {
  return PERMISSIONS[user.rol]?.includes(permission) ?? false;
}

// ── VERIFICAR CREDENCIALES DESDE D1 ────────────────────────────────────────
export async function verifyCredentials(
  db: D1Database,
  username: string,
  password: string
): Promise<AdminUser | null> {
  const hash = await sha256(password);

  const row = await db
    .prepare(
      `SELECT id, username, rol, nombre FROM admin_users
       WHERE username = ? AND pass_hash = ?`
    )
    .bind(username.toLowerCase().trim(), hash)
    .first<{ id: string; username: string; rol: AdminRol; nombre: string | null }>();

  if (!row) return null;

  // Actualizar last_login
  await db
    .prepare('UPDATE admin_users SET last_login = datetime("now") WHERE id = ?')
    .bind(row.id)
    .run();

  return row;
}

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// ── CREAR SESIÓN CON DATOS DE USUARIO ──────────────────────────────────────
export async function createSession(
  kv: KVNamespace,
  user: AdminUser
): Promise<string> {
  const sessionId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 8 * 3600 * 1000).toISOString();

  await kv.put(
    `session:${sessionId}`,
    JSON.stringify({ ...user, expiresAt }),
    { expirationTtl: 8 * 3600 }
  );

  return sessionId;
}

// ── LEER SESIÓN ─────────────────────────────────────────────────────────────
export async function getSession(
  kv: KVNamespace,
  sessionId: string
): Promise<(AdminUser & { expiresAt: string }) | null> {
  const data = await kv.get(`session:${sessionId}`);
  if (!data) return null;

  const session = JSON.parse(data);
  if (new Date(session.expiresAt) < new Date()) {
    await kv.delete(`session:${sessionId}`);
    return null;
  }

  return session;
}

// ── MIDDLEWARE: requiere auth + permiso opcional ─────────────────────────────
export function requireAuth(permission?: string) {
  return async (c: Context<AppBindings>, next: Next) => {
    const cookie = c.req.header('Cookie') ?? '';
    const match = cookie.match(/ddd_session=([^;]+)/);
    const sessionId = match?.[1];

    if (!sessionId) {
      const isApi = c.req.path.startsWith('/api/');
      return isApi
        ? c.json({ ok: false, error: 'unauthorized' }, 401)
        : c.redirect('/admin/login?redirect=' + encodeURIComponent(c.req.path));
    }

    const session = await getSession(c.env.APP_SESSION, sessionId);
    if (!session) {
      return c.redirect('/admin/login?expired=1');
    }

    if (permission && !can(session, permission)) {
      return c.json({ ok: false, error: 'forbidden' }, 403);
    }

    c.set('user', session);
    await next();
  };
}
```

### Seeding del primer usuario superadmin

```bash
# Ejecutar UNA vez para crear el usuario inicial
# Genera el hash de la contraseña y lo inserta en D1

node -e "
const crypto = require('crypto');
const pass = process.argv[1];
const hash = crypto.createHash('sha256').update(pass).digest('hex');
const id = crypto.randomUUID();
const sql = \`INSERT INTO admin_users (id, username, pass_hash, rol, nombre)
VALUES ('\${id}', 'admin', '\${hash}', 'superadmin', 'Administrador');\`;
console.log(sql);
" -- TU_CONTRASEÑA_AQUI

# Copiar el SQL generado y ejecutar:
npx wrangler d1 execute datadrivenday --local --command="INSERT INTO ..."
npx wrangler d1 execute datadrivenday --command="INSERT INTO ..."  # producción
```

---

## ENDPOINTS API — src/lib/api/app.ts

### Estructura de rutas

```typescript
// ── AUTH ───────────────────────────────────────────────────────────────────
app.post('/api/admin/login',  handleLogin);
app.post('/api/admin/logout', handleLogout);
app.get('/api/admin/me',      requireAuth(), getMe);

// ── PRESENTACIONES ─────────────────────────────────────────────────────────
app.get('/api/admin/presentaciones',          requireAuth('presentations:read'),   listPresentaciones);
app.post('/api/admin/presentaciones',         requireAuth('presentations:write'),  createPresentacion);
app.patch('/api/admin/presentaciones/:id',    requireAuth('presentations:write'),  updatePresentacion);
app.delete('/api/admin/presentaciones/:id',   requireAuth('presentations:delete'), deletePresentacion);

// Slides dentro de una presentación (ya definidos antes, ahora con requireAuth)
app.get('/api/admin/slides',                  requireAuth('presentations:read'),   getSlides);
app.post('/api/admin/slides',                 requireAuth('presentations:write'),  createSlide);
app.patch('/api/admin/slides/:id',            requireAuth('presentations:write'),  updateSlide);
app.delete('/api/admin/slides/:id',           requireAuth('presentations:delete'), deleteSlide);
app.post('/api/admin/slides/reorder',         requireAuth('presentations:write'),  reorderSlides);
app.post('/api/admin/slides/:id/duplicate',   requireAuth('presentations:write'),  duplicateSlide);

// ── BLOG ───────────────────────────────────────────────────────────────────
app.get('/api/admin/blog',                    requireAuth('blog:read'),    listBlogPosts);
app.get('/api/admin/blog/:id',                requireAuth('blog:read'),    getBlogPost);
app.post('/api/admin/blog',                   requireAuth('blog:write'),   createBlogPost);
app.patch('/api/admin/blog/:id',              requireAuth('blog:write'),   updateBlogPost);
app.post('/api/admin/blog/:id/publicar',      requireAuth('blog:publish'), publicarBlogPost);
app.post('/api/admin/blog/:id/archivar',      requireAuth('blog:publish'), archivarBlogPost);
app.delete('/api/admin/blog/:id',             requireAuth('blog:delete'),  deleteBlogPost);

// Upload de imagen para blog (a R2)
app.post('/api/admin/blog/:id/imagen',        requireAuth('blog:write'),   uploadBlogImagen);

// ── REGISTROS ──────────────────────────────────────────────────────────────
app.get('/api/admin/registros',               requireAuth('registros:read'),   listRegistros);
app.get('/api/admin/registros/export',        requireAuth('registros:export'), exportRegistros);
app.patch('/api/admin/registros/:id/asistio', requireAuth('registros:read'),   marcarAsistencia);

// ── RECURSOS ───────────────────────────────────────────────────────────────
app.get('/api/admin/recursos',                requireAuth('recursos:read'),   listRecursos);
app.post('/api/admin/recursos',               requireAuth('recursos:write'),  createRecurso);
app.patch('/api/admin/recursos/:id',          requireAuth('recursos:write'),  updateRecurso);
app.delete('/api/admin/recursos/:id',         requireAuth('recursos:delete'), deleteRecurso);
app.post('/api/admin/recursos/reorder',       requireAuth('recursos:write'),  reorderRecursos);

// ── USUARIOS ADMIN (solo superadmin) ───────────────────────────────────────
app.get('/api/admin/users',                   requireAuth('users:read'),  listUsers);
app.post('/api/admin/users',                  requireAuth('users:write'), createUser);
app.patch('/api/admin/users/:id',             requireAuth('users:write'), updateUser);
app.delete('/api/admin/users/:id',            requireAuth('users:write'), deleteUser);

// ── PÚBLICO: endpoints sin auth ────────────────────────────────────────────
app.get('/api/slides',    getPublicSlides);    // Presenter mode
app.get('/api/blog',      getPublicBlogPosts); // Blog público
app.get('/api/recursos',  getPublicRecursos);  // Recursos públicos
```

---

## ADMIN LAYOUT — src/components/admin/AdminLayout.astro

El shell que envuelve todas las páginas del admin. Sidebar fijo a la izquierda, topbar arriba, contenido principal a la derecha.

```typescript
---
interface Props {
  titulo: string;
  seccion: 'dashboard' | 'presentaciones' | 'blog' | 'registros' | 'recursos' | 'usuarios';
  usuario: { username: string; rol: string; nombre: string | null };
  acciones?: astroHTML.JSX.Element; // botones en el topbar derecho
}
const { titulo, seccion, usuario, acciones } = Astro.props;
---
```

```html
<div class="admin-shell">

  <!-- ── SIDEBAR ─────────────────────────────────────────── -->
  <nav class="admin-sidebar" aria-label="Navegación del panel de administración">

    <div class="sidebar-brand">
      <a href="/admin" class="sidebar-logo-link">
        <span class="sidebar-logo-icon" aria-hidden="true">◈</span>
        <span class="sidebar-logo-text">DDD Admin</span>
      </a>
    </div>

    <div class="sidebar-section">
      <span class="sidebar-section-label">Contenido</span>
      <ul class="sidebar-nav" role="list">

        <li>
          <a
            href="/admin"
            class={`sidebar-link ${seccion === 'dashboard' ? 'is-active' : ''}`}
            aria-current={seccion === 'dashboard' ? 'page' : undefined}
          >
            <span class="sidebar-link-icon" aria-hidden="true">◫</span>
            Dashboard
          </a>
        </li>

        <li>
          <a
            href="/admin/presentaciones"
            class={`sidebar-link ${seccion === 'presentaciones' ? 'is-active' : ''}`}
            aria-current={seccion === 'presentaciones' ? 'page' : undefined}
          >
            <span class="sidebar-link-icon" aria-hidden="true">◉</span>
            Presentaciones
          </a>
        </li>

        <li>
          <a
            href="/admin/blog"
            class={`sidebar-link ${seccion === 'blog' ? 'is-active' : ''}`}
            aria-current={seccion === 'blog' ? 'page' : undefined}
          >
            <span class="sidebar-link-icon" aria-hidden="true">◧</span>
            Blog
          </a>
        </li>

        <li>
          <a
            href="/admin/recursos"
            class={`sidebar-link ${seccion === 'recursos' ? 'is-active' : ''}`}
            aria-current={seccion === 'recursos' ? 'page' : undefined}
          >
            <span class="sidebar-link-icon" aria-hidden="true">◨</span>
            Recursos
          </a>
        </li>

      </ul>
    </div>

    <div class="sidebar-section">
      <span class="sidebar-section-label">Eventos</span>
      <ul class="sidebar-nav" role="list">

        <li>
          <a
            href="/admin/registros"
            class={`sidebar-link ${seccion === 'registros' ? 'is-active' : ''}`}
            aria-current={seccion === 'registros' ? 'page' : undefined}
          >
            <span class="sidebar-link-icon" aria-hidden="true">◪</span>
            Registros
            <!-- Badge con conteo — llenado por JS -->
            <span class="sidebar-badge" id="registrosBadge" aria-label="registros pendientes"></span>
          </a>
        </li>

      </ul>
    </div>

    {usuario.rol === 'superadmin' && (
      <div class="sidebar-section">
        <span class="sidebar-section-label">Sistema</span>
        <ul class="sidebar-nav" role="list">
          <li>
            <a href="/admin/usuarios" class={`sidebar-link ${seccion === 'usuarios' ? 'is-active' : ''}`}>
              <span class="sidebar-link-icon" aria-hidden="true">◬</span>
              Usuarios
            </a>
          </li>
        </ul>
      </div>
    )}

    <!-- Links rápidos al sitio público -->
    <div class="sidebar-footer">
      <a href="/" target="_blank" class="sidebar-external-link">
        Ver sitio ↗
      </a>
      <a href="/dataller/present?token=dataller2026" target="_blank" class="sidebar-external-link">
        Presenter ↗
      </a>
    </div>

  </nav>

  <!-- ── CONTENIDO PRINCIPAL ──────────────────────────── -->
  <div class="admin-main">

    <!-- Topbar -->
    <header class="admin-topbar">
      <div class="topbar-left">
        <h1 class="topbar-titulo">{titulo}</h1>
      </div>
      <div class="topbar-right">
        {acciones && <div class="topbar-acciones">{acciones}</div>}
        <div class="topbar-user">
          <span class="topbar-user-name">{usuario.nombre ?? usuario.username}</span>
          <span class={`topbar-user-rol topbar-user-rol--${usuario.rol}`}>{usuario.rol}</span>
          <form action="/api/admin/logout" method="post" style="display:inline">
            <button type="submit" class="topbar-logout-btn">Salir</button>
          </form>
        </div>
      </div>
    </header>

    <!-- Slot principal -->
    <main class="admin-content" id="main-content" tabindex="-1">
      <slot />
    </main>

  </div>

</div>
```

---

## PÁGINAS DEL ADMIN

### /admin — Dashboard

```
┌─────────────────────────────────────────────────────┐
│  DASHBOARD                                          │
│                                                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐│
│  │ Registros│ │  Blog    │ │Recursos  │ │ Slides ││
│  │   127    │ │ 4 posts  │ │ 18 refs  │ │9 slides││
│  │  total   │ │2 borradores│ │5 nuevos │ │1 pres. ││
│  └──────────┘ └──────────┘ └──────────┘ └────────┘│
│                                                     │
│  Actividad reciente                                 │
│  ─────────────────                                  │
│  • Ada Lovelace se registró hace 2 min              │
│  • Post "RAG en 2026" guardado hace 1 hora          │
│  • Slide "Contexto" actualizado hace 3 horas        │
│                                                     │
│  Accesos rápidos                                    │
│  ──────────────                                     │
│  [Nueva entrada de blog]  [Ver registros]           │
│  [Abrir editor Dataller]  [Agregar recurso]         │
└─────────────────────────────────────────────────────┘
```

El dashboard hace un fetch a `/api/admin/dashboard` que devuelve todos los conteos en una sola query batch de D1:

```typescript
// GET /api/admin/dashboard
app.get('/api/admin/dashboard', requireAuth(), async (c) => {
  const db = c.env.DB;

  const [registros, blog, recursos, slides, reciente] = await db.batch([
    db.prepare('SELECT COUNT(*) as total FROM submissions WHERE type = "registration"'),
    db.prepare('SELECT estado, COUNT(*) as n FROM blog_posts GROUP BY estado'),
    db.prepare('SELECT COUNT(*) as total FROM recursos WHERE is_active = 1'),
    db.prepare('SELECT COUNT(*) as total FROM presentation_slides WHERE is_active = 1'),
    db.prepare(
      `SELECT 'registro' as tipo, name as desc, created_at
       FROM submissions ORDER BY created_at DESC LIMIT 3
       UNION ALL
       SELECT 'blog' as tipo, titulo as desc, updated_at
       FROM blog_posts ORDER BY updated_at DESC LIMIT 3
       UNION ALL
       SELECT 'slide' as tipo, titulo as desc, updated_at
       FROM presentation_slides ORDER BY updated_at DESC LIMIT 3
       ORDER BY created_at DESC LIMIT 8`
    ),
  ]);

  return c.json({
    registros: registros.results[0],
    blog: blog.results,
    recursos: recursos.results[0],
    slides: slides.results[0],
    reciente: reciente.results,
  });
});
```

---

### /admin/presentaciones — Lista de presentaciones

```
┌─────────────────────────────────────────────────────┐
│  PRESENTACIONES                    [+ Nueva]        │
│                                                     │
│  ┌───────────────────────────────────────────────┐  │
│  │ ◉  Dataller de IA 2026           9 slides     │  │
│  │    Actualizado hace 2 horas      Publicada    │  │
│  │    [Editar]  [Previsualizar]  [Abrir presenter]│  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  ┌───────────────────────────────────────────────┐  │
│  │ ◉  Data Driven Day Sept 2026     0 slides     │  │
│  │    Creada hace 1 día             Borrador     │  │
│  │    [Editar]  [Previsualizar]                  │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

Cada presentación tiene su propia tabla de slides en D1, diferenciada por el campo `presentacion`. Crear una nueva presentación agrega un registro en una tabla `presentations` y permite luego agregar slides con ese ID de presentación.

```sql
-- Agregar a 002_slides.sql
CREATE TABLE IF NOT EXISTS presentations (
  id           TEXT PRIMARY KEY,
  nombre       TEXT NOT NULL,
  slug         TEXT NOT NULL UNIQUE,    -- usado en la URL del presenter
  token        TEXT NOT NULL,           -- token de acceso al presenter
  descripcion  TEXT,
  estado       TEXT NOT NULL DEFAULT 'borrador', -- borrador | publicada | archivada
  pagina_url   TEXT,                    -- ruta pública donde se publica (/dataller)
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);
```

El editor de presentación que ya diseñamos en el brief anterior se integra aquí: `/admin/presentaciones/[id]` carga el editor completo con el canvas, el sidebar de slides y el panel de propiedades.

---

### /admin/blog — Lista y editor de entradas

#### Lista de entradas

```
┌──────────────────────────────────────────────────────────┐
│  BLOG                              [+ Nueva entrada]     │
│                                                          │
│  Filtros: [Todos] [Publicados] [Borradores] [Archivados] │
│                                                          │
│  TÍTULO                    ESTADO      FECHA    ACCIONES │
│  ─────────────────────────────────────────────────────── │
│  El estado del arte de IA  publicado   15 mar   [E][A]   │
│  en 2026                                                 │
│                                                          │
│  Hermosillo en datos:      borrador    —        [E][×]   │
│  informe Harvard                                         │
│                                                          │
│  Guía de libros de ML      archivado   02 feb   [E][↩]   │
│                                                          │
│  [E]=Editar [A]=Archivar [×]=Eliminar [↩]=Restaurar      │
└──────────────────────────────────────────────────────────┘
```

#### Editor de entrada de blog — /admin/blog/[id]

El editor de blog es un editor de Markdown con preview en vivo. Sin librerías de rich text — solo un `<textarea>` para el Markdown y un panel de preview que renderiza el HTML usando un parser ligero.

```
┌──────────────────────────────────────────────────────────────┐
│  TOPBAR: [← Blog]  Estado: BORRADOR  [Guardar] [Publicar]   │
├──────────────────────┬───────────────────────────────────────┤
│  PROPIEDADES         │  EDITOR / PREVIEW                     │
│                      │                                       │
│  Título:             │  [Markdown] [Preview]    (tabs)       │
│  [______________]    │                                       │
│                      │  # El estado del arte de IA en 2026  │
│  Subtítulo:          │                                       │
│  [______________]    │  Para marzo de 2026, el desarrollo    │
│                      │  de productos con IA ha cruzado...   │
│  Extracto:           │                                       │
│  [______________ ]   │                                       │
│  [______________ ]   │                                       │
│                      │                                       │
│  Imagen destacada:   │                                       │
│  [Subir imagen]      │                                       │
│  (sube a R2)         │                                       │
│                      │                                       │
│  Tags:               │                                       │
│  [IA] [datos] [+]    │                                       │
│                      │                                       │
│  Autor:              │                                       │
│  [Data Driven Day__] │                                       │
│                      │                                       │
│  URL (slug):         │                                       │
│  /blog/[slug-auto]   │                                       │
│                      │                                       │
│  Publicar en:        │                                       │
│  [fecha/hora]        │                                       │
│                      │                                       │
└──────────────────────┴───────────────────────────────────────┘
```

El parser de Markdown para el preview es una versión minimal implementada en JS vanilla que maneja los casos necesarios: headings, negrita, cursiva, listas, links, código inline y bloques de código. No se importa `marked` ni `remark` — se parsea con regex en el cliente solo para el preview. En producción, cuando la entrada se publica, el Markdown se renderiza a HTML en el Worker usando un parser ligero en el server side.

```typescript
// src/lib/server/markdown.ts — parser minimal server-side para Astro/Hono
// Alternativa: usar la función marked() que ya está disponible en Cloudflare Workers

export function renderMarkdown(md: string): string {
  return md
    // Headings
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // Bold y italic
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Code inline
    .replace(/`(.+?)`/g, '<code>$1</code>')
    // Links
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    // Listas
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
    // Párrafos
    .replace(/\n\n(.+)/g, '<p>$1</p>')
    // Saltos de línea simples
    .trim();
}
```

#### Upload de imagen a R2

```typescript
// POST /api/admin/blog/:id/imagen
app.post('/api/admin/blog/:id/imagen', requireAuth('blog:write'), async (c) => {
  const formData = await c.req.formData();
  const file = formData.get('imagen') as File;
  
  if (!file || !file.type.startsWith('image/')) {
    return c.json({ ok: false, error: 'invalid_file' }, 400);
  }
  
  // Limitar a 5MB
  if (file.size > 5 * 1024 * 1024) {
    return c.json({ ok: false, error: 'file_too_large' }, 400);
  }
  
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
  const key = `blog/${c.req.param('id')}/${crypto.randomUUID()}.${ext}`;
  
  await c.env.MEDIA.put(key, file.stream(), {
    httpMetadata: { contentType: file.type },
  });
  
  // R2 no tiene URL pública por defecto — usar Workers URL o R2 custom domain
  const url = `${c.env.PUBLIC_SITE_URL}/media/${key}`;
  
  // También actualizar imagen_url en D1
  await c.env.DB
    .prepare('UPDATE blog_posts SET imagen_url = ? WHERE id = ?')
    .bind(url, c.req.param('id'))
    .run();
  
  return c.json({ ok: true, url });
});

// Servir imágenes desde R2
app.get('/media/*', async (c) => {
  const key = c.req.path.replace('/media/', '');
  const object = await c.env.MEDIA.get(key);
  
  if (!object) return c.notFound();
  
  return new Response(object.body, {
    headers: {
      'Content-Type': object.httpMetadata?.contentType ?? 'image/jpeg',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
});
```

---

### /admin/registros — Tabla de registros

```
┌──────────────────────────────────────────────────────────────────┐
│  REGISTROS — Dataller 28 mar          [Exportar CSV]            │
│                                                                  │
│  Total: 127 registros · 89 confirmados · 0 marcados asistidos   │
│                                                                  │
│  Buscar: [_________________________________]                     │
│  Filtro: [Todos] [Registro] [Contacto] [Propuesta]              │
│                                                                  │
│  NOMBRE         EMAIL               ORG          FECHA   ASISTIÓ│
│  ─────────────────────────────────────────────────────────────── │
│  Ada Lovelace   ada@tec.mx          Tec MTY      15 mar  [ ]    │
│  Alan Turing    alan@usonora.mx     Uni Sonora   14 mar  [✓]    │
│  Grace Hopper   grace@cisco.com     Cisco        13 mar  [ ]    │
│                                                                  │
│  [← Ant]  Página 1 de 13  [Sig →]                              │
└──────────────────────────────────────────────────────────────────┘
```

#### Exportar a CSV

```typescript
// GET /api/admin/registros/export
app.get('/api/admin/registros/export', requireAuth('registros:export'), async (c) => {
  const rows = await c.env.DB
    .prepare(
      `SELECT name, email, organization, message, type, created_at
       FROM submissions
       ORDER BY created_at DESC`
    )
    .all<{
      name: string; email: string; organization: string;
      message: string; type: string; created_at: string;
    }>();

  const headers = ['nombre', 'email', 'organización', 'mensaje', 'tipo', 'fecha'];
  const csvRows = rows.results.map(r => [
    `"${r.name}"`,
    `"${r.email}"`,
    `"${r.organization ?? ''}"`,
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
```

#### Marcar asistencia

```typescript
// La tabla submissions necesita una columna extra
// Agregar a migration 001 o crear nueva:
// ALTER TABLE submissions ADD COLUMN asistio INTEGER DEFAULT 0;
// ALTER TABLE submissions ADD COLUMN asistio_at TEXT;

app.patch('/api/admin/registros/:id/asistio', requireAuth('registros:read'), async (c) => {
  const { asistio } = await c.req.json<{ asistio: boolean }>();
  
  await c.env.DB
    .prepare(
      `UPDATE submissions
       SET asistio = ?, asistio_at = CASE WHEN ? = 1 THEN datetime('now') ELSE NULL END
       WHERE id = ?`
    )
    .bind(asistio ? 1 : 0, asistio ? 1 : 0, c.req.param('id'))
    .run();
  
  return c.json({ ok: true });
});
```

---

### /admin/recursos — CRUD de recursos bibliográficos

```
┌──────────────────────────────────────────────────────────────────┐
│  RECURSOS                                   [+ Agregar]         │
│                                                                  │
│  Filtro: [Todos] [Gobernanza] [Tecnología] [Sonora/Urbano]      │
│                                                                  │
│  ≡  TabPFN-2.5: Advancing...  paper  tecnologia  2026  ★  [E][×]│
│  ≡  Hermosillo con futuro...  informe  sonora    2025  ★  [E][×]│
│  ≡  AI Engineering - Huyen    libro  tecnologia  2025     [E][×]│
│  ≡  Interpretable ML...       libro  tecnologia  2022     [E][×]│
│                                                                  │
│  ≡ = drag para reordenar  ★ = destacado en el sitio             │
└──────────────────────────────────────────────────────────────────┘
```

El panel de edición de cada recurso aparece como un drawer lateral (no navegación a otra página) que se abre al hacer clic en Editar. Campos: título, fuente, año, URL, tipo, categoría, descripción, toggle de destacado, toggle de activo.

---

## CSS COMPLETO DEL ADMIN SHELL

```css
/* ── SHELL ──────────────────────────────────────────────────── */
.admin-shell {
  display: grid;
  grid-template-columns: 220px 1fr;
  height: 100vh;
  overflow: hidden;
  background: var(--color-bg);
  font-family: var(--font-mono);
}

/* ── SIDEBAR ─────────────────────────────────────────────────── */
.admin-sidebar {
  border-right: 1px solid var(--color-border);
  background: var(--color-surface);
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  overflow-x: hidden;
}

.sidebar-brand {
  padding: 1rem var(--space-md);
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.sidebar-logo-link {
  display: flex;
  align-items: center;
  gap: 8px;
  text-decoration: none;
  color: var(--color-text-primary);
}

.sidebar-logo-icon {
  font-size: 1.2rem;
  color: var(--color-accent-amber);
}

.sidebar-logo-text {
  font-size: 0.78rem;
  letter-spacing: 0.1em;
  font-weight: 700;
}

.sidebar-section {
  padding: var(--space-sm) 0;
  border-bottom: 1px solid var(--color-border);
}

.sidebar-section-label {
  display: block;
  font-size: 0.58rem;
  letter-spacing: 0.15em;
  color: var(--color-text-muted);
  padding: 0 var(--space-md) 6px;
}

.sidebar-nav {
  list-style: none;
  padding: 0;
}

.sidebar-link {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px var(--space-md);
  font-size: 0.78rem;
  color: var(--color-text-muted);
  text-decoration: none;
  border-left: 2px solid transparent;
  transition: color 150ms, border-color 150ms, background-color 150ms;
}

.sidebar-link:hover {
  color: var(--color-text-primary);
  background: color-mix(in srgb, var(--color-accent-amber) 6%, transparent);
}

.sidebar-link.is-active {
  color: var(--color-accent-amber);
  border-left-color: var(--color-accent-amber);
  background: color-mix(in srgb, var(--color-accent-amber) 8%, transparent);
}

.sidebar-link-icon {
  font-size: 0.9rem;
  flex-shrink: 0;
  opacity: 0.7;
}

.sidebar-badge {
  margin-left: auto;
  background: var(--color-accent-heat);
  color: white;
  font-size: 0.6rem;
  padding: 1px 6px;
  border-radius: 10px;
  min-width: 18px;
  text-align: center;
}

.sidebar-badge:empty { display: none; }

.sidebar-footer {
  margin-top: auto;
  padding: var(--space-sm) var(--space-md);
  border-top: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.sidebar-external-link {
  font-size: 0.68rem;
  color: var(--color-text-muted);
  text-decoration: none;
  transition: color 150ms;
}

.sidebar-external-link:hover { color: var(--color-accent-amber); }

/* ── MAIN ────────────────────────────────────────────────────── */
.admin-main {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.admin-topbar {
  height: 52px;
  border-bottom: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--space-lg);
  background: var(--color-surface);
  flex-shrink: 0;
}

.topbar-titulo {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--color-text-primary);
  letter-spacing: -0.01em;
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: var(--space-md);
}

.topbar-acciones {
  display: flex;
  gap: var(--space-sm);
}

.topbar-user {
  display: flex;
  align-items: center;
  gap: 8px;
}

.topbar-user-name {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.topbar-user-rol {
  font-size: 0.58rem;
  letter-spacing: 0.1em;
  padding: 2px 6px;
  border-radius: 2px;
  border: 1px solid;
}

.topbar-user-rol--superadmin { border-color: var(--color-accent-amber); color: var(--color-accent-amber); }
.topbar-user-rol--editor      { border-color: var(--color-accent-go);    color: var(--color-accent-go); }
.topbar-user-rol--viewer      { border-color: var(--color-border);        color: var(--color-text-muted); }

.topbar-logout-btn {
  background: transparent;
  border: 1px solid var(--color-border);
  color: var(--color-text-muted);
  font-family: var(--font-mono);
  font-size: 0.68rem;
  padding: 4px 10px;
  cursor: pointer;
  border-radius: 2px;
  transition: all 150ms;
}

.topbar-logout-btn:hover {
  border-color: var(--color-accent-heat);
  color: var(--color-accent-heat);
}

.admin-content {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-lg);
}

/* ── DASHBOARD STATS ─────────────────────────────────────────── */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1px;
  background: var(--color-border);
  margin-bottom: var(--space-xl);
}

.stat-card {
  background: var(--color-surface);
  padding: var(--space-md);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-label {
  font-size: 0.62rem;
  letter-spacing: 0.12em;
  color: var(--color-text-muted);
}

.stat-value {
  font-size: 2rem;
  font-weight: 700;
  color: var(--color-text-primary);
  line-height: 1;
}

.stat-sub {
  font-size: 0.68rem;
  color: var(--color-text-muted);
}

/* ── TABLA DE DATOS ──────────────────────────────────────────── */
.data-table-wrapper {
  border: 1px solid var(--color-border);
  overflow: hidden;
  border-radius: 2px;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.78rem;
}

.data-table th {
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  padding: 8px 12px;
  text-align: left;
  font-size: 0.62rem;
  letter-spacing: 0.1em;
  color: var(--color-text-muted);
  font-weight: 700;
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
}

.data-table th:hover { color: var(--color-text-primary); }
.data-table th[aria-sort="ascending"]::after  { content: ' ↑'; }
.data-table th[aria-sort="descending"]::after { content: ' ↓'; }

.data-table td {
  padding: 10px 12px;
  border-bottom: 1px solid var(--color-border);
  color: var(--color-text-primary);
  vertical-align: middle;
}

.data-table tr:last-child td { border-bottom: none; }

.data-table tr:hover td {
  background: color-mix(in srgb, var(--color-accent-amber) 4%, transparent);
}

/* Badges de estado */
.estado-badge {
  display: inline-block;
  font-size: 0.6rem;
  letter-spacing: 0.08em;
  padding: 2px 8px;
  border-radius: 2px;
  border: 1px solid;
}

.estado-badge--publicado  { border-color: var(--color-accent-go);   color: var(--color-accent-go); }
.estado-badge--borrador   { border-color: var(--color-border);       color: var(--color-text-muted); }
.estado-badge--archivado  { border-color: var(--color-border);       color: var(--color-text-muted); opacity: 0.5; }
.estado-badge--publicada  { border-color: var(--color-accent-go);   color: var(--color-accent-go); }

/* Botones de acción en tabla */
.table-action-btn {
  background: transparent;
  border: 1px solid var(--color-border);
  color: var(--color-text-muted);
  font-family: var(--font-mono);
  font-size: 0.65rem;
  padding: 3px 8px;
  cursor: pointer;
  border-radius: 2px;
  text-decoration: none;
  display: inline-block;
  transition: all 150ms;
}

.table-action-btn:hover { border-color: var(--color-text-muted); color: var(--color-text-primary); }
.table-action-btn--danger:hover { border-color: var(--color-accent-heat); color: var(--color-accent-heat); }

/* ── PAGINACIÓN ──────────────────────────────────────────────── */
.pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-sm) 0;
  font-size: 0.72rem;
  color: var(--color-text-muted);
}

.pagination-btns { display: flex; gap: 4px; }

.pagination-btn {
  background: transparent;
  border: 1px solid var(--color-border);
  color: var(--color-text-muted);
  font-family: var(--font-mono);
  font-size: 0.68rem;
  padding: 4px 10px;
  cursor: pointer;
  border-radius: 2px;
  transition: all 150ms;
}

.pagination-btn:hover:not(:disabled) { border-color: var(--color-text-muted); color: var(--color-text-primary); }
.pagination-btn:disabled { opacity: 0.3; cursor: not-allowed; }

/* ── DRAWER LATERAL (para edición rápida de recursos) ────────── */
.drawer-overlay {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.5);
  z-index: 200;
  backdrop-filter: blur(2px);
}

.drawer {
  position: fixed;
  top: 0; right: 0;
  width: min(480px, 90vw);
  height: 100vh;
  background: var(--color-surface);
  border-left: 1px solid var(--color-border);
  z-index: 201;
  display: flex;
  flex-direction: column;
  transform: translateX(100%);
  transition: transform 250ms cubic-bezier(0.16, 1, 0.3, 1);
}

.drawer.is-open { transform: translateX(0); }

.drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-md);
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.drawer-title {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--color-text-primary);
}

.drawer-close {
  background: transparent;
  border: none;
  color: var(--color-text-muted);
  font-size: 1.3rem;
  cursor: pointer;
  padding: 0 4px;
  transition: color 150ms;
}

.drawer-close:hover { color: var(--color-text-primary); }

.drawer-body {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-md);
}

.drawer-footer {
  padding: var(--space-md);
  border-top: 1px solid var(--color-border);
  display: flex;
  gap: var(--space-sm);
  justify-content: flex-end;
  flex-shrink: 0;
}

/* ── EDITOR MARKDOWN ─────────────────────────────────────────── */
.blog-editor-layout {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 0;
  height: calc(100vh - 52px);
  overflow: hidden;
}

.blog-props-panel {
  border-right: 1px solid var(--color-border);
  overflow-y: auto;
  padding: var(--space-md);
  background: var(--color-surface);
}

.blog-editor-area {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.editor-tabs {
  display: flex;
  border-bottom: 1px solid var(--color-border);
  background: var(--color-surface);
  padding: 0 var(--space-md);
  flex-shrink: 0;
}

.editor-tab {
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  color: var(--color-text-muted);
  font-family: var(--font-mono);
  font-size: 0.72rem;
  letter-spacing: 0.06em;
  padding: 10px 16px;
  cursor: pointer;
  transition: color 150ms, border-color 150ms;
  margin-bottom: -1px;
}

.editor-tab.is-active {
  color: var(--color-accent-amber);
  border-bottom-color: var(--color-accent-amber);
}

.editor-textarea {
  flex: 1;
  background: var(--color-bg);
  border: none;
  color: var(--color-text-primary);
  font-family: var(--font-mono);
  font-size: 0.85rem;
  line-height: 1.7;
  padding: var(--space-lg);
  resize: none;
  outline: none;
}

.editor-preview {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-lg);
  font-family: var(--font-sans, sans-serif);
  font-size: 0.9rem;
  line-height: 1.7;
  color: var(--color-text-primary);
}

/* Estilos del preview de Markdown */
.editor-preview h1 { font-size: 1.6rem; margin: 1.5rem 0 0.8rem; }
.editor-preview h2 { font-size: 1.2rem; margin: 1.4rem 0 0.6rem; }
.editor-preview h3 { font-size: 1rem;   margin: 1.2rem 0 0.5rem; }
.editor-preview p  { margin-bottom: 1rem; }
.editor-preview ul { margin: 0.5rem 0 1rem 1.5rem; }
.editor-preview li { margin-bottom: 4px; }
.editor-preview code {
  font-family: var(--font-mono);
  font-size: 0.8em;
  background: var(--color-surface);
  padding: 2px 6px;
  border-radius: 2px;
  border: 1px solid var(--color-border);
}
.editor-preview a { color: var(--color-accent-amber); }

/* Publish status bar */
.publish-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px var(--space-md);
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
  font-size: 0.72rem;
}

.publish-bar-status { color: var(--color-text-muted); }
.publish-bar-actions { display: flex; gap: var(--space-sm); }

/* Botones de acción genéricos del admin */
.admin-btn {
  font-family: var(--font-mono);
  font-size: 0.72rem;
  letter-spacing: 0.06em;
  padding: 6px 14px;
  border: 1px solid var(--color-border);
  background: transparent;
  color: var(--color-text-muted);
  cursor: pointer;
  border-radius: 2px;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: all 150ms;
}

.admin-btn:hover { color: var(--color-text-primary); border-color: var(--color-text-muted); }
.admin-btn--primary { border-color: var(--color-accent-amber); color: var(--color-accent-amber); }
.admin-btn--primary:hover { background: color-mix(in srgb, var(--color-accent-amber) 10%, transparent); }
.admin-btn--success { border-color: var(--color-accent-go); color: var(--color-accent-go); }
.admin-btn--success:hover { background: color-mix(in srgb, var(--color-accent-go) 10%, transparent); }
.admin-btn--danger { border-color: var(--color-accent-heat); color: var(--color-accent-heat); }
.admin-btn--danger:hover { background: color-mix(in srgb, var(--color-accent-heat) 10%, transparent); }

/* Buscador */
.search-input {
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  color: var(--color-text-primary);
  font-family: var(--font-mono);
  font-size: 0.78rem;
  padding: 7px 12px;
  border-radius: 2px;
  width: 280px;
  transition: border-color 150ms;
}

.search-input:focus { outline: none; border-color: var(--color-accent-amber); }

/* Filtros tabs */
.filter-tabs {
  display: flex;
  gap: 2px;
  margin-bottom: var(--space-md);
}

.filter-tab {
  background: transparent;
  border: 1px solid var(--color-border);
  color: var(--color-text-muted);
  font-family: var(--font-mono);
  font-size: 0.65rem;
  letter-spacing: 0.08em;
  padding: 4px 12px;
  cursor: pointer;
  border-radius: 2px;
  transition: all 150ms;
}

.filter-tab:hover { border-color: var(--color-text-muted); color: var(--color-text-primary); }
.filter-tab.is-active { background: var(--color-accent-amber); border-color: var(--color-accent-amber); color: var(--color-bg); }

/* Upload zone */
.upload-zone {
  border: 1px dashed var(--color-border);
  padding: var(--space-md);
  text-align: center;
  cursor: pointer;
  border-radius: 2px;
  transition: border-color 150ms;
  font-size: 0.72rem;
  color: var(--color-text-muted);
}

.upload-zone:hover,
.upload-zone.drag-over { border-color: var(--color-accent-amber); color: var(--color-accent-amber); }

/* Accessibility */
@media (prefers-reduced-motion: reduce) {
  .drawer { transition: none; }
  * { transition: none !important; animation: none !important; }
}

.sr-only {
  position: absolute; width: 1px; height: 1px;
  padding: 0; margin: -1px; overflow: hidden;
  clip: rect(0,0,0,0); white-space: nowrap; border-width: 0;
}

:focus-visible {
  outline: 2px solid var(--color-accent-amber);
  outline-offset: 2px;
  border-radius: 2px;
}
```

---

## FLUJO COMPLETO DEL SISTEMA

```
Usuario abre /admin
  ↓ middleware de Astro verifica cookie ddd_session
  ↓ si no existe → redirect a /admin/login
  ↓ si existe → GET /api/admin/me → KV → devuelve user con rol

/admin/login
  ↓ POST /api/admin/login
  ↓ Hono verifica username + SHA-256(password) contra admin_users en D1
  ↓ crea sesión en KV con TTL 8h
  ↓ Set-Cookie: ddd_session=... HttpOnly Secure SameSite=Strict
  ↓ redirect a /admin

/admin (dashboard)
  ↓ GET /api/admin/dashboard (batch query D1)
  ↓ renderiza stats + actividad reciente

/admin/presentaciones
  ↓ lista de presentaciones desde D1
  ↓ click "Editar" → /admin/presentaciones/[id]
  ↓ carga el editor de slides (engine ya diseñado)
  ↓ autosave PATCH /api/admin/slides/:id → D1
  ↓ "Abrir presenter" → /dataller/present?token=xxx
  ↓ presenter mode carga desde GET /api/slides (público)

/admin/blog
  ↓ lista de entradas con filtros de estado
  ↓ click "Nueva" → POST /api/admin/blog → redirect al editor
  ↓ editor de Markdown con preview en vivo
  ↓ subir imagen → POST /api/admin/blog/:id/imagen → R2
  ↓ "Publicar" → POST /api/admin/blog/:id/publicar → estado="publicado" en D1
  ↓ blog público en /blog lee desde GET /api/blog (solo publicados)

/admin/registros
  ↓ tabla paginada desde GET /api/admin/registros
  ↓ buscar por nombre/email en cliente (JS vanilla, sin re-fetch)
  ↓ "Exportar CSV" → GET /api/admin/registros/export → descarga directa
  ↓ checkbox asistió → PATCH /api/admin/registros/:id/asistio

/admin/recursos
  ↓ lista con drag-to-reorder
  ↓ click "Editar" → drawer lateral con formulario
  ↓ guardar → PATCH /api/admin/recursos/:id → D1
  ↓ recursos públicos en /datos leen desde GET /api/recursos (solo activos)
```

---

## INTEGRACIÓN CON EL SITIO PÚBLICO

Las páginas públicas que consumen datos del admin:

| Página pública | Lee de | Endpoint |
|---|---|---|
| `/dataller` | D1 slides activos | `GET /api/slides?presentacion=dataller-2026` |
| `/dataller/present` | D1 slides activos | `GET /api/slides?presentacion=dataller-2026` |
| `/blog` | D1 posts publicados | `GET /api/blog` |
| `/blog/[slug]` | D1 post por slug | `GET /api/blog/:slug` |
| `/datos` | D1 recursos activos | `GET /api/recursos` |

Todos estos endpoints son públicos (sin auth), devuelven solo ítems activos/publicados, y tienen `Cache-Control: public, max-age=60` para que Cloudflare los cachee en el edge.

---

## CHECKLIST PARA COPILOT

**Base de datos:**
- [ ] Crear `003_blog.sql` y `004_recursos.sql`
- [ ] Agregar tabla `presentations` a `002_slides.sql`
- [ ] Agregar tabla `admin_users` con seeding del primer usuario
- [ ] Agregar columnas `asistio` y `asistio_at` a `submissions`
- [ ] Ejecutar todas las migraciones en local y prod

**Auth:**
- [ ] Extender `auth.ts` con sistema de roles desde D1
- [ ] Agregar middleware `requireAuth(permission?)` a todas las rutas admin
- [ ] El login ahora verifica contra D1, no contra env vars
- [ ] Mantener la cookie HttpOnly + Secure + SameSite=Strict

**API endpoints:**
- [ ] Todos los endpoints admin protegidos con `requireAuth(permission)`
- [ ] Endpoints públicos `/api/slides`, `/api/blog`, `/api/recursos` sin auth
- [ ] Export CSV en `/api/admin/registros/export`
- [ ] Upload de imágenes a R2 en `/api/admin/blog/:id/imagen`
- [ ] Servir imágenes de R2 en `/media/*`

**Páginas admin:**
- [ ] `AdminLayout.astro` con sidebar, topbar y slot
- [ ] `/admin/index.astro` — dashboard con stats
- [ ] `/admin/presentaciones/index.astro` — lista de presentaciones
- [ ] `/admin/presentaciones/[id].astro` — editor (el engine ya diseñado)
- [ ] `/admin/blog/index.astro` — lista con filtros
- [ ] `/admin/blog/[id].astro` — editor Markdown con preview
- [ ] `/admin/registros/index.astro` — tabla + export + asistencia
- [ ] `/admin/recursos/index.astro` — CRUD con drawer y drag-to-reorder

**UX:**
- [ ] El sidebar muestra la sección activa con `aria-current="page"`
- [ ] Badge en "Registros" con conteo de nuevos (últimas 24h)
- [ ] El drawer de recursos tiene focus trap y cierre con Escape
- [ ] La tabla de registros tiene búsqueda en cliente sin re-fetch
- [ ] Autosave en el editor de blog con debounce 1000ms
- [ ] El editor de Markdown tiene tabs Markdown / Preview
- [ ] El upload de imagen tiene zona de drag-and-drop visual

**Sin librerías externas:**
- [ ] Sin rich text editor (Quill, TipTap, etc.) — solo textarea Markdown
- [ ] Sin librerías de drag-and-drop — HTML5 native drag API
- [ ] Sin librerías de tablas — tabla HTML con sort/filter en JS vanilla
- [ ] Sin librerías de fecha — `Intl.DateTimeFormat` nativo
- [ ] Sin React, Vue ni ningún framework de componentes
