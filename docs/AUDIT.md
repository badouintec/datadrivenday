# Auditoria tecnica

Fecha: 2026-03-23

## Resumen ejecutivo

El proyecto esta en un estado funcional y desplegable. La separacion entre sitio publico, panel admin, dashboard participante y API esta bien resuelta para el tamano del producto. El mayor riesgo actual no es de disponibilidad inmediata sino de coherencia operativa: hay flujos y documentos que ya no representan el comportamiento real del sistema.

## Hallazgos principales

### 1. Deriva fuerte de documentacion

Impacto: alto

- El README anterior describia rutas y comportamientos que ya no coinciden con el codigo actual.
- [MIGRATION-SETUP.md](./MIGRATION-SETUP.md) todavia habla de una base inicial y de placeholders que ya no representan el despliegue productivo actual.
- La carpeta raiz acumula markdowns historicos y operativos sin una jerarquia clara.

Evidencia:

- `src/lib/api/routes/participant.ts`: `GET /recognition` ya no genera PDF; solo valida acceso.
- `src/pages/registro.astro`: el PDF se genera del lado cliente importando `src/lib/client/recognition-pdf.ts`.
- `README.md` anterior seguia documentando descarga por API como si fuera el flujo activo.

### 2. Doble implementacion del reconocimiento PDF

Impacto: alto

- Existe un generador server-side en `src/lib/server/documents/participant-recognition.ts`.
- El flujo activo usa el generador client-side en `src/lib/client/recognition-pdf.ts`.
- Ambos contienen logica de layout similar y el logo embebido en base64, lo que aumenta el riesgo de divergencia visual y de mantenimiento.

Decision pendiente:

- Elegir una sola fuente de verdad para el reconocimiento PDF.

### 3. Falta de pruebas automatizadas y pipeline de calidad

Impacto: alto

- `package.json` no tiene scripts de test, lint o markdown lint.
- El control actual depende de `astro check` y `astro build`, que validan tipado y build pero no comportamiento.
- Cambios en auth, permisos, dashboard participante o admin pueden romperse sin deteccion temprana.

### 4. Fallback de datos publicos demasiado generoso

Impacto: medio

- `src/lib/api/app.ts` incluye un bloque grande de datos fallback para ciudad.
- Esto mejora resiliencia local, pero tambien puede ocultar ausencia de D1 o desactualizacion de datos si no se documenta una politica clara de frescura.

### 5. Documentacion historica dispersa en raiz

Impacto: medio

- Hay multiples archivos `.md` en la raiz con valor distinto: historico, planeacion, auditoria, presentacion y setup.
- Sin un indice, el repo es dificil de navegar para alguien nuevo.

## Fortalezas detectadas

- La separacion entre paginas prerendered y vistas SSR esta bien planteada.
- El despliegue a Cloudflare Workers esta operativo y repetible desde scripts del proyecto.
- El sistema de participantes ya tiene mejores controles de backend para correo verificado, Dataller y reconocimiento.
- El sistema de presentaciones tiene endurecimientos recientes en validacion y manejo de slides.
- La estructura `src/lib/api/routes`, `src/lib/server/db` y `src/pages` es razonable y extensible.

## Riesgos operativos

- Un cambio en el reconocimiento puede requerir tocar dos implementaciones distintas.
- Un contribuidor nuevo puede tomar decisiones usando documentacion vieja.
- La falta de smoke tests deja rutas sensibles sin cobertura minima.

## Recomendacion inmediata

1. Consolidar documentacion viva en `docs/`.
2. Elegir si el reconocimiento PDF vive en cliente o servidor y eliminar la via sobrante.
3. Agregar al menos smoke tests para auth, dashboard participante y presentaciones.
4. Separar la politica de fallback de datos para distinguir modo local, modo demo y modo prod.
