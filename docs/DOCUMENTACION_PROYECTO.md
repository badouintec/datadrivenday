# Documentacion del Proyecto Data Driven Day

## 1. Resumen ejecutivo

Este repositorio contiene un sitio web estatico para el evento Data Driven Day, enfocado en datos abiertos, analisis de datos y politicas publicas en Hermosillo.

No hay backend, build system ni gestor de dependencias del lado del proyecto. Todo funciona con HTML, CSS y JavaScript vanilla, apoyado por librerias externas cargadas desde CDN.

El proyecto esta organizado como un micrositio con varias paginas enlazadas entre si:

- Pagina principal del evento.
- Pagina de blog.
- Pagina de busqueda.
- Pagina de recursos de datos abiertos.
- Pagina manual tipo booklet o guia extendida.

En estado actual, el sitio ya comunica bien la propuesta del evento, pero mezcla contenido terminado con contenido de demostracion, placeholders y algunas funciones incompletas.

## 2. Objetivo del sitio

El sitio busca posicionar y explicar un evento presencial llamado Data Driven Day: Transformando Datos en Politicas Publicas.

Sus objetivos principales son:

- Presentar el evento y su agenda.
- Explicar su valor para asistentes potenciales.
- Facilitar el registro.
- Publicar contenido editorial relacionado con datos y politicas publicas.
- Ofrecer una pagina de recursos de datos abiertos.
- Servir como base para un manual educativo de consulta.

## 3. Tipo de proyecto

Es un sitio estatico multipagina.

Caracteristicas tecnicas clave:

- Sin framework.
- Sin empaquetador.
- Sin proceso de compilacion.
- Sin API propia.
- Sin persistencia del lado del servidor.
- Navegacion basada en enlaces HTML y anclas.
- Interactividad implementada solo con JavaScript del navegador.

## 4. Estructura del repositorio

Archivos presentes:

- `index.html`: pagina principal del evento.
- `styles.css`: hoja de estilos global compartida.
- `script.js`: logica principal compartida del sitio.
- `blogs.html`: pagina del blog.
- `busqueda.html`: pagina de resultados de busqueda.
- `busqueda.js`: motor de busqueda cliente.
- `datos.html`: pagina de datos abiertos, tutoriales y proyectos.
- `manual.html`: manual extendido del tema.
- `manual-styles.css`: estilos especificos del manual.
- `manual-script.js`: navegacion interna del manual.
- `README.md`: descripcion general breve del proyecto.
- `LICENSE`: licencia del repositorio.

No existen carpetas `assets`, `img`, `js`, `css` ni estructura modular adicional. Todo esta en la raiz.

## 5. Arquitectura funcional

### 5.1 Capa de presentacion

La interfaz se construye con HTML semantico y CSS responsivo.

Elementos recurrentes:

- Navbar fija.
- Hero superior.
- Secciones con alternancia de fondo claro y fondo gris.
- Botones CTA.
- Footer compartido visualmente.
- Animaciones de entrada al hacer scroll.

### 5.2 Capa de comportamiento

La logica se divide en tres scripts:

- `script.js`: comportamiento compartido general.
- `busqueda.js`: indexacion y busqueda local.
- `manual-script.js`: paginacion interna del manual por hash.

### 5.3 Dependencias externas

Se consumen via CDN:

- Google Fonts: tipografia Poppins.
- Font Awesome 6.5.1: iconografia.
- Chart.js: declarado en `index.html` y `datos.html`.
- D3.js: declarado en `datos.html`.
- CountUp.js: declarado en `index.html`.

Importante: varias de estas dependencias estan cargadas, pero no todas se usan realmente en el codigo actual.

## 6. Paginas y su funcion

### 6.1 `index.html`

Es la pagina principal y el centro del proyecto.

Contenido funcional:

- Hero con mensaje principal del evento.
- Contador regresivo.
- Fecha, horario y lugar.
- Seccion explicativa del evento.
- Boton para abrir una presentacion modal.
- Seccion de beneficios.
- Agenda del dia.
- Instituciones participantes.
- Bootcamp.
- Seguimiento post-evento.
- Booklet o recurso exclusivo.
- Perfil de asistentes.
- Lugar con mapa embebido de Google Maps.
- Organizadores.
- Blog destacado con dos articulos.
- Registro con CTA externo.
- Contacto.
- FAQ.
- Footer.

Tambien incluye:

- Metadatos SEO.
- Open Graph y Twitter Card.
- JSON-LD tipo `Event` para buscadores.
- Modal de presentacion con 5 slides.

### 6.2 `blogs.html`

Es una pagina editorial con estructura de blog.

Incluye:

- Hero del blog.
- Dos articulos largos.
- Sidebar con buscador.
- Categorias.
- Articulos populares.
- Newsletter.
- Etiquetas.
- CTA final para registrarse al evento.

