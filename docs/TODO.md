# TODO tecnico

Backlog extendido derivado de la auditoria del 2026-03-23.

## P0 - Riesgo inmediato

- [ ] Definir una sola implementacion para el reconocimiento PDF y borrar la duplicada.
- [ ] Decidir si `GET /api/participant/recognition` debe solo validar o volver a entregar el PDF.
- [ ] Agregar smoke tests para login admin, login participante, dashboard, presentaciones y reconocimiento.
- [ ] Cubrir con pruebas los permisos de admin para presentaciones, recursos, blog y participantes.
- [ ] Confirmar que el flujo de reconocimiento no depende de dos layouts distintos entre cliente y servidor.
- [ ] Revisar si el PDF cliente debe seguir cargando el logo como base64 inline o moverse a un asset compartido.
- [ ] Documentar oficialmente el flujo de reconocimiento en README y docs tecnicos.

## P1 - Calidad del sistema

- [ ] Agregar scripts de calidad minima en `package.json`: lint, test y markdown check.
- [ ] Introducir una base de pruebas para rutas Hono criticas.
- [ ] Agregar una verificacion automatica de build antes de deploy.
- [ ] Limpiar imports no usados reportados por `astro check`.
- [ ] Resolver los hints de scripts inline en paginas Astro o documentar por que se mantienen.
- [ ] Revisar chunk size de Vite y definir si amerita code splitting.
- [ ] Verificar que no haya modulos huérfanos en `src/lib/server/documents`.
- [ ] Auditar uso real de Sanity para distinguir integracion activa contra fallback documental.

## P1 - Datos y backend

- [ ] Documentar la politica de fallback de datos en `src/lib/api/app.ts`.
- [ ] Separar claramente modo local, modo demo y modo produccion para datasets fallback.
- [ ] Revisar si algun endpoint responde contenido stale cuando D1 no esta configurado.
- [ ] Auditar consistencia entre migraciones D1 y el uso actual desde `src/lib/server/db`.
- [ ] Agregar una guia operativa para aplicar migraciones remotas sin riesgo.
- [ ] Definir politica de versionado para cambios de esquema y seeds.
- [ ] Validar que las seeds sigan alineadas con el estado funcional del presenter.

## P1 - Auth y seguridad

- [ ] Revisar expiracion, renovacion y revocacion de sesiones admin en KV.
- [ ] Revisar expiracion, renovacion y refresco de sesiones de participante.
- [ ] Confirmar que todos los endpoints de participante sensibles exijan correo verificado en backend.
- [ ] Revisar limites de rate limiting y logging de intentos fallidos.
- [ ] Verificar que no existan respuestas inconsistentes entre frontend y backend para estados de acceso.
- [ ] Documentar amenazas y supuestos del panel admin.

## P1 - Presentaciones

- [ ] Documentar el ciclo completo: admin editor -> `/api/slides` -> presenter.
- [ ] Agregar pruebas basicas de CRUD para presentaciones y slides.
- [ ] Revisar que la duplicacion de slides preserve orden, comentarios y media en todos los casos.
- [ ] Revisar estrategia de cache para presenter y endpoint publico de slides.
- [ ] Confirmar que presentaciones archivadas nunca salgan por rutas publicas.
- [ ] Verificar que el editor no dependa de supuestos fragiles del DOM.

## P1 - Participantes y dashboard

- [ ] Reducir acoplamiento entre dashboard participante y scripts globales del cliente.
- [ ] Separar mejor la logica de UI del dashboard respecto al fetch de datos.
- [ ] Revisar mensajes de error y estados vacios del flujo participante.
- [ ] Confirmar que eliminar cuenta borre todas las dependencias relevantes.
- [ ] Revisar consistencia entre flags `datallerRegistered`, `workshopCompleted` y `recognitionEnabled`.
- [ ] Evaluar si `/registro` ya necesita fragmentarse en componentes mas pequenos.

## P2 - Documentacion

- [ ] Mantener `docs/` como fuente de verdad y evitar volver a dejar markdowns sueltos en la raiz.
- [ ] Marcar de forma explicita cuales documentos son historicos y cuales operativos.
- [ ] Agregar un changelog tecnico o decision log para decisiones de arquitectura.
- [ ] Escribir runbooks para deploy, rollback, migraciones y manejo de incidentes.
- [ ] Agregar una guia corta de onboarding tecnico para nuevos colaboradores.
- [ ] Documentar estructura de bindings Cloudflare, secretos y prerequisitos locales.

## P2 - Infraestructura y deploy

- [ ] Definir pipeline CI para build, pruebas y deploy controlado.
- [ ] Documentar estrategia de rollback en Cloudflare Workers.
- [ ] Revisar si `wrangler.jsonc` necesita separacion mas clara entre local y prod.
- [ ] Confirmar que los secretos criticos no dependan de setup manual no documentado.
- [ ] Agregar checklist previa a deploy.

## P2 - Frontend y UX

- [ ] Revisar consistencia visual entre sitio publico, admin y dashboard participante.
- [ ] Documentar el sistema de estilos y naming conventions de CSS.
- [ ] Revisar accesibilidad de formularios, modales y tablas admin.
- [ ] Validar experiencia mobile del dashboard participante y del presenter.
- [ ] Revisar si el reconocimiento PDF necesita variantes de layout o idioma.

## P3 - Refactor y deuda tecnica

- [ ] Evaluar si conviene extraer utilidades compartidas para PDF, formato y branding.
- [ ] Revisar si las rutas Hono deben dividirse mas por dominio.
- [ ] Detectar funciones demasiado grandes en paginas Astro y moverlas a modulos reutilizables.
- [ ] Reducir contenido hardcodeado que ya deberia vivir en `site.ts`, D1 o Sanity.
- [ ] Revisar activos y scripts legacy que ya no aportan valor.

## Checklist de cierre sugerido

- [ ] README alineado con el comportamiento real.
- [ ] `docs/` consolidado y navegable.
- [ ] Flujo de reconocimiento estabilizado.
- [ ] Cobertura minima automatizada.
- [ ] Pipeline de calidad definido.
- [ ] Runbooks basicos documentados.
