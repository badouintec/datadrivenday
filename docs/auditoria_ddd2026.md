# Auditoría y Brief de Mejoras — Data Driven Day 2026
## Accesibilidad · Interactividad · Performance · UX · Visualizaciones
### Stack: Astro 5 · Cloudflare Workers · Hono · CSS custom properties · JS vanilla

---

## 1. DIAGNÓSTICO VISUAL — LO QUE VEO EN LA PÁGINA ACTUAL

Analizando la imagen de arriba hacia abajo:

**Hero:** Contador regresivo funcionando (181d 05h 50m 02s). Temperatura live (23.2°C). Widget lateral con datos del evento. Copy principal en Syne pesado. Dos CTAs. Fondo oscuro con cuadrícula. Funciona bien pero el contraste del subtítulo parece insuficiente contra el fondo.

**Métricas:** 5 tarjetas en fila (35%, 11%, 48%, 127M, 32.1°C). Los números son grandes pero las etiquetas debajo son muy cortas, sin contexto narrativo. El 32.1°C aparece en rojo, los demás en blanco — buena diferenciación semántica.

**Seis frentes:** Tabla de 2 columnas. Indicadores de color a la izquierda (puntos de colores). Dato clave a la derecha. El accordion parece no estar implementado — las filas se ven como texto estático. Los datos clave en la columna derecha están truncados.

**Dataller de IA:** Timeline horizontal de 5 módulos en cards oscuras con pills de tecnología debajo. Buen diseño pero visualmente muy denso. Los módulos 2 y 3 tienen más texto que los demás, rompiendo la uniformidad visual.

**Estado del arte 2026:** Tabla comparativa con dos columnas (estado del arte vs. obsoleto). Los items de la columna derecha no tienen el efecto tachado visible. La leyenda parece ausente.

**Hermosillo en datos:** Sección nueva implementada. Se ven 3 métricas preview (Último lugar, 23%, 2). Hay un elemento circular (gráfico de dona o similar) y un gráfico de líneas — esto sugiere que alguien intentó agregar visualizaciones pero no están bien integradas con el sistema de diseño. Las 3 columnas de cuellos de botella (Agua, Vivienda, Transporte) se ven bien. Las 3 oportunidades también.

**Recursos:** Grid de tarjetas con filtros. Los filtros están arriba (Todos, Tecnología, Sonora/Urbano). Las tarjetas tienen título, fuente y descripción. Se ve denso.

**Lo que queremos mover en la ciudad:** Bloque de texto + terminal de código a la derecha. Buen contraste visual.

**Únete al proyecto:** Formulario de registro estilo terminal. Funciona conceptualmente.

**Footer:** Simple, links de navegación.

---

## 2. AUDITORÍA DE ACCESIBILIDAD (WCAG 2.1 AA)

### 2.1 Contraste de color — CRÍTICO

El fondo es aproximadamente `#080808`. Los textos muted usan aprox `#525252`. Según WCAG 2.1 AA, texto normal necesita ratio 4.5:1 y texto grande 3:1.

```
#525252 sobre #080808 = ratio ~3.8:1 → FALLA para texto normal (< 4.5:1)
```

**Corrección necesaria:** Subir el color muted a al menos `#6b6b6b` para lograr ratio 4.5:1 contra `#080808`. Para texto de 18px+ o 14px bold, el ratio mínimo es 3:1, por lo que `#525252` pasa para títulos grandes pero falla para body text.

Revisar específicamente:
- Etiquetas de pills de tecnología en el Dataller
- Texto de las tarjetas de recursos (descripción)
- Fuente/año en tarjetas de recursos
- Labels del formulario de registro

**Herramienta de verificación para Copilot:** Usar la fórmula luminancia relativa WCAG en CSS con `color-contrast()` cuando esté disponible, o verificar manualmente con https://webaim.org/resources/contrastchecker/

### 2.2 Semántica HTML — IMPORTANTE

Verificar que la estructura usa heading levels correctos sin saltos:

```html
<!-- CORRECTO -->
<h1>Data Driven Day 2026</h1>          <!-- solo uno por página -->
  <h2>Seis frentes que definen la agenda</h2>
    <h3>Ciudades inteligentes y resilientes</h3>
  <h2>El Dataller de IA</h2>
    <h3>Módulo 1: Setup</h3>
  <h2>Estado del arte 2026</h2>
  <h2>Hermosillo en datos</h2>
    <h3>Los tres frenos</h3>
    <h3>Las tres olas</h3>
  <h2>Recursos</h2>
  <h2>Únete al proyecto</h2>

<!-- INCORRECTO — saltar de h2 a h4 rompe lectores de pantalla -->
<h2>Seis frentes</h2>
  <h4>Ciudades inteligentes</h4>
```

