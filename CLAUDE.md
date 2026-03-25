# CLAUDE.md – datadriven.day

## Logo

**El logo oficial es `/public/logo-datadriven-day.png`.**

- NUNCA replicar el logo con código (SVG paths, CSS, canvas, etc.). Siempre usar la imagen PNG original.
- NUNCA usar otro archivo de logo que no sea `logo-datadriven-day.png`.
- El componente `src/components/SiteLogo.astro` es el único punto de uso del logo. Siempre importar `SiteLogo` en vez de referenciar la imagen directamente.
- Tema oscuro: logo blanco (original, sin filtros).
- Tema claro: `filter: invert(1)` aplicado vía CSS para volverlo negro.
- Si necesitas el logo en algún lugar nuevo, usa `<SiteLogo />`, no `<img>` directo.
