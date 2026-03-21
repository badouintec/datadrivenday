# Data Driven Day 2026

**Hermosillo, Sonora · 28 de marzo de 2026**

Plataforma web completa para el **Dataller de IA 2026**: sitio público, sistema de participantes con login, equipos y reconocimiento PDF, CMS de blog y recursos, editor visual de presentaciones con canvas animado y modo presenter, todo corriendo en Cloudflare Workers + D1 + KV.

---

## Contenido

- [Arquitectura general](#arquitectura-general)
- [Stack técnico](#stack-técnico)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Rutas y páginas](#rutas-y-páginas)
- [API — endpoints completos](#api--endpoints-completos)
- [Sistema admin](#sistema-admin)
- [Flujo de autenticación](#flujo-de-autenticación)
- [Flujo de presentaciones](#flujo-de-presentaciones)
- [Flujo de registro de participantes](#flujo-de-registro-de-participantes)
- [Modelo de base de datos](#modelo-de-base-de-datos)
- [Flujo de deploy](#flujo-de-deploy)
- [Setup local](#setup-local)
- [Variables de entorno](#variables-de-entorno)
- [Bindings Cloudflare](#bindings-cloudflare)
- [Scripts](#scripts)

---

## Arquitectura general

```mermaid
graph TD
    subgraph Edge["☁ Cloudflare Edge"]
        W["Workers SSR\n@astrojs/cloudflare"]
        KV["KV — APP_SESSION\nSesiones admin 8h TTL"]
        D1["D1 — datadrivenday\nsubmissions · slides · blog · recursos\nadmin_users · participants · teams"]
        R2["R2 — datadrivenday-assets\nImágenes · PDFs · media"]
    end

    subgraph App["⚡ Aplicación"]
        subgraph Public["Sitio Público (prerendered)"]
            PI["/ index"]
            PD["/ dataller"]
            PH["/ hermosillo"]
            PB["/ blog"]
            PR["/ datos"]
            PM["/ manual"]
        end
        subgraph SSR["SSR dinámico"]
            PP["/ dataller/present\nPresenter mode"]
            ADMIN["/ admin/*\n5 secciones"]
            API["/ api/*\nHono router"]
        end
    end

    subgraph Content["📦 Datos"]
        Sanity["Sanity CMS\n(blog editorial)"]
        SiteTS["src/data/site.ts\nContenido estático"]
        Seed["db/seed-dataller.sql\n9 slides + presentación"]
    end

    Browser -->|GET| W
    W --> Public
    W --> SSR
    API -->|CRUD| D1
    API -->|session R/W| KV
    API -->|GET objects| R2
    Public -->|fetch GROQ| Sanity
    Public -->|import| SiteTS
    PP -->|GET /api/slides| API
    ADMIN -->|GET/POST/PATCH/DELETE /api/admin/*| API
```

---

## Stack técnico

| Capa | Tecnología | Versión | Rol |
|------|-----------|---------|-----|
| Framework | [Astro](https://astro.build) | 6 | Páginas SSR + prerender, componentes |
| Runtime | [Cloudflare Workers](https://workers.cloudflare.com) | — | Edge compute, SSR, API |
| API | [Hono](https://hono.dev) | — | Rutas `/api/*` montadas sobre Workers |
| Base de datos | [Cloudflare D1](https://developers.cloudflare.com/d1/) | SQLite | submissions, slides, blog, recursos, admin, participants y teams |
| Sesiones | [Cloudflare KV](https://developers.cloudflare.com/kv/) | — | Sesiones admin con TTL 8h |
| Storage | [Cloudflare R2](https://developers.cloudflare.com/r2/) | — | Imágenes blog, PDFs, media |
| CMS editorial | [Sanity](https://sanity.io) | — | Blog público (opcional, fallback si no configurado) |
| Estilos | CSS custom properties | — | Sistema de diseño propio, sin framework CSS |
| Tipografía | DM Sans + DM Mono | — | Display + código / UI |

---

## Estructura del proyecto

```
datadrivenday/
├── src/
│   ├── components/
│   │   ├── SubmissionForm.astro      # Formulario público de contacto/interés
│   │   ├── SiteLogo.astro            # Logo reutilizable del sitio
│   │   ├── HermosilloHarvard.astro   # Componente datos ciudad
│   │   └── admin/
│   │       └── AdminLayout.astro     # Shell del panel admin (sidebar + topbar)
│   ├── data/
│   │   └── site.ts                   # Contenido estático: stats, agenda, navigation
│   ├── layouts/
│   │   └── BaseLayout.astro          # Shell HTML público
│   ├── lib/
│   │   ├── api/
│   │   │   ├── app.ts                # App Hono: registra todas las rutas
│   │   │   ├── auth.ts               # Auth admin: SHA-256, KV sessions, RBAC
│   │   │   ├── participant-auth.ts   # Auth de participantes + sesión KV
│   │   │   ├── types.ts              # AppBindings, AppVariables, SubmissionPayload
│   │   │   └── routes/
│   │   │       ├── admin-presentations.ts  # CRUD presentaciones + slides
│   │   │       ├── admin-blog.ts           # CRUD artículos blog
│   │   │       ├── admin-registros.ts      # Ver/exportar registros
│   │   │       ├── admin-recursos.ts       # CRUD biblioteca de recursos
│   │   │       └── participant.ts          # Signup/login/dashboard/teams/reconocimiento
│   │   ├── sanity/
│   │   │   └── content.ts            # getEventSettings(): fetch GROQ
│   │   └── server/
│   │       ├── assets.ts             # Helpers R2
│   │       ├── documents/
│   │       │   └── participant-recognition.ts  # Genera PDF del reconocimiento
│   │       └── db/
│   │           ├── submissions.ts    # insertSubmission()
│   │           ├── slides.ts         # CRUD presentations + presentation_slides
│   │           ├── participants.ts   # Perfiles, flags admin y teams
│   │           └── recursos.ts       # Recursos públicos/administrables
│   ├── pages/
│   │   ├── index.astro               # Home (prerender)
│   │   ├── dataller.astro            # Documento dataller público (prerender)
│   │   ├── dataller/
│   │   │   └── present.astro         # Modo presenter full-screen (SSR)
│   │   ├── registro.astro            # Login/signup/panel de participante
│   │   ├── hermosillo.astro          # Datos ciudad (prerender)
│   │   ├── blog/index.astro          # Blog (prerender)
│   │   ├── datos/index.astro         # Biblioteca datos (prerender)
│   │   ├── manual/index.astro        # Documentación (prerender)
│   │   ├── admin/
│   │   │   ├── index.astro           # Dashboard → redirect a presentaciones
│   │   │   ├── login.astro           # Login admin
│   │   │   ├── presentaciones/
│   │   │   │   ├── index.astro       # Lista presentaciones
│   │   │   │   └── [id].astro        # Editor visual de slides
│   │   │   ├── blog/
│   │   │   │   ├── index.astro       # Lista artículos
│   │   │   │   └── [id].astro        # Editor artículo
│   │   │   ├── registros/index.astro # Tabla de participantes registrados
│   │   │   ├── participantes/index.astro # Validación de participantes y reconocimiento
│   │   │   └── recursos/index.astro  # Biblioteca de recursos
│   │   └── api/
│   │       └── [...route].ts         # Handler catch-all → Hono app
│   ├── sanity/
│   │   └── schemaTypes/              # Schemas Sanity: article, eventSettings
│   └── styles/
│       └── global.css                # Sistema de diseño completo
├── db/
│   ├── migrations/
│   │   ├── 0001_initial.sql          # submissions
│   │   ├── 0002_chart_data.sql       # chart_timeseries, chart_categorical
│   │   ├── 0003_slides.sql           # presentations, presentation_slides, admin_users
│   │   ├── 0004_blog.sql             # blog_posts
│   │   ├── 0005_recursos.sql         # recursos
│   │   ├── 0006_submissions_asistencia.sql  # ALTER submissions (asistio)
│   │   └── 0007_participants.sql     # participants, teams y team_members
│   └── seed-dataller.sql             # Presentación + 9 slides del Dataller 2026
├── public/
│   ├── scripts/
│   │   └── dataller-editor.js        # Engine partículas canvas (400 particles, 10 estados)
│   └── styles/
│       ├── admin.css                 # Estilos panel admin
│       └── editor.css                # Estilos editor de slides
├── astro.config.mjs
├── wrangler.jsonc                    # Bindings + vars Cloudflare
├── sanity.config.ts
└── tsconfig.json
```

---

## Rutas y páginas

```mermaid
graph LR
    subgraph Public["Público (prerendered)"]
        R1["/"]
        R2["/dataller"]
        R3["/hermosillo"]
        R4["/blog"]
        R5["/datos"]
        R6["/manual"]
    end

    subgraph SSR["SSR dinámico"]
        R7["/dataller/present\nPresenter mode"]
        R8["/admin/login"]
        R9["/admin"]
        R10["/admin/presentaciones"]
        R11["/admin/presentaciones/:id\nEditor slides"]
        R12["/admin/blog"]
        R13["/admin/blog/:id"]
        R14["/admin/registros"]
        R15["/admin/recursos"]
        R16["/api/*\nHono catch-all"]
    end

    R9 -->|redirect| R10
    R11 -->|Abrir presenter| R7
    R7 -->|fetch| R16
    R10 & R11 & R12 & R13 & R14 & R15 -->|auth check| R8
```

---

## API — endpoints completos

### Públicos (sin auth)

| Método | Path | Descripción |
|--------|------|-------------|
| `GET` | `/api/health` | Health check |
| `POST` | `/api/submissions` | Contacto / propuesta / interés general |
| `GET` | `/api/city-data/:city` | Datos de ciudad (charts) |
| `GET` | `/api/slides?presentacion=` | Slides activos de una presentación |
| `GET` | `/api/blog` | Artículos públicos publicados |
| `GET` | `/api/blog/:slug` | Artículo por slug |
| `GET` | `/api/recursos` | Recursos activos |
| `GET` | `/api/media/*` | Proxy R2 |
| `POST` | `/api/participant/signup` | Crear cuenta de participante |
| `POST` | `/api/participant/login` | Abrir sesión participante |
| `POST` | `/api/participant/logout` | Cerrar sesión participante |
| `GET` | `/api/participant/me` | Estado de sesión participante |
| `GET` | `/api/participant/dashboard` | Participante + recursos + equipos |
| `PATCH` | `/api/participant/dataller` | Activar o salir del Dataller |
| `PATCH` | `/api/participant/profile` | Actualizar perfil habilitado |
| `GET` | `/api/participant/teams` | Equipos propios y abiertos |
| `POST` | `/api/participant/teams` | Crear equipo |
| `POST` | `/api/participant/teams/:id/join` | Unirse a equipo abierto |
| `GET` | `/api/participant/recognition` | Descargar reconocimiento PDF |

### Admin — autenticación

| Método | Path | Descripción |
|--------|------|-------------|
| `POST` | `/api/admin/login` | Login → crea sesión KV |
| `POST` | `/api/admin/logout` | Elimina sesión KV |
| `GET` | `/api/admin/me` | Usuario actual |
| `GET` | `/api/admin/dashboard` | Stats generales |

### Admin — presentaciones y slides

| Método | Path | Permiso |
|--------|------|---------|
| `GET` | `/api/admin/presentaciones` | `presentations:read` |
| `POST` | `/api/admin/presentaciones` | `presentations:write` |
| `PATCH` | `/api/admin/presentaciones/:id` | `presentations:write` |
| `DELETE` | `/api/admin/presentaciones/:id` | `presentations:delete` |
| `GET` | `/api/admin/slides?presentacion=` | `presentations:read` |
| `POST` | `/api/admin/slides` | `presentations:write` |
| `PATCH` | `/api/admin/slides/:id` | `presentations:write` |
| `DELETE` | `/api/admin/slides/:id` | `presentations:delete` |
| `POST` | `/api/admin/slides/reorder` | `presentations:write` |
| `POST` | `/api/admin/slides/:id/duplicate` | `presentations:write` |

### Admin — blog, registros, participantes y recursos

| Método | Path | Permiso |
|--------|------|---------|
| `GET/POST` | `/api/admin/blog` | `blog:read/write` |
| `GET/PATCH/DELETE` | `/api/admin/blog/:id` | `blog:read/write/delete` |
| `POST` | `/api/admin/blog/:id/publicar` | `blog:publish` |
| `GET` | `/api/admin/registros` | `registros:read` |
| `GET` | `/api/admin/registros/export` | `registros:export` |
| `PATCH` | `/api/admin/registros/:id/asistio` | `registros:read` |
| `GET` | `/api/admin/participants` | `participants:read` |
| `PATCH` | `/api/admin/participants/:id` | `participants:write` |
| `GET/POST` | `/api/admin/recursos` | `recursos:read/write` |
| `PATCH/DELETE` | `/api/admin/recursos/:id` | `recursos:write/delete` |
| `POST` | `/api/admin/recursos/reorder` | `recursos:write` |

---

## Sistema admin

```mermaid
graph TD
    subgraph Roles["Roles y permisos"]
        SA["superadmin\nTodos los permisos"]
        ED["editor\npresentations:read/write\nblog:read/write/publish\nregistros:read\nrecursos:read/write"]
        VW["viewer\npresentations:read\nblog:read\nregistros:read\nrecursos:read"]
    end

    subgraph Secciones["Secciones admin"]
        S1["Presentaciones\nEditor visual de slides"]
        S2["Blog\nCMS artículos"]
        S3["Registros\nParticipantes + asistencia"]
        S4["Recursos\nBiblioteca datos"]
    end

    SA --> S1 & S2 & S3 & S4
    ED --> S1 & S2 & S3 & S4
    VW -.->|solo lectura| S1 & S2 & S3 & S4
```

---

## Flujo de autenticación

```mermaid
sequenceDiagram
    actor Admin
    participant Login as /admin/login
    participant Hono as POST /api/admin/login
    participant D1 as D1 admin_users
    participant KV as KV APP_SESSION

    Admin->>Login: username + password
    Login->>Hono: { username, password }
    Hono->>Hono: SHA-256(password) → hash
    Hono->>D1: SELECT WHERE username = ? AND pass_hash = ?
    alt Credenciales correctas
        D1-->>Hono: { id, username, rol, nombre }
        Hono->>KV: SET session:<uuid> → { user, exp: now+8h }
        KV-->>Hono: ok
        Hono-->>Login: Set-Cookie: ddd_session=<uuid> + { ok: true }
        Login-->>Admin: Redirect → /admin/presentaciones
    else Inválidas
        Hono-->>Login: { ok: false, error: "Credenciales inválidas" }
        Login-->>Admin: Mensaje de error
    end

    Note over Admin,KV: En cada request SSR: cookie → KV lookup → user object
```

---

## Flujo de presentaciones

```mermaid
flowchart TD
    subgraph Editor["Admin — Editor visual /admin/presentaciones/:id"]
        SB["Sidebar\nLista de slides\nDrag to reorder"]
        CV["Canvas preview\ndataller-editor.js\n400 partículas · 10 estados"]
        PP["Panel propiedades\ntitulo · subtitulo · tag\ncuerpo · notas · conceptos\nparticle_state · accent_color"]
    end

    subgraph DB["D1 Database"]
        PT["presentations\nid · nombre · slug · estado"]
        PS["presentation_slides\nnumero · tag · titulo\nsubtitulo · cuerpo · notas\nparticle_state · accent_color\nconceptos_json · is_active"]
    end

    subgraph Presenter["Modo Presenter /dataller/present"]
        FC["Full-screen canvas\nAnimación partículas"]
        HUD["Slide HUD\ntitulo · subtitulo · cuerpo\nconceptos en pills"]
        NAV["Navegación keyboard\n← → Space N F"]
        NP["Panel notas\n(toggle con N)"]
    end

    SB -->|PATCH /api/admin/slides/reorder| PS
    CV -->|live preview| PP
    PP -->|PATCH /api/admin/slides/:id| PS
    PT -->|1:N| PS
    PS -->|GET /api/slides?presentacion=X| Presenter
    FC & HUD & NAV & NP --> Presenter
```

---

## Flujo de registro de participantes

```mermaid
sequenceDiagram
    actor Visitante
    participant Form as SubmissionForm.astro
    participant Hono as POST /api/submissions
    participant D1 as D1 submissions

    Visitante->>Form: nombre · email · organización · mensaje
    Form->>Hono: { type, name, email, organization, message }
    Hono->>Hono: Valida campos requeridos
    alt DB binding disponible
        Hono->>D1: INSERT INTO submissions (id=UUID, ...)
        D1-->>Hono: ok
        Hono-->>Form: { ok: true, persisted: true }
    else Dev local sin binding
        Hono-->>Form: { ok: true, persisted: false }
    end
    Form-->>Visitante: Confirmación visual

    Note over D1: Admin accede en /admin/registros\nPuede marcar asistencia y exportar CSV
```

---

## Modelo de base de datos

```mermaid
erDiagram
    submissions {
        text id PK
        text type "registration | contact | proposal"
        text name
        text email
        text organization
        text message
        text metadata "JSON"
        text created_at
        integer asistio "0|1 — migration 0006"
        text asistio_at
    }

    chart_timeseries {
        text id PK
        text city "hermosillo"
        text indicator "modal_share | subsidio_mdp"
        text series "tp | auto"
        integer year
        real value
    }

    chart_categorical {
        text id PK
        text city
        text indicator
        text category
        real value
        integer sort_order
    }

    presentations {
        text id PK
        text nombre
        text slug UK
        text token
        text descripcion
        text estado "borrador | publicada"
        text pagina_url
        text created_at
        text updated_at
    }

    presentation_slides {
        text id PK
        text presentacion FK
        integer numero
        text tag
        text titulo
        text subtitulo
        text cuerpo
        text notas
        integer duracion "minutos"
        text particle_state "chaos|flow|cluster..."
        text accent_color "primary|alert|sage..."
        real particle_speed
        text conceptos_json "[]"
        text referencias_json "[]"
        text codigo_demo
        integer is_active "0|1"
        text created_at
        text updated_at
    }

    admin_users {
        text id PK
        text username UK
        text pass_hash "SHA-256"
        text rol "superadmin|editor|viewer"
        text nombre
        text created_at
        text last_login
    }

    blog_posts {
        text id PK
        text slug UK
        text titulo
        text subtitulo
        text cuerpo_md
        text extracto
        text imagen_url
        text autor
        text tags_json "[]"
        text estado "borrador|publicado|archivado"
        text publicado_en
        text created_at
        text updated_at
    }

    recursos {
        text id PK
        text titulo
        text fuente
        text anio
        text url
        text tipo "informe|dataset|herramienta"
        text categoria
        text descripcion
        integer is_featured "0|1"
        integer is_active "0|1"
        integer orden
        text created_at
        text updated_at
    }

    presentations ||--o{ presentation_slides : "tiene"
```

---

## Flujo de deploy

```mermaid
flowchart TD
    Dev["npm run dev\nastro dev · localhost:4321\nSin Cloudflare bindings"] -.->|solo UI| Build

    WDev["npx wrangler dev --local\n--config dist/server/wrangler.json\nlocalhost:4322 · D1 + KV reales"] -->|requiere build previo| Build

    Build["npm run build\nastro check + astro build"]
    Build --> CheckTypes["0 errores TypeScript"]
    Build --> BundleClient["dist/client/ — Assets estáticos"]
    Build --> BundleServer["dist/server/ — Worker bundle\n+ wrangler.json generado"]

    BundleServer --> Deploy["npm run deploy\nwrangler deploy\n--config dist/server/wrangler.json"]
    BundleClient --> Deploy

    Deploy --> CF["☁ Cloudflare Workers\ndatadriven.day"]
    CF --> KV2["KV — APP_SESSION"]
    CF --> D1_2["D1 — datadrivenday"]
    CF --> R2_2["R2 — datadrivenday-assets"]
```

> **Importante:** Para el dev server con bindings reales (admin, base de datos), usar siempre `wrangler dev` con `--config dist/server/wrangler.json`. El `astro dev` en puerto 4321 no tiene acceso a D1/KV.

---

## Setup local

### 1. Clonar e instalar

```bash
git clone https://github.com/badouintec/datadrivenday.git
cd datadrivenday
npm install
```

### 2. Variables de entorno

```bash
cp .env.example .env
# Edita el .env con tus valores
```

### 3. Build inicial (requerido para wrangler dev)

```bash
npm run build
```

### 4. Aplicar migraciones al D1 local

```bash
# Aplica todas las migraciones disponibles
npm run db:migrate:local

# Seed: presentación + 9 slides del Dataller
npx wrangler d1 execute datadrivenday --local \
  --config dist/server/wrangler.json --file=db/seed-dataller.sql

# Usuario admin (pass: ddd2026admin)
npx wrangler d1 execute datadrivenday --local \
  --config dist/server/wrangler.json \
  --command="INSERT OR REPLACE INTO admin_users \
  (id,username,pass_hash,rol,nombre) VALUES \
  ('admin-001','admin','4eb1d27ff4a93d049ce93f06a5e793838385cce7fd59abd8fba4fbc16af651dc','superadmin','Administrador')"
```

### 5. Servidor de desarrollo con bindings

```bash
npx wrangler dev --config dist/server/wrangler.json --local --port 4322
# http://localhost:4322
# http://localhost:4322/admin → login: admin / ddd2026admin
```

> Si solo necesitas iterar sobre UI sin el admin, puedes usar `npm run dev` (puerto 4321) — más rápido, sin migraciones.

### 5.1 Migraciones remotas antes de deploy

```bash
npm run db:migrate:remote
```

La migración `0008_participant_dataller.sql` agrega `participants.dataller_registered`, necesario para:

- separar quién está en Dataller desde `/admin/participantes`
- permitir que el participante active su estado desde `/registro`
- exigir `datallerRegistered + workshopCompleted + recognitionEnabled` antes de descargar certificado

### 6. Credenciales admin

El acceso admin ya no depende de variables en `wrangler.jsonc`. Las credenciales viven en la tabla `admin_users` de D1.

- Local: usa el `INSERT OR REPLACE` anterior para sembrar el usuario inicial.
- Producción: crea o rota usuarios admin directamente en D1, no en variables versionadas.

---

## Variables de entorno

| Variable | Requerida | Descripción |
|----------|-----------|-------------|
| `PUBLIC_SITE_URL` | Sí | URL pública sin trailing slash |
| `SANITY_PROJECT_ID` | Solo CMS | ID proyecto Sanity |
| `SANITY_DATASET` | Solo CMS | Dataset Sanity (default `production`) |
| `PUBLIC_SANITY_PROJECT_ID` | Solo CMS | Mismo ID, expuesto al cliente |
| `PUBLIC_SANITY_DATASET` | Solo CMS | Mismo dataset, expuesto al cliente |
| `SANITY_API_VERSION` | No | Default `2025-03-01` |

> Sin Sanity configurado el sitio carga con contenido fallback y no rompe.

---

## Bindings Cloudflare

Configura `wrangler.jsonc` con los IDs reales antes del primer deploy. Evita guardar secretos o hashes de acceso en este archivo; queda versionado.

```jsonc
{
  "kv_namespaces": [{ "binding": "APP_SESSION", "id": "TU_KV_ID" }],
  "d1_databases": [{
    "binding": "DB",
    "database_name": "datadrivenday",
    "database_id": "TU_D1_ID",
    "migrations_dir": "db/migrations"
  }],
  "r2_buckets": [{ "binding": "MEDIA", "bucket_name": "datadrivenday-assets" }]
}
```

### Provisioning inicial

```bash
wrangler kv namespace create APP_SESSION
wrangler d1 create datadrivenday
wrangler r2 bucket create datadrivenday-assets
```

### Generar tipos de bindings

```bash
npm run cf-typegen
# Actualiza src/env.d.ts
```

---

## Scripts

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Astro dev server `localhost:4321` (solo UI, sin bindings) |
| `npm run build` | `astro check` + build de producción |
| `npm run preview` | Preview estático del build |
| `npm run preview:worker` | Build + `wrangler dev` con config generada |
| `npm run deploy` | Build + deploy a Cloudflare Workers |
| `npm run db:migrate:local` | Aplica todas las migraciones D1 al entorno local |
| `npm run db:migrate:remote` | Aplica todas las migraciones D1 al entorno remoto |
| `npm run cf-typegen` | Regenera tipos de bindings en `src/env.d.ts` |
| `npm run sanity` | Studio Sanity local |

### Dev con bindings (comando manual)

```bash
# Siempre con --config dist/server/wrangler.json para usar el D1 correcto
npx wrangler dev --config dist/server/wrangler.json --local --port 4322
```



