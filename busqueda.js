/**
 * Implementación básica de búsqueda para Data Driven Day
 */

class SearchEngine {
    constructor() {
        this.index = {};
        this.pages = [];
    }

    // Agregar una página al índice de búsqueda
    addPage(url, title, content, tags = []) {
        const pageIndex = this.pages.length;
        
        // Almacenar información de la página
        this.pages.push({
            url,
            title,
            content,
            tags
        });
        
        // Indexar palabras del título
        this.indexText(title, pageIndex, 'title', 2);
        
        // Indexar contenido
        this.indexText(content, pageIndex, 'content', 1);
        
        // Indexar etiquetas con prioridad alta
        tags.forEach(tag => this.indexText(tag, pageIndex, 'tag', 3));
    }
    
    // Indexar texto dividiéndolo en palabras
    indexText(text, pageIndex, field, weight) {
        if (!text) return;
        
        // Convertir a minúsculas y eliminar caracteres especiales
        const normalizedText = text.toLowerCase()
            .replace(/[^\w\sáéíóúüñ]/g, ' ')
            .replace(/\s+/g, ' ');
            
        // Dividir en palabras y filtrar las muy cortas
        const words = normalizedText.split(' ')
            .filter(word => word.length > 2);
            
        // Indexar cada palabra
        words.forEach(word => {
            if (!this.index[word]) {
                this.index[word] = [];
            }
            
            // Evitar duplicados
            const existing = this.index[word].find(item => 
                item.pageIndex === pageIndex && item.field === field);
                
            if (existing) {
                existing.count++;
            } else {
                this.index[word].push({
                    pageIndex,
                    field,
                    weight,
                    count: 1
                });
            }
        });
    }
    
    // Buscar en el índice
    search(query) {
        if (!query || query.length < 3) return [];
        
        // Normalizar la consulta
        const normalizedQuery = query.toLowerCase()
            .replace(/[^\w\sáéíóúüñ]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
            
        if (!normalizedQuery) return [];
        
        const queryWords = normalizedQuery.split(' ')
            .filter(word => word.length > 2);
            
        if (queryWords.length === 0) return [];
        
        // Resultados preliminares con puntuación
        const scores = {};
        
        // Calcular puntuación para cada palabra de la consulta
        queryWords.forEach(word => {
            if (this.index[word]) {
                this.index[word].forEach(item => {
                    const { pageIndex, weight, count, field } = item;
                    
                    if (!scores[pageIndex]) {
                        scores[pageIndex] = {
                            page: this.pages[pageIndex],
                            score: 0,
                            matchFields: new Set()
                        };
                    }
                    
                    // Calcular puntuación basada en peso y frecuencia
                    scores[pageIndex].score += weight * count;
                    scores[pageIndex].matchFields.add(field);
                });
            }
        });
        
        // Convertir a array y ordenar por puntuación
        const results = Object.values(scores)
            .map(item => ({
                ...item.page,
                score: item.score,
                matchCount: item.matchFields.size
            }))
            .sort((a, b) => {
                // Ordenar primero por cantidad de campos con coincidencias
                if (b.matchCount !== a.matchCount) {
                    return b.matchCount - a.matchCount;
                }
                // Luego por puntuación total
                return b.score - a.score;
            });
            
        return results;
    }
    
    // Generar snippet con resaltado
    generateSnippet(content, query, maxLength = 160) {
        if (!content) return '';
        
        const normalizedQuery = query.toLowerCase();
        const normalizedContent = content.toLowerCase();
        
        // Buscar la primera aparición de la consulta
        let startIndex = normalizedContent.indexOf(normalizedQuery);
        
        // Si no se encuentra exactamente, buscar la primera palabra
        if (startIndex === -1) {
            const firstWord = query.toLowerCase().split(' ')[0];
            startIndex = normalizedContent.indexOf(firstWord);
        }
        
        // Si aún no se encuentra, usar el inicio del contenido
        if (startIndex === -1) startIndex = 0;
        
        // Ajustar punto de inicio para mostrar contexto
        startIndex = Math.max(0, startIndex - 30);
        
        // Extraer fragmento
        let snippet = content.substr(startIndex, maxLength);
        
        // Agregar elipsis si es necesario
        if (startIndex > 0) snippet = '...' + snippet;
        if (startIndex + maxLength < content.length) snippet += '...';
        
        return snippet;
    }
}

// Inicializar motor de búsqueda
const searchEngine = new SearchEngine();

// Cargar datos para búsqueda cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    // Contenido de la página principal
    searchEngine.addPage(
        'index.html',
        'Data Driven Day: Transformando Datos en Políticas Públicas',
        'Evento presencial enfocado en la toma de decisiones basadas en datos. Políticas públicas, análisis, bootcamp, mentoría, innovación, networking, herramientas de datos.',
        ['evento', 'datos', 'políticas públicas', 'hermosillo']
    );
    
