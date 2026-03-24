# Plan de Migracion y Setup

## 1. Objetivo

Este documento cierra la transicion entre:

- el sitio legacy documentado en [LEGACY-DOCUMENTATION.md](./LEGACY-DOCUMENTATION.md)
- la nueva base sobre Astro, Cloudflare, Hono, D1, R2 y Sanity

Sirve para arrancar el entorno, provisionar infraestructura y migrar contenido sin rehacer trabajo.

## 2. Estado actual del repo

La nueva base ya resuelve lo siguiente:

- frontend publico con Astro
- API pequena montada con Hono en `/api`
- esquema inicial D1 para submissions
- bucket R2 previsto para assets
- Studio de Sanity montado en `/admin`
- lectura opcional desde Sanity con fallback local en home y blog
- formulario real conectado a `POST /api/submissions`

Lo que todavia falta para una version productiva:

- contenido real del evento
- modelos editoriales mas completos en Sanity
- IDs reales de Cloudflare en `wrangler.jsonc`
- assets definitivos
- analytics real

## 3. Setup local

### 3.1 Requisitos

- Node.js 22+
- npm 10+
- cuenta de Cloudflare
- proyecto de Sanity si se quiere activar CMS real

### 3.2 Instalacion

```bash
npm install
cp .env.example .env
```

### 3.3 Variables minimas

En `.env` define como minimo:

```bash
PUBLIC_SITE_URL=http://localhost:4321
PUBLIC_SANITY_PROJECT_ID=replace-me
PUBLIC_SANITY_DATASET=production
SANITY_API_VERSION=2025-03-01
SANITY_PROJECT_ID=replace-me
SANITY_DATASET=production
SANITY_STUDIO_BASE_PATH=/admin
```

Si `PUBLIC_SANITY_PROJECT_ID` sigue en `replace-me`, la app entra en modo fallback y usa contenido local para home y blog.

### 3.4 Comandos utiles

```bash
npm run dev
npm run build
npm run preview
npm run preview:worker
npm run sanity
```

## 4. Provisioning Cloudflare

Provision minimo recomendado:

```bash
wrangler kv namespace create APP_SESSION
wrangler d1 create datadrivenday
wrangler r2 bucket create datadrivenday-assets
```

Despues copia los IDs resultantes a `wrangler.jsonc`:

- `kv_namespaces[].id`
- `d1_databases[].database_id`
- nombre real del bucket si cambia

## 5. Base de datos

La migracion inicial ya existe en `db/migrations/0001_initial.sql`.

Ejecucion local:

```bash
npm run db:migrate:local
```

Ejecucion remota:

```bash
npm run db:migrate:remote
```

Tabla creada:

- `submissions`

Uso actual:

- registros
- contacto
- propuestas

## 6. Sanity

### 6.1 Estado actual

Schemas disponibles:

- `article`
- `eventSettings`

Consumo actual:

- home intenta leer `eventSettings`
- `/blog` intenta leer `article`
- si falla la consulta o no hay credenciales, se usa fallback local

### 6.2 Ruta del Studio

- `/admin`

### 6.3 Siguiente expansion recomendada

Agregar schemas para:

- `speaker`
- `agendaItem`
- `faqItem`
- `resource`
- `sponsor`

## 7. Estrategia de migracion

### Fase 1. Cerrar identidad del evento

Mover a contenido real:

- nombre final del evento
- fecha
- ciudad
- mensaje hero
- URL de registro

Destino recomendado:

- `eventSettings` en Sanity

### Fase 2. Migrar home

Objetivo:

- que la home deje de depender de contenido hardcodeado salvo fallback

Pasos:

1. crear schemas de agenda, speakers y FAQ
2. leerlos desde Astro
3. dejar fallback local solo como red de seguridad

### Fase 3. Migrar blog

Objetivo:

- que el blog pase de tarjetas placeholder a articulos reales

Pasos:

1. cargar articulos reales en Sanity
2. agregar rutas por slug si el proyecto ya necesita detalle de articulo
3. definir taxonomia minima por categoria

### Fase 4. Migrar assets

Objetivo:

- sacar media pesada del repo

Mover a R2:

- PDFs del manual
- booklets
- imagenes de speakers
- social cards
- descargables

### Fase 5. Cerrar formularios

Objetivo:

- pasar de un solo formulario de prueba a flujos de producto

Pasos:

1. crear formularios separados para registro, contacto y propuesta
2. definir metadata por tipo
3. agregar vista interna o export para submissions si hace falta operacion

## 8. Relacion con el legacy

El legacy ya fue analizado en [LEGACY-DOCUMENTATION.md](./LEGACY-DOCUMENTATION.md).

Ese documento debe usarse como fuente para rescatar solo lo valioso:

- narrativa del evento
- estructura editorial
- manual educativo
- lista de secciones y recursos

No conviene migrar literalmente:

- HTML plano
- JS legacy
- placeholders
- librerias CDN no usadas
- patrones visuales atados al micrositio viejo

## 9. Criterio de listo para produccion

La base puede considerarse lista para produccion inicial cuando se cumpla esto:

- `npm run build` en verde
- IDs reales en `wrangler.jsonc`
- D1 operativo con migracion aplicada
- R2 operativo para assets
- Sanity con datos reales de evento y blog
- formulario de registro guardando submissions reales
- favicon, OG image y metadata final definidos
- textos sin referencias residuales a la arquitectura vieja

## 10. Orden recomendado de trabajo

Si solo se va a seguir un orden, que sea este:

1. completar `eventSettings`
2. modelar agenda, speakers y FAQ
3. migrar home a contenido Sanity
4. migrar blog real
5. mover assets a R2
6. cerrar formularios por tipo
7. activar analytics y observabilidad de negocio

## 11. Riesgos a evitar

- meter demasiada logica de negocio en frontend antes de modelar contenido
- depender de Sanity sin fallback durante la migracion
- usar D1 para assets o blobs grandes
- mantener texto de Pages cuando el deploy real es Workers SSR
- migrar basura del legacy en vez de estructura util

## 12. Entregable actual

Al cierre de esta iteracion, el repo ya entrega:

- scaffold moderno validado por build
- deploy path claro
- backend minimo funcional
- CMS base conectado sin volver fragil el build
- plan de migracion ejecutable