### 2.3 Elementos interactivos — IMPORTANTE

Todos los elementos clickeables necesitan:

```html
<!-- Accordions de los seis frentes: usar <details>/<summary> nativo -->
<details>
  <summary>Ciudades inteligentes y resilientes</summary>
  <!-- contenido expandido -->
</details>

<!-- Si se usan divs clickeables en lugar de botones: AGREGAR role y tabindex -->
<!-- MAL: -->
<div onclick="toggle()">Click aquí</div>

<!-- BIEN: -->
<button type="button" aria-expanded="false" aria-controls="panel-1">
  Ciudades inteligentes y resilientes
</button>
<div id="panel-1" hidden><!-- contenido --></div>

<!-- O mejor aún, usar <details>/<summary> que maneja todo automáticamente -->
```

### 2.4 Contador regresivo — IMPORTANTE

El contador actualiza cada segundo. Esto puede ser problemático para usuarios con `prefers-reduced-motion`. Además, el contador debe tener un `aria-live` region para screen readers, pero NO con política `assertive` (interrumpiría constantemente).

```javascript
// El contador NO debe usar aria-live="polite" ni "assertive" en el elemento
// que cambia cada segundo — sería demasiado ruidoso para screen readers.
// En su lugar:

// 1. Hacer el contador aria-hidden y proveer un texto estático para SR
<div aria-hidden="true" id="countdown">181d 05h 50m 02s</div>
<span class="sr-only">
  El evento es el 28 de marzo de 2026 a las 8:30 AM
</span>
```

### 2.5 Formulario de registro — IMPORTANTE

El formulario estilo terminal es creativo pero puede ser problemático para accesibilidad. Verificar:

```html
<!-- Cada "línea de terminal" que actúa como input necesita: -->
<label for="nombre" class="sr-only">Tu nombre completo</label>
<input
  type="text"
  id="nombre"
  name="nombre"
  required
  aria-required="true"
  autocomplete="given-name"
  placeholder="nombre completo"
/>

<!-- Error states deben ser programáticos: -->
<input
  aria-describedby="nombre-error"
  aria-invalid="true"
/>
<span id="nombre-error" role="alert">
  El nombre es requerido
</span>
```

### 2.6 Imágenes y SVGs decorativos

```html
<!-- SVGs decorativos (fondo cuadrícula, íconos decorativos): -->
<svg aria-hidden="true" focusable="false">...</svg>

<!-- SVGs informativos necesitan título: -->
<svg role="img" aria-labelledby="chart-title">
  <title id="chart-title">Gráfica de crecimiento de empleo en Hermosillo vs ciudades comparativas</title>
  ...
</svg>
```

### 2.7 Clase sr-only necesaria en global.css

Si no existe, agregar:

```css
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
```

### 2.8 Focus visible — IMPORTANTE

En dark mode con fondo negro, el outline de focus por defecto del navegador (azul) puede desaparecer. Agregar en global.css:

```css
/* Focus visible personalizado que funciona en dark mode */
:focus-visible {
  outline: 2px solid var(--color-accent-amber);
  outline-offset: 3px;
  border-radius: 2px;
}

/* Remover outline solo cuando no es focus por teclado */
:focus:not(:focus-visible) {
  outline: none;
}
```

### 2.9 skip-to-content link

Agregar como primer elemento del body en BaseLayout.astro:

```html
<a href="#main-content" class="skip-link">
  Saltar al contenido principal
</a>

<main id="main-content" tabindex="-1">
  <!-- contenido de la página -->
</main>
```

```css
.skip-link {
  position: absolute;
  top: -100%;
  left: 1rem;
  z-index: 9999;
  padding: 0.5rem 1rem;
  background: var(--color-accent-amber);
  color: var(--color-bg);
  font-family: var(--font-mono);
  font-size: 0.85rem;
  text-decoration: none;
  transition: top 200ms;
}

.skip-link:focus {
  top: 1rem;
}
```

---

## 3. MEJORAS DE INTERACTIVIDAD — JS VANILLA

### 3.1 Accordions de los Seis Frentes — reemplazar rows estáticos

Actualmente las filas de la tabla de seis frentes parecen estáticas. Implementar con `<details>`/`<summary>` nativo:

```html
<!-- En index.astro, reemplazar la tabla estática con: -->
<div class="frentes-list" role="list">
  {frentes.map((frente) => (
    <details class={`frente-item frente-item--${frente.color}`} role="listitem">
      <summary class="frente-summary">
        <span class={`frente-dot frente-dot--${frente.color}`} aria-hidden="true"></span>
        <span class="frente-title">{frente.titulo}</span>
        <span class="frente-dato-preview" aria-hidden="true">{frente.datoPreview}</span>
        <span class="frente-chevron" aria-hidden="true">›</span>
      </summary>
      <div class="frente-content-wrapper">
        <div class="frente-content">
          <p class="frente-diagnostico">{frente.diagnostico}</p>
          <code class="frente-dato-full">{frente.datoCompleto}</code>
          <a href={frente.fuente} target="_blank" rel="noopener noreferrer" class="frente-source-link">
            Ver fuente →
          </a>
        </div>
      </div>
    </details>
  ))}
</div>
```

```css
/* Animación de apertura con grid — CSS puro, sin JS */
.frente-content-wrapper {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 280ms cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
}

details[open] .frente-content-wrapper {
  grid-template-rows: 1fr;
}

.frente-content {
  min-height: 0;
  padding: 0;
  overflow: hidden;
}

details[open] .frente-content {
  padding: var(--space-md) 0;
}

/* Rotar chevron al abrir */
.frente-chevron {
  display: inline-block;
  transition: transform 280ms ease;
  margin-left: auto;
  font-size: 1.2rem;
  color: var(--color-text-muted);
}

details[open] .frente-chevron {
  transform: rotate(90deg);
}

/* Quitar marker por defecto */
.frente-summary { list-style: none; }
.frente-summary::-webkit-details-marker { display: none; }

@media (prefers-reduced-motion: reduce) {
  .frente-content-wrapper { transition: none; }
  .frente-chevron { transition: none; }
}
```

### 3.2 Tabla Estado del Arte — animación clip-path al hacer scroll

```javascript
// En BaseLayout.astro o como script en index.astro
// Activa el efecto tachado en tecnologías obsoletas al entrar al viewport

const strikeObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        strikeObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.5 }
);

document
  .querySelectorAll('.tech-obsolete')
  .forEach((el) => strikeObserver.observe(el));
```

```css
/* En global.css */
@keyframes strikethrough {
  from { clip-path: inset(0 100% 0 0); }
  to   { clip-path: inset(0 -2px 0 0); }
}

.tech-obsolete {
  position: relative;
  color: var(--color-text-muted);
}

.tech-obsolete::after {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  width: 100%;
  height: 1px;
  background-color: var(--color-accent-heat);
  clip-path: inset(0 100% 0 0);
  transition: none;
}

.tech-obsolete.is-visible::after {
  animation: strikethrough 600ms ease-out 200ms forwards;
}

@media (prefers-reduced-motion: reduce) {
  .tech-obsolete.is-visible::after {
    animation: none;
    clip-path: inset(0 -2px 0 0);
  }
}
```

```html
<!-- Agregar leyenda ANTES de la tabla -->
<div class="arte-leyenda" aria-label="Leyenda de la tabla">
  <span class="leyenda-item">
    <span class="leyenda-dot leyenda-dot--go" aria-hidden="true"></span>
    Estado del arte 2026
  </span>
  <span class="leyenda-item">
    <span class="leyenda-dot leyenda-dot--obsoleto" aria-hidden="true"></span>
    Riesgo técnico
  </span>
</div>
```

### 3.3 Filtros de recursos — JS con data-filter attributes

```javascript
// Script vanilla para filtros — sin recarga de página

const filterBtns = document.querySelectorAll('[data-filter-btn]');
const resourceCards = document.querySelectorAll('[data-filter-cat]');

filterBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    const filter = btn.dataset.filterBtn;

    // Actualizar estado activo
    filterBtns.forEach((b) => {
      b.classList.remove('is-active');
      b.setAttribute('aria-pressed', 'false');
    });
    btn.classList.add('is-active');
    btn.setAttribute('aria-pressed', 'true');

    // Filtrar tarjetas
    resourceCards.forEach((card) => {
      const cats = card.dataset.filterCat.split(' ');
      const matches = filter === 'todos' || cats.includes(filter);

      card.style.transition = 'opacity 200ms ease, transform 200ms ease';

      if (matches) {
        card.style.opacity = '1';
        card.style.transform = 'scale(1)';
        card.removeAttribute('aria-hidden');
        card.style.pointerEvents = 'auto';
      } else {
        card.style.opacity = '0.2';
        card.style.transform = 'scale(0.97)';
        card.setAttribute('aria-hidden', 'true');
        card.style.pointerEvents = 'none';
      }
    });
  });
});
```

