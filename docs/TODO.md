# TODO tecnico

Backlog derivado de la auditoria del 2026-03-23.

## P0

- [ ] Definir una sola implementacion para el reconocimiento PDF y borrar la duplicada.
- [ ] Agregar smoke tests para auth admin, login participante, dashboard y presentaciones.
- [ ] Establecer un criterio oficial para el endpoint `GET /api/participant/recognition`: solo validacion o descarga real.

## P1

- [ ] Limpiar y reubicar markdowns historicos de la raiz hacia `docs/` o un directorio archival.
- [ ] Documentar politica de fallback de datos en `src/lib/api/app.ts` y como se comporta en local, preview y prod.
- [ ] Agregar scripts de calidad minima en `package.json`: lint, test y markdown check.
- [ ] Documentar el modelo operativo de bindings Cloudflare, migraciones D1 y secretos.

## P2

- [ ] Reducir acoplamiento entre dashboard participante y scripts globales del cliente.
- [ ] Revisar si el logo embebido en base64 debe vivir en util compartido para evitar duplicacion.
- [ ] Definir una estrategia de CI para build, pruebas y deploy controlado.

## Checklist de cierre sugerido

- [ ] README alineado con el comportamiento real.
- [ ] `docs/` como fuente de verdad.
- [ ] Flujo de reconocimiento estabilizado.
- [ ] Cobertura minima automatizada.