El contenido es principalmente estatico. La busqueda del sidebar se conecta a `busqueda.js`.

### 6.3 `busqueda.html`

Es la pagina de resultados del motor de busqueda local.

Incluye:

- Hero de busqueda.
- Formulario de busqueda principal.
- Contador de resultados.
- Contenedor donde se inyectan resultados con JavaScript.

No consulta servidor. Los resultados se obtienen desde un indice local armado en el navegador.

### 6.4 `datos.html`

Es una pagina de recursos y aprendizaje sobre datos abiertos.

Contiene:

- Hero de datos.
- Buscador ligado al motor local.
- Seccion principal con tabs.
- Tab de fuentes de datos.
- Tab de visualizaciones.
- Tab de tutoriales.
- Tab de proyectos.
- Seccion de foro de discusion.
- CTA final para el evento.

La intencion de esta pagina es ir mas alla de promocionar el evento: quiere convertirse en repositorio de recursos, ejemplos y comunidad.

### 6.5 `manual.html`

Es un manual navegable dentro de una sola pagina, con tabla de contenido lateral.

Temas declarados en la tabla de contenido:

- Introduccion a los datos abiertos.
- Marco conceptual de politicas publicas.
- Casos de exito internacionales.
- Ejemplos en Mexico.
- Etica en uso de datos e IA.
- Herramientas y tecnicas.
- Participacion ciudadana.
- Guia para elaborar propuestas.
- Recursos adicionales.

Estado real del contenido:

- Solo existen secciones completas para `page1` a `page5`.
- Las paginas `page6` a `page9` aparecen en la tabla de contenido, pero no existen en el DOM.

Esto significa que el manual esta parcialmente implementado.

## 7. JavaScript compartido (`script.js`)

Este archivo concentra la logica base del sitio y se inicializa al cargar el DOM.

### 7.1 `initNavigation()`

Responsabilidades:

- Activar y cerrar menu movil.
- Bloquear scroll del body cuando el menu movil esta abierto.
- Agregar estado visual a la navbar al hacer scroll.
- Aplicar scroll suave a enlaces internos con ancla.

Impacto:

- Funciona como comportamiento transversal para las paginas que reutilizan navbar y enlaces internos.

### 7.2 `initCountdown()`

Responsabilidades:

- Calcular tiempo restante hasta el evento.
- Pintar dias, horas, minutos y segundos.

Observacion importante:

- La fecha esta fija en 17 de mayo de 2025 a las 09:00.
- Dado que hoy ya es posterior a esa fecha, el contador llegara a `00` en todos los valores.

En su estado actual, el contador ya no comunica cuenta regresiva real.

### 7.3 `initScrollAnimations()`

Responsabilidades:

- Revelar elementos con clase `animate-on-scroll`.
- Usar `IntersectionObserver` cuando esta disponible.
- Aplicar fallback con `requestAnimationFrame` en navegadores antiguos.

Es una implementacion razonable para rendimiento y compatibilidad.

### 7.4 `initFaq()`

Responsabilidades:

- Convertir FAQ en acordeon.
- Mantener una sola respuesta abierta a la vez.
- Actualizar `aria-expanded` para accesibilidad.

### 7.5 `initBackToTop()`

Responsabilidades:

- Mostrar el boton volver arriba despues de cierto scroll.
- Permitir accion por teclado con Enter.

### 7.6 `initAnalytics()`

Responsabilidades:

- Inyectar Google Analytics fuera de localhost.
- Disparar eventos en clics de `.cta-button`.

Observacion importante:

- Usa el identificador placeholder `G-XXXXXXXXXX`.
- En produccion real, esa analitica no quedara correctamente configurada hasta reemplazar el ID.

### 7.7 `initPresentationModal()`

Responsabilidades:

- Abrir y cerrar modal de presentacion.
- Navegar slides anteriores y siguientes.
- Gestionar contador de slides.
- Entrar y salir de pantalla completa.
- Permitir control por teclado.
- Exponer `window.openPresentationDirect()`.

Es una de las piezas mas ricas del sitio a nivel de interactividad.

## 8. Motor de busqueda (`busqueda.js`)

El proyecto implementa una busqueda cliente simple basada en un indice en memoria.

### 8.1 Como funciona

- Se define una clase `SearchEngine`.
- Se indexan manualmente paginas y contenidos al cargar el DOM.
- El indice trabaja con palabras tokenizadas y normalizadas.
- Cada coincidencia suma puntuacion segun campo:
  - titulo: peso 2
  - contenido: peso 1
  - tag: peso 3
- Los resultados se ordenan por numero de campos coincidentes y luego por score.

### 8.2 Datos indexados actualmente

El indice incluye solo cuatro entradas logicas:

- `index.html`
- `blogs.html#analisis-datos`
- `blogs.html#ciudades-datos`
- `datos.html`