```html
<!-- Markup de filtros con aria-pressed -->
<div class="recursos-filtros" role="group" aria-label="Filtrar recursos por categoría">
  <button
    data-filter-btn="todos"
    class="filtro-btn is-active"
    aria-pressed="true"
    type="button"
  >
    Todos
  </button>
  <button data-filter-btn="gobernanza" class="filtro-btn" aria-pressed="false" type="button">
    Gobernanza
  </button>
  <button data-filter-btn="tecnologia" class="filtro-btn" aria-pressed="false" type="button">
    Tecnología
  </button>
  <button data-filter-btn="sonora" class="filtro-btn" aria-pressed="false" type="button">
    Sonora / Urbano
  </button>
</div>

<!-- Cada tarjeta lleva data-filter-cat con uno o más valores separados por espacio -->
<div class="recurso-card" data-filter-cat="tecnologia">...</div>
<div class="recurso-card" data-filter-cat="sonora gobernanza">...</div>
```

### 3.4 Scroll progress indicator

```javascript
// Línea de progreso en la parte superior del viewport
// No usa requestAnimationFrame constantemente — usa scroll event con throttle

const progressBar = document.querySelector('.scroll-progress');

let ticking = false;
window.addEventListener('scroll', () => {
  if (!ticking) {
    requestAnimationFrame(() => {
      const scrolled = window.scrollY;
      const total = document.documentElement.scrollHeight - window.innerHeight;
      const progress = Math.min((scrolled / total) * 100, 100);
      progressBar.style.transform = `scaleX(${progress / 100})`;
      ticking = false;
    });
    ticking = true;
  }
});
```

```html
<!-- En BaseLayout.astro, justo después del <body> -->
<div
  class="scroll-progress"
  role="progressbar"
  aria-label="Progreso de lectura de la página"
  aria-valuemin="0"
  aria-valuemax="100"
  aria-valuenow="0"
></div>
```

```css
.scroll-progress {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 2px;
  background-color: var(--color-accent-amber);
  transform: scaleX(0);
  transform-origin: left;
  z-index: 9998;
  will-change: transform;
}

@media (prefers-reduced-motion: reduce) {
  .scroll-progress { display: none; }
}
```

---

## 4. VISUALIZACIONES — REEMPLAZAR LOS GRÁFICOS ACTUALES

La imagen muestra un gráfico de dona y un gráfico de líneas en la sección "Hermosillo en datos" que no están bien integrados con el sistema de diseño. Proponer reemplazarlos con visualizaciones en SVG inline puro, sin Chart.js ni D3 (para no agregar dependencias).

### 4.1 Gráfico de barras horizontales — Empleo HMO vs ciudades (reemplaza el gráfico de líneas)

Crear `src/components/GraficaEmpleoHMO.astro`:

```typescript
---
// Datos extraídos del informe Growth Lab Harvard 2024
// Período 2018-2023: tasa de crecimiento promedio anual del empleo

const ciudades = [
  { nombre: "Tijuana",         valor: 2.3, color: "go"   },
  { nombre: "Reynosa",         valor: 2.1, color: "go"   },
  { nombre: "Juárez",          valor: 1.9, color: "go"   },
  { nombre: "Mexicali",        valor: 1.7, color: "go"   },
  { nombre: "Monterrey",       valor: 1.5, color: "go"   },
  { nombre: "Saltillo",        valor: 1.4, color: "go"   },
  { nombre: "Querétaro",       valor: 1.2, color: "go"   },
  { nombre: "Hermosillo",      valor: 0.3, color: "heat" },
  { nombre: "Guadalajara",     valor: 0.2, color: "data" },
  { nombre: "San Luis Potosí", valor: -0.1, color: "amber"},
];

const max = Math.max(...ciudades.map(c => c.valor));
---
```

```html
<div class="grafica-wrapper" role="img" aria-label="Crecimiento del empleo en Hermosillo vs ciudades comparativas 2018-2023. Hermosillo ocupa el penúltimo lugar con 0.3% anual.">
  <p class="grafica-titulo">Crecimiento del empleo 2018–2023</p>
  <p class="grafica-subtitulo">Tasa de crecimiento promedio anual · Growth Lab Harvard 2024</p>

  <div class="barras-container" aria-hidden="true">
    {ciudades.map((ciudad) => {
      const width = Math.max(0, (ciudad.valor / max) * 100);
      return (
        <div class="barra-row">
          <span class="barra-label" class:list={{ 'barra-label--highlight': ciudad.nombre === 'Hermosillo' }}>
            {ciudad.nombre}
          </span>
          <div class="barra-track">
            <div
              class={`barra-fill barra-fill--${ciudad.color}`}
              style={`width: ${width}%; --delay: ${ciudades.indexOf(ciudad) * 60}ms`}
            ></div>
          </div>
          <span class="barra-valor">{ciudad.valor > 0 ? '+' : ''}{ciudad.valor}%</span>
        </div>
      );
    })}
  </div>
</div>
```