    // Blog - artículo 1
    searchEngine.addPage(
        'blogs.html#analisis-datos',
        'Cómo iniciar con análisis de datos en políticas públicas',
        'El uso de datos abiertos permite a los gobiernos tomar decisiones basadas en evidencia, mejorando la efectividad de las políticas públicas y optimizando recursos. Aprende a identificar fuentes de datos relevantes y establecer preguntas claras para tu análisis.',
        ['análisis de datos', 'metodología', 'datos abiertos']
    );
    
    // Blog - artículo 2
    searchEngine.addPage(
        'blogs.html#ciudades-datos',
        '5 ciudades que transformaron su gestión con datos',
        'Las ciudades data-driven están transformando la gestión urbana mundial, utilizando información para optimizar recursos, mejorar servicios y aumentar la calidad de vida. Casos de Barcelona, Seúl, Boston, Singapur y Amsterdam.',
        ['smart cities', 'casos de éxito', 'ciudades inteligentes']
    );
    
    // Página de datos
    searchEngine.addPage(
        'datos.html',
        'Fuentes de datos abiertos para políticas públicas',
        'Accede a fuentes como INEGI, CONAPO, Datos.gob.mx y Our World in Data para tu análisis. Incluye visualizaciones, tutoriales y ejemplos de proyectos que utilizan datos para generar impacto en las políticas públicas.',
        ['datos abiertos', 'visualizaciones', 'fuentes de datos', 'INEGI', 'tutoriales']
    );
    
    // Inicializar buscador en todas las páginas
    initSearchFunctionality();
});

// Configurar la funcionalidad de búsqueda
function initSearchFunctionality() {
    const searchForms = document.querySelectorAll('.search-form');
    
    searchForms.forEach(form => {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const input = this.querySelector('input[type="search"]');
            const query = input.value.trim();
            
            if (query.length < 3) {
                alert('Por favor ingresa al menos 3 caracteres para buscar');
                return;
            }
            
            const results = searchEngine.search(query);
            displaySearchResults(results, query);
        });
    });
}

// Mostrar resultados de búsqueda
function displaySearchResults(results, query) {
    // Si estamos en una página diferente, redirigir a la página de resultados
    if (!window.location.pathname.includes('busqueda.html')) {
        // Almacenar resultados en sessionStorage
        sessionStorage.setItem('searchQuery', query);
        sessionStorage.setItem('searchResults', JSON.stringify(results));
        
        // Redirigir a la página de resultados
        window.location.href = 'busqueda.html';
        return;
    }
    
    // Si ya estamos en la página de resultados, mostrarlos directamente
    const resultsContainer = document.getElementById('search-results-list');
    const searchTermElement = document.getElementById('search-term');
    const resultsCountElement = document.getElementById('results-count');
    
    // Actualizar texto de búsqueda
    searchTermElement.textContent = query;
    resultsCountElement.textContent = results.length;
    
    // Limpiar resultados anteriores
    resultsContainer.innerHTML = '';
    
    if (results.length === 0) {
        resultsContainer.innerHTML = `
            <div class="no-results">
                <p>No se encontraron resultados para tu búsqueda.</p>
                <p>Sugerencias:</p>
                <ul>
                    <li>Revisa la ortografía de las palabras.</li>
                    <li>Intenta con palabras clave diferentes.</li>
                    <li>Utiliza términos más generales.</li>
                </ul>
            </div>
        `;
        return;
    }
    
    // Crear elementos para cada resultado
    results.forEach(result => {
        const snippet = searchEngine.generateSnippet(result.content, query);
        
        const resultItem = document.createElement('div');
        resultItem.className = 'search-result-item';
        
        resultItem.innerHTML = `
            <h3><a href="${result.url}">${result.title}</a></h3>
            <div class="search-result-snippet">${snippet}</div>
            <div class="search-result-url">${result.url}</div>
            ${result.tags && result.tags.length > 0 ? 
                `<div class="search-result-tags">${result.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}</div>` : ''}
        `;
        
        resultsContainer.appendChild(resultItem);
    });
}

// Cargar resultados guardados al acceder a la página de búsqueda
function loadSavedSearchResults() {
    if (window.location.pathname.includes('busqueda.html')) {
        const savedQuery = sessionStorage.getItem('searchQuery');
        const savedResults = JSON.parse(sessionStorage.getItem('searchResults') || '[]');
        
        if (savedQuery && savedResults) {
            displaySearchResults(savedResults, savedQuery);
        }
    }
}

// Llamar a esta función al cargar la página
document.addEventListener('DOMContentLoaded', loadSavedSearchResults);