### 8.3 Persistencia temporal

- Guarda `searchQuery` y `searchResults` en `sessionStorage`.
- Si el usuario busca desde otra pagina, redirige a `busqueda.html`.
- Al cargar `busqueda.html`, rehidrata los resultados desde `sessionStorage`.

### 8.4 Limites actuales

- No rastrea el DOM real de las paginas.
- No indexa `manual.html`.
- No indexa todas las secciones internas del home.
- No soporta stemming ni sinonimos.
- No hay paginacion real de resultados.
- No hay tolerancia a errores ortograficos.

Es una busqueda de demostracion funcional, no un buscador completo.

## 9. Manual interactivo (`manual-script.js`)

Este archivo da comportamiento al manual.

Funciones principales:

- Mostrar una pagina del manual segun hash.
- Marcar enlace activo en la tabla de contenido.
- Navegar con botones anterior y siguiente.
- Actualizar `history.pushState`.
- Responder a `hashchange`.
- Ajustar posicion del TOC sticky.
- Agregar smooth scroll.
- Soportar gestos swipe en moviles.

Punto fuerte:

- La experiencia esta pensada como lectura secuencial o navegacion por capitulos.

Punto debil:

- La tabla de contenido promete mas capitulos de los que realmente existen.

## 10. Estilos globales (`styles.css`)

La hoja global define la identidad visual del sitio.

### 10.1 Sistema visual

Usa variables CSS para una paleta basada en:

- Azul medio.
- Azul claro.
- Gris neutro.
- Fondo oscuro.
- Blanco.

### 10.2 Componentes que estiliza

- Navbar y menu movil.
- Secciones generales.
- Hero principal.
- CTA buttons.
- Grid de beneficios.
- Agenda.
- Logos de aliados.
- Contacto y footer.
- Animaciones.
- Countdown.
- FAQ.
- Back to top.
- Modal de presentacion.
- Patrones de accesibilidad.

### 10.3 Observaciones

- `styles.css` funciona como archivo unico de estilo para casi todo el sitio.
- `datos.html` y `busqueda.html` agregan estilos inline en el mismo HTML para necesidades puntuales.
- `manual.html` agrega una hoja complementaria dedicada.

## 11. Estilos del manual (`manual-styles.css`)

Este archivo extiende el sistema visual global para convertir el manual en una experiencia de lectura.

Incluye estilos para:

- Header del manual.
- Layout de dos columnas.
- TOC sticky.
- Paginas del manual.
- Cajas de referencias.
- Casos de estudio.
- Diagramas.
- Navegacion entre capitulos.
- Componentes de etica, impactos y lecciones.

## 12. Navegacion real del usuario

Flujo principal esperado:

1. El usuario entra a `index.html`.
2. Explora propuesta, agenda y detalles.
3. Revisa blog, datos o manual.
4. Regresa a registro desde CTA o navbar.

Flujos secundarios:

- Desde `blogs.html`, el usuario puede buscar contenido y ser enviado a `busqueda.html`.
- Desde `datos.html`, puede buscar recursos y ver resultados en `busqueda.html`.
- Desde `index.html`, puede abrir la presentacion modal sin salir de la pagina.
- Desde `manual.html`, navega por capitulos usando hash y tabla de contenido.

## 13. SEO y accesibilidad

### 13.1 SEO

Aspectos presentes:

- Meta description y keywords en varias paginas.
- Open Graph.
- Twitter Card en la pagina principal.
- JSON-LD de tipo evento en `index.html`.

Aspectos incompletos o mejorables:

- Falta consolidacion de imagenes sociales locales reales.
- Varias paginas usan placeholders o enlaces genericos.

### 13.2 Accesibilidad

Aspectos presentes:

- Skip links.
- Uso de `aria-label` en varios enlaces y botones.
- FAQ con `aria-expanded`.
- Soporte basico de foco visible.
- Boton volver arriba accesible por teclado.

Aspectos mejorables:

- Algunos links con `href="#"` no comunican destino real.
- La presentacion modal podria reforzar manejo de foco y trap focus.
- El manual no tiene todos los capitulos que anuncia, lo que afecta la expectativa del usuario.

## 14. Contenido real vs contenido placeholder

El proyecto mezcla piezas reales con elementos de muestra.

### 14.1 Evidencia de contenido real o casi real

- Nombre, enfoque y propuesta del evento.
- Ubicacion en AVIADA, Hermosillo.
- Estructura general de agenda y publicos objetivo.
- Enfoque tematico del blog, datos y manual.
- Manual con contenido extenso y curado en sus primeras cinco secciones.

### 14.2 Evidencia de placeholders o demo content