```css
<style>
.grafica-wrapper {
  padding: var(--space-md) 0;
}

.grafica-titulo {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 0.9rem;
  color: var(--color-text-primary);
  margin-bottom: 2px;
}

.grafica-subtitulo {
  font-family: var(--font-mono);
  font-size: 0.65rem;
  color: var(--color-text-muted);
  letter-spacing: 0.06em;
  margin-bottom: var(--space-md);
}

.barras-container {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.barra-row {
  display: grid;
  grid-template-columns: 140px 1fr 48px;
  align-items: center;
  gap: 8px;
}

.barra-label {
  font-family: var(--font-mono);
  font-size: 0.72rem;
  color: var(--color-text-muted);
  text-align: right;
  white-space: nowrap;
}

.barra-label--highlight {
  color: var(--color-accent-heat);
  font-weight: 700;
}

.barra-track {
  background-color: var(--color-border);
  height: 6px;
  border-radius: 1px;
  overflow: hidden;
}

.barra-fill {
  height: 100%;
  border-radius: 1px;
  width: 0;
  animation: barra-in 600ms ease-out var(--delay, 0ms) forwards;
}

@keyframes barra-in {
  from { width: 0; }
  to   { width: var(--target-width, 100%); }
}

/* Copilot: aplicar el width real via JS o usar CSS custom property */
/* Alternativa sin JS: usar width directamente en el style inline del elemento */

.barra-fill--go    { background-color: var(--color-accent-go); }
.barra-fill--heat  { background-color: var(--color-accent-heat); }
.barra-fill--amber { background-color: var(--color-accent-amber); }
.barra-fill--data  { background-color: var(--color-accent-data); }

.barra-valor {
  font-family: var(--font-mono);
  font-size: 0.7rem;
  color: var(--color-text-muted);
  text-align: right;
}

@media (prefers-reduced-motion: reduce) {
  .barra-fill { animation: none; }
}
</style>
```

**Nota para Copilot:** La animación de las barras necesita que el `width` inicial sea `0` y el `width` final sea el valor calculado. La forma más limpia en Astro sin JS es usar `style={`width: ${width}%`}` directamente y agregar `animation-fill-mode: forwards` con `will-change: width`. Alternativamente, usar IntersectionObserver para agregar una clase `.animate` cuando la sección entra al viewport.

### 4.2 Sparklines inline en la tabla de Seis Frentes

En lugar del gráfico de dona actual (que no encaja), agregar sparklines SVG inline en cada fila de la tabla de seis frentes para dar contexto visual rápido:

```typescript
// En site.ts, agregar datos de sparkline a cada frente
export const frentes = [
  {
    id: "ciudades",
    titulo: "Ciudades inteligentes y resilientes",
    color: "data",
    datoPreview: "Mercado IoT Smart Cities: $650B en 2026",
    sparkline: [40, 52, 61, 70, 78, 85, 95, 100], // índice normalizado 0-100
    // ...
  },
  // ...
];
```

```html
<!-- SVG sparkline inline — sin librerías externas -->
{(() => {
  const points = frente.sparkline;
  const w = 80, h = 24;
  const max = Math.max(...points);
  const coords = points.map((v, i) => {
    const x = (i / (points.length - 1)) * w;
    const y = h - (v / max) * h;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      aria-hidden="true"
      class="frente-sparkline"
    >
      <polyline
        points={coords}
        fill="none"
        stroke={`var(--color-accent-${frente.color})`}
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  );
})()}
```

---

## 5. PERFORMANCE Y CORE WEB VITALS

### 5.1 LCP (Largest Contentful Paint)

El elemento LCP probable es el H1 del hero ("Data Driven Day 2026"). Syne 900 debe estar preloaded:

```html
<!-- En BaseLayout.astro, dentro del <head>, ANTES de cualquier stylesheet -->
<link
  rel="preload"
  href="https://fonts.gstatic.com/s/syne/v22/8vIS7w4qzmVxsWxjBZRjr0FKM_04uQ.woff2"
  as="font"
  type="font/woff2"
  crossorigin="anonymous"
/>
```

El texto del hero no debería necesitar `font-display: swap` si Syne está preloaded correctamente. Si hay FOUT (flash of unstyled text), agregar `font-display: optional` para eliminar el cambio de layout.

