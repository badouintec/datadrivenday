# Arquitectura

## Resumen

La aplicacion combina contenido publico en Astro, vistas dinamicas para admin y participantes, y una API Hono montada en Cloudflare Workers. D1 guarda datos transaccionales, KV mantiene sesiones y R2 sirve media.

## Capas

- Presentacion: Astro pages, componentes `.astro`, CSS custom y scripts ligeros en `public/scripts`.
- API: Hono montado en `src/pages/api/[...route].ts`.
- Dominio: modulos en `src/lib/api/routes` y acceso a datos en `src/lib/server/db`.
- Infraestructura: Cloudflare Workers, D1, KV, R2 y Sanity opcional para contenido editorial.

## Flujos clave

### Sitio publico

- Home, dataller, hermosillo, datos, manual y blog se prerenderizan cuando aplica.
- Algunos datos publicos usan fallback local si D1 no esta disponible.

### Admin

- Login en `/admin/login`.
- Sesion en KV.
- CRUD de presentaciones, blog, recursos, registros y participantes via `/api/admin/*`.

### Participantes

- Registro y login por `/api/participant/*`.
- Dashboard unificado en `/registro`.
- El reconocimiento se valida en backend y el PDF se genera en el cliente desde `src/lib/client/recognition-pdf.ts`.

## Puntos de acoplamiento sensibles

- Reconocimiento PDF: backend valida, frontend genera.
- Presentaciones: editor admin, endpoint publico `/api/slides` y presenter SSR comparten estado.
- Datos ciudad: fallback hardcodeado y lectura D1 coexisten en la misma app API.

## Directorios importantes

- `src/lib/api`: auth, tipos y rutas Hono.
- `src/lib/server/db`: acceso a D1.
- `src/lib/client`: logica ejecutada del lado cliente.
- `src/pages`: paginas Astro y endpoint catch-all.
- `db/migrations`: fuente de verdad de esquema D1.
- `public/scripts`: scripts del dashboard y editor.