- Imagenes servidas desde `via.placeholder.com`.
- Enlace de registro `https://forms.gle/example123456`.
- Google Analytics con `G-XXXXXXXXXX`.
- Multiples enlaces `href="#"`.
- Politica de privacidad sin destino real.
- Recursos del manual declarados pero no terminados.
- Paginacion del blog simulada.
- Visualizaciones declaradas en `datos.html`, pero no hay codigo que pinte charts.

## 15. Funcionalidades realmente operativas

Operativas hoy:

- Navegacion responsive.
- Smooth scroll.
- FAQ acordeon.
- Modal de presentacion.
- Contador regresivo, aunque ya caducado.
- Boton volver arriba.
- Busqueda local con `sessionStorage`.
- Navegacion interna del manual entre paginas existentes.

Parcialmente operativas o incompletas:

- Manual completo.
- Registro real.
- Analitica real.
- Recursos descargables.
- Enlaces de compartir.
- Foro.
- Proyectos comunitarios enlazados.
- Paginacion del blog.
- Politica de privacidad.

No implementadas pese a estar sugeridas:

- Graficas reales con Chart.js.
- Uso real de D3.
- Uso real de CountUp.

## 16. Recursos y archivos referenciados pero ausentes

En el repositorio no se encontraron archivos locales para:

- `favicon.ico`
- `apple-touch-icon.png`
- `og-image.jpg`

Sin esos archivos, algunos metadatos y favicons no se resolveran correctamente en despliegue local o produccion, a menos que existan fuera de este repositorio.

## 17. Dependencias declaradas pero no usadas o no conectadas

### 17.1 CountUp.js

- Se importa en `index.html`.
- No hay uso real en `script.js` ni en otro archivo.

### 17.2 Chart.js

- Se importa en `index.html` y `datos.html`.
- No hay instancias `new Chart(...)` en el codigo.

### 17.3 D3.js

- Se importa en `datos.html`.
- No hay uso real de `d3` en el codigo.

Conclusiones:

- El proyecto fue pensado para tener mas visualizacion interactiva de la que actualmente tiene.
- Parte de la vision tecnica todavia no esta conectada.

## 18. Inconsistencias y deuda tecnica detectada

### 18.1 Fecha del evento desactualizada

- El contador ya no tiene valor practico.

### 18.2 Manual incompleto

- La navegacion promete 9 capitulos.
- Solo existen 5.

### 18.3 Assets faltantes

- No hay favicon ni imagen OG local.

### 18.4 Enlaces de demostracion

- Hay muchos `href="#"`.
- Varias acciones no llevan a destinos reales.

### 18.5 Dependencias no utilizadas

- Carga innecesaria de librerias aumenta peso de pagina sin beneficio actual.

### 18.6 Estilos inline dentro de HTML

- `datos.html` y `busqueda.html` encapsulan estilos propios dentro del documento.
- Funciona, pero complica mantenimiento si el proyecto crece.

### 18.7 Busqueda limitada

- El indice no se genera automaticamente.
- Cada nuevo contenido tendria que añadirse a mano.

## 19. Estado de madurez del proyecto

Mi lectura del estado actual es esta:

- Nivel visual: medio a alto.
- Nivel de contenido: medio.
- Nivel de integracion real: medio-bajo.
- Nivel de producto terminado: prototipo avanzado o sitio MVP editorial.

No es un boceto vacio. Ya existe una propuesta clara, navegable y con bastante contenido. Pero todavia no es un sitio plenamente productivo en todas sus secciones.

## 20. Como ejecutar el proyecto

Al ser estatico, basta con abrir los HTML en navegador.

Opciones:

- Abrir `index.html` directamente.
- Servir la carpeta con cualquier static server.
- Desplegarlo en GitHub Pages, Netlify, Vercel o similar como sitio estatico.

No se requieren:

- `npm install`
- build
- bundling
- variables de entorno del proyecto

La unica excepcion practica seria configurar un ID real de analitica y reemplazar assets faltantes.

## 21. Conclusiones

Data Driven Day es un sitio estatico multipagina orientado a promocion de evento, divulgacion de conocimiento y curaduria de recursos sobre datos abiertos y politicas publicas.

Sus fortalezas principales son:

- narrativa clara del evento;
- buena base visual;
- interaccion suficiente para un micrositio;
- contenido educativo relevante;
- estructura escalable para blog, datos y manual.

Sus principales pendientes son:

- convertir placeholders en contenido real;
- completar el manual;
- activar o retirar dependencias no usadas;
- reemplazar assets faltantes;
- actualizar fecha y registro;
- convertir la pagina de datos en una experiencia realmente interactiva.

## 22. Recomendacion inmediata

Si este proyecto va a seguir evolucionando, la ruta mas razonable es:

1. cerrar contenido real del evento;
2. corregir enlaces y assets faltantes;
3. terminar el manual;
4. decidir si la pagina de datos tendra charts reales o si se simplificara;
5. documentar despliegue y mantenimiento en el `README.md`.