### 5.2 CLS (Cumulative Layout Shift)

El widget de temperatura hace un fetch al cargar. Si tarda, el espacio donde debe aparecer puede causar CLS. Solución:

```css
/* Reservar espacio para el widget de temperatura antes de que cargue */
.temperatura-widget {
  min-height: 24px; /* altura del contenido cargado */
  /* No usar display:none que elimina el espacio */
}

.temperatura-widget[data-loading] {
  /* Placeholder visual mientras carga */
  background: var(--color-border);
  border-radius: 2px;
  width: 80px;
}
```

```javascript
// Al iniciar el fetch, agregar data-loading
const tempWidget = document.querySelector('.temperatura-widget');
tempWidget.dataset.loading = 'true';

fetch('https://api.open-meteo.com/v1/forecast?...')
  .then(r => r.json())
  .then(data => {
    delete tempWidget.dataset.loading;
    tempWidget.textContent = `${data.current.temperature_2m}°C`;
  })
  .catch(() => {
    delete tempWidget.dataset.loading;
    tempWidget.textContent = '--°C';
  });
```

### 5.3 FID/INP (Interaction to Next Paint)

Los event listeners del contador regresivo y los filtros de recursos no deben bloquear el main thread. Usar `requestIdleCallback` para inicializar elementos no críticos:

```javascript
// Contador regresivo: CRÍTICO — inicializar inmediatamente
initCountdown();

// Filtros de recursos: NO CRÍTICO — inicializar cuando el browser esté idle
if ('requestIdleCallback' in window) {
  requestIdleCallback(() => initFilters());
} else {
  setTimeout(() => initFilters(), 100);
}

// Intersection Observers: NO CRÍTICO
if ('requestIdleCallback' in window) {
  requestIdleCallback(() => {
    initCounterAnimations();
    initStrikeAnimations();
    initBarAnimations();
  });
}
```

### 5.4 Resource hints para Sanity

```html
<!-- En BaseLayout.astro -->
<link rel="preconnect" href="https://cdn.sanity.io" crossorigin />
<link rel="dns-prefetch" href="https://cdn.sanity.io" />
```

---

## 6. MEJORAS DE COPY Y MICROCOPY

### 6.1 Hero — subtítulo con contexto local

```
ACTUAL (aprox):
"Data Driven Day es la plataforma para impulsar datos, ciudad e inteligencia 
aplicada en Hermosillo."

PROPUESTO:
"Hermosillo crece más lento que Querétaro, Saltillo y Tijuana.
Sus tres mayores frenos son el agua, la vivienda y el transporte.
Los datos y la IA son las herramientas para cambiar eso.
El Dataller es donde empieza el trabajo."
```

### 6.2 Métricas — líneas de contexto

Agregar una línea `<small>` debajo de cada número grande:

```
35%   → "Empresas en HMO que consideran asequible el agua (50% promedio nacional)"
11%   → [mantener dato actual + fuente]
48%   → [mantener dato actual + fuente]  
127M  → [mantener dato actual + fuente]
32.1°C → "Temperatura récord proyectada para verano 2026 · Open-Meteo"
```

### 6.3 CTAs — texto más directo

```
ACTUAL: "Registrarse" / "Ver Dataller"
PROPUESTO: "Reservar mi lugar" / "Ver la agenda"

FORMULARIO — confirmation message:
ACTUAL (aprox): "Registro confirmado"
PROPUESTO: "Listo. Te vemos el 28 de marzo a las 8:30 AM en el Design Thinking Lab."
```

### 6.4 Estado del arte — leyenda antes de la tabla

```
Agregar texto justo antes de la tabla:
"Lo que el estado del arte define hoy. Y lo que ya es deuda técnica."
```

---

## 7. MOBILE — AJUSTES RESPONSIVOS FALTANTES

Analizando la imagen (que muestra desktop), hay patrones que probablemente fallan en mobile:

### 7.1 Módulos del Dataller

El timeline horizontal de 5 módulos en cards seguramente desborda en móvil. Proponer:

```css
.dataller-modules {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 1px;
  background: var(--color-border);
}

/* En mobile: apilar verticalmente */
@media (max-width: 768px) {
  .dataller-modules {
    grid-template-columns: 1fr;
  }
}

/* En tablet: 2 o 3 columnas */
@media (min-width: 480px) and (max-width: 1023px) {
  .dataller-modules {
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  }
}
```

### 7.2 Barra de progreso del Dataller (horario)

La barra de tiempo encima de los módulos (8:30 AM a 3:00 PM con color) debe colapsarse en móvil o convertirse en etiquetas de hora dentro de cada módulo.

### 7.3 Tabla de estado del arte

Las dos columnas de la tabla pueden no caber en pantallas < 480px. Proponer:

```css
@media (max-width: 480px) {
  .arte-table {
    display: block;
  }
  
  .arte-table thead {
    display: none; /* Ocultar headers */
  }
  
  .arte-table tbody tr {
    display: block;
    border: 1px solid var(--color-border);
    margin-bottom: 8px;
    padding: var(--space-sm);
  }
  
  .arte-table td::before {
    /* Mostrar el header como label antes de cada celda */
    content: attr(data-label);
    display: block;
    font-family: var(--font-mono);
    font-size: 0.65rem;
    color: var(--color-text-muted);
    letter-spacing: 0.08em;
    margin-bottom: 4px;
  }
}
```

```html
<!-- Cada td debe tener data-label: -->
<td data-label="ESTADO DEL ARTE 2026">TabPFN / TabICLv2 (ICL)</td>
<td data-label="RIESGO TÉCNICO" class="tech-obsolete">Fine-tuning manual XGBoost</td>
```

### 7.4 Grilla de métricas Harvard

En pantallas muy pequeñas (< 360px), las 4 métricas de Harvard con números grandes pueden desbordarse. Usar `font-size: clamp()`:

```css
.metric-value {
  font-size: clamp(1.8rem, 8vw, 4rem);
}
```

---

## 8. DARK MODE Y SISTEMA DE COLOR

La página está en dark mode permanente. Si en el futuro se quiere soporte dual:

```css
/* En :root, definir los tokens para light mode */
:root {
  --color-bg: #ffffff;
  --color-surface: #f5f5f5;
  --color-border: #e0e0e0;
  --color-text-primary: #0a0a0a;
  --color-text-muted: #6b6b6b;
}

/* Dark mode automático */
@media (prefers-color-scheme: dark) {
  :root {
    --color-bg: #080808;
    --color-surface: #0f0f0f;
    --color-border: #1a1a1a;
    --color-text-primary: #fafafa;
    --color-text-muted: #6b6b6b;
  }
}

/* Si el usuario tiene preferencia explícita en el sitio */
[data-theme="light"] { /* tokens light */ }
[data-theme="dark"]  { /* tokens dark  */ }
```

Por ahora, dado que el sitio es permanentemente dark, asegurarse de que `color-scheme: dark` esté declarado en `:root` para que los elementos del navegador (scrollbars, inputs nativos) también sean dark:

```css
:root {
  color-scheme: dark;
}
```

---

## 9. NUEVAS SECCIONES PROPUESTAS

### 9.1 Timeline interactivo del evento — entre Hero y Métricas

Un bloque muy compacto que muestra el programa del día del Dataller como timeline horizontal con hora, título del bloque y tipo de actividad (taller / presentación / comida):

```html
<section class="evento-timeline" aria-label="Programa del día 28 de marzo">
  <div class="timeline-track">
    <div class="timeline-item" style="--start: 0%; --duration: 8%;">
      <span class="timeline-hora">8:30</span>
      <span class="timeline-tipo timeline-tipo--registro">Registro</span>
    </div>
    <div class="timeline-item" style="--start: 8%; --duration: 12%;">
      <span class="timeline-hora">9:00</span>
      <span class="timeline-tipo timeline-tipo--taller">Módulo 1</span>
    </div>
    <!-- ... -->
    <div class="timeline-item" style="--start: 75%; --duration: 10%;">
      <span class="timeline-hora">13:00</span>
      <span class="timeline-tipo timeline-tipo--comida">Comida</span>
    </div>
    <div class="timeline-item" style="--start: 85%; --duration: 15%;">
      <span class="timeline-hora">14:00</span>
      <span class="timeline-tipo timeline-tipo--proyectos">Proyectos</span>
    </div>
  </div>
  <div class="timeline-axis">
    <span>8:30 AM</span>
    <span>3:00 PM</span>
  </div>
</section>
```

### 9.2 Contador de cupos — en el formulario de registro

Un indicador visual que muestra cuántos lugares quedan. Leer de D1 via `/api/cupos`:

```typescript
// En src/lib/api/app.ts (Hono)
app.get('/api/cupos', async (c) => {
  const db = c.env.DB;
  const result = await db
    .prepare('SELECT COUNT(*) as total FROM submissions WHERE type = ?')
    .bind('registration')
    .first<{ total: number }>();

  const MAX_CUPOS = 40; // Ajustar según capacidad real del Design Thinking Lab
  const ocupados = result?.total ?? 0;
  const disponibles = Math.max(0, MAX_CUPOS - ocupados);

  return c.json({
    total: MAX_CUPOS,
    ocupados,
    disponibles,
    porcentaje: Math.round((ocupados / MAX_CUPOS) * 100),
  });
});
```

```javascript
// En el cliente — fetch al cargar la página
fetch('/api/cupos')
  .then(r => r.json())
  .then(({ disponibles, porcentaje }) => {
    const cuposEl = document.querySelector('.cupos-disponibles');
    const barraEl = document.querySelector('.cupos-barra');

    if (cuposEl) cuposEl.textContent = `${disponibles} lugares disponibles`;
    if (barraEl) barraEl.style.width = `${porcentaje}%`;
  })
  .catch(() => {
    // Fail silently — el formulario sigue funcionando
  });
```

```html
<!-- En el formulario de registro -->
<div class="cupos-display" aria-live="polite">
  <div class="cupos-barra-track">
    <div class="cupos-barra" style="width: 0%"></div>
  </div>
  <span class="cupos-disponibles">Cargando disponibilidad...</span>
</div>
```

---

## 10. CHECKLIST FINAL PARA COPILOT

Antes de dar por terminada cualquier implementación, verificar:

**Accesibilidad:**
- [ ] Todos los `<img>` tienen `alt` descriptivo o `alt=""` si son decorativos
- [ ] Todos los SVG decorativos tienen `aria-hidden="true"`
- [ ] Todos los SVG informativos tienen `role="img"` y `<title>`
- [ ] Todos los botones tienen texto accesible (no solo íconos)
- [ ] Los accordions (`<details>`) funcionan con teclado (Tab, Enter, Space)
- [ ] Los filtros tienen `aria-pressed` que se actualiza con JS
- [ ] El formulario tiene `<label>` asociado a cada `<input>` (visualmente ocultos si necesario con `.sr-only`)
- [ ] Los errores de validación usan `role="alert"` o `aria-live="assertive"`
- [ ] El contrast ratio de todo el texto es mínimo 4.5:1 para texto normal y 3:1 para texto grande
- [ ] El skip-link existe y funciona con Tab desde el inicio de la página
- [ ] El `focus-visible` tiene outline visible en todos los elementos interactivos
- [ ] `color-scheme: dark` está declarado en `:root`

**Performance:**
- [ ] Syne font preloaded en el `<head>`
- [ ] Widget de temperatura tiene espacio reservado (sin CLS)
- [ ] Intersection Observers se inicializan con `requestIdleCallback`
- [ ] Todos los `<a target="_blank">` tienen `rel="noopener noreferrer"`

**Interactividad:**
- [ ] `prefers-reduced-motion` desactiva todas las animaciones CSS
- [ ] El contador regresivo tiene `aria-hidden` y texto alternativo estático para SR
- [ ] Las barras animadas tienen `animation-play-state: paused` si `prefers-reduced-motion`
- [ ] Los filtros de recursos filtran sin recargar la página
- [ ] El tachado de la tabla de estado del arte se activa con Intersection Observer

**Stack:**
- [ ] No se instaló ningún paquete npm nuevo sin necesidad
- [ ] No se usa React, Vue ni ningún framework JS de componentes
- [ ] No se usa Tailwind ni clases utilitarias externas
- [ ] Todo el JS nuevo es vanilla con TypeScript tipado
- [ ] Los nuevos componentes son archivos `.astro`
- [ ] Los datos nuevos están en `src/data/site.ts` como arrays tipados con interfaces exportadas
- [ ] Nada usa `client:load` sin justificación (el JS en `<script>` de Astro ya es cliente)

---

## 11. REFERENCIAS Y FUENTES DE DATOS

Todos los datos de la sección Hermosillo en datos provienen de:

```
Hermosillo ¿Cómo Vamos? (2025). Hermosillo con futuro: cómo podemos acelerar
su crecimiento. Agenda hacia la diversificación, la innovación y una mejor
calidad de vida. Hermosillo, México: Observatorio para la Competitividad y el
Desarrollo de Sonora A.C. Licencia CC BY-NC-SA 4.0.

Basado en: Growth Lab, Harvard Kennedy School (2024). Crecimiento a través de
la Diversificación en Hermosillo. Ricardo Hausmann (director).
https://growthlab.hks.harvard.edu/policy-research/economic-growth-strategies-hermosillo
https://www.hermosillocomovamos.org

Datos de temperatura en tiempo real:
Open-Meteo API (gratuita, sin API key para uso no comercial)
https://api.open-meteo.com/v1/forecast?latitude=29.07&longitude=-110.97&current=temperature_2m
```
