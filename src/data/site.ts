export const site = {
  name: 'Data Driven Day',
  title: 'Data Driven Day 2026',
  description:
    'Encuentro y plataforma para impulsar soberania de datos, infraestructura critica e inteligencia aplicada desde Hermosillo.',
  location: 'Hermosillo, Sonora',
  eventDate: '28 de marzo de 2026',
  tagline: 'Una agenda local para convertir datos, ciudad e inteligencia aplicada en decisiones publicas y colaboraciones reales.'
};

export const navigation = [
  { href: '/', label: 'Inicio' },
  { href: '/#proyecto', label: 'Vision' },
  { href: '/dataller', label: 'Dataller' },
  { href: '/registro', label: 'Registro' },
  { href: '/hermosillo', label: 'Hermosillo' },
  { href: '/#recursos-2026', label: 'Recursos' },
  { href: '/blog', label: 'Blog' }
];

export const capabilityCards = [
  {
    title: 'Una vision para Hermosillo',
    copy: 'Data Driven Day pone sobre la mesa una conversacion urgente sobre soberania de datos, infraestructura critica, resiliencia y decisiones asistidas por inteligencia aplicada.'
  },
  {
    title: 'Temas que importan ahora',
    copy: 'Gemelos digitales, salud de precision, trazabilidad industrial, clima urbano y geointeligencia se abordan como prioridades reales para la ciudad y su ecosistema regional.'
  },
  {
    title: 'Un evento para pasar a la accion',
    copy: 'El Dataller de IA reune a quienes quieren convertir la conversacion en prototipos, colaboraciones, herramientas y capacidad instalada.'
  }
];

export const roadmap = [
  'Abrir una conversacion local sobre soberania de datos, infraestructura critica y resiliencia sistemica.',
  'Conectar a gobierno, industria, academia y salud alrededor de una agenda comun.',
  'Usar el Dataller para acelerar prototipos, colaboraciones y nuevas capacidades.',
  'Atraer aliados, speakers, instituciones y equipos con interes en implementar casos reales.',
  'Mantener una comunidad activa con recursos, ideas y oportunidades de participacion.'
];

export const samplePosts = [
  {
    title: 'Como estructurar una agenda editorial para politica publica',
    category: 'Editorial ops',
    excerpt: 'El nuevo sitio necesita contenido gobernable: tipos, estados y responsables, no solo paginas sueltas.'
  },
  {
    title: 'Por que D1 basta para eventos, leads y submissions',
    category: 'Backend',
    excerpt: 'Para este caso, una base ligera y cercana al edge resuelve mucho sin traer un stack de SaaS pesado.'
  },
  {
    title: 'Sanity como capa de operacion, no como adorno',
    category: 'CMS',
    excerpt: 'El CMS debe editar speakers, agenda, posts, recursos y FAQs con flujos claros y pocos tipos.'
  }
];

export const manualModules = [
  'Arquitectura del producto y modelo editorial.',
  'Modelo de datos para speakers, agenda, posts y recursos.',
  'Operación con Cloudflare Workers SSR, D1 y R2.',
  'Integración del CMS y estrategias de preview.',
  'Roadmap para migración gradual del contenido legacy.'
];

export const strategicStats = [
  {
    value: '57%',
    label: 'de expertos proyecta una decada de turbulencia sistemica en 2026'
  },
  {
    value: '18%',
    label: 'de las metas ODS va en camino segun el marco citado en el informe'
  },
  {
    value: '76%',
    label: 'del territorio mexicano enfrenta estres hidrico'
  },
  {
    value: '200M',
    label: 'de personas podrian verse desplazadas por migracion climatica hacia 2030'
  }
];

export const focusPillars = [
  {
    title: 'Ciudades inteligentes y resilientes',
    summary:
      'Gemelos digitales, sensores urbanos y modelos what-if para responder a isla de calor, energia, movilidad y desastres.',
    takeaway: 'Hermosillo necesita datos operables, no solo dashboards bonitos.'
  },
  {
    title: 'Sostenibilidad y salud planetaria',
    summary:
      'El estres hidrico, el calor extremo y la agricultura de precision obligan a integrar clima, agua, energia y territorio.',
    takeaway: 'La crisis ambiental ya es una crisis de coordinacion de datos.'
  },
  {
    title: 'Economia circular y trazabilidad industrial',
    summary:
      'Pasaportes digitales, trazabilidad interoperable y monitoreo de cadenas de suministro reemplazan enfoques opacos e ineficientes.',
    takeaway: 'La trazabilidad deja de ser compliance y se vuelve ventaja operativa.'
  },
  {
    title: 'Longevidad y salud de precision',
    summary:
      'La IA poblacional cruza entorno, clinica y demografia para anticipar riesgos de salud en poblaciones urbanas y envejecidas.',
    takeaway: 'Los determinantes sociales ya no pueden modelarse por separado.'
  },
  {
    title: 'Retos existenciales y fragilidad sistemica',
    summary:
      'Geopolitica, migracion climatica y colapso de confianza hacen que la soberania de datos sea una prioridad institucional.',
    takeaway: 'La gobernanza de datos es una capacidad de seguridad publica.'
  }
];

export const datallerAgenda = [
  {
    time: '9:00 - 10:00',
    title: 'Modulo 1: Setup de copilotos y contexto progresivo',
    detail:
      'Vibe coding multinodal con GitHub Copilot para flujo de desarrollo y Gemini para razonamiento arquitectonico; uso de MCP para acceder a contexto local, archivos y esquemas; arranque de README.md, PROMPTS.md y ARCHITECTURE.md.'
  },
  {
    time: '10:00 - 11:30',
    title: 'Modulo 2: Infraestructura de datos con Neon',
    detail:
      'Diseno de esquemas con Gemini para gemelos digitales, salud de precision y trazabilidad industrial; aprovisionamiento de Postgres serverless con branching en Neon; integracion de pgvector para busqueda semantica de datos climaticos y estres hidrico.'
  },
  {
    time: '11:30 - 13:00',
    title: 'Modulo 3: Inteligencia y logica de negocio (RAG 2.0)',
    detail:
      'Construccion de un pipeline RAG con Gemini para razonamiento multihop sobre grafos de conocimiento; desarrollo con Copilot de knowledge runtimes y busqueda hibrida; validacion de latencia con FLASH Framework para respuestas sub-segundo.'
  },
  {
    time: '13:00 - 14:30',
    title: 'Modulo 4: Frontend reactivo y despliegue en Vercel',
    detail:
      'UI conectada con Gemini y Neon mediante Vercel AI SDK; vibe coding de componentes para visualizaciones inmersivas; despliegue continuo con Vercel integrando variables de entorno y GitOps.'
  },
  {
    time: '14:00 - 15:00',
    title: 'Modulo 5: Observabilidad y auditoria de IA',
    detail:
      'Implementacion de trazas de decision auditables, atribucion de datos y demo final de un producto funcional orientado a economia plateada o salud planetaria.'
  }
];

export const eventOutcomes = [
  'Una comunidad mas clara sobre por que los datos ya son infraestructura esencial.',
  'Nuevas conversaciones entre sectores que normalmente no se sientan en la misma mesa.',
  'Aliados, speakers y posibles patrocinadores alineados con la vision 2026.',
  'Un Dataller de IA capaz de traducir ideas en trabajo visible y demostrable.'
];

export const datallerStack = [
  'GitHub Copilot',
  'Gemini',
  'MCP',
  'Neon Postgres',
  'Vercel'
];

export const datallerResources = [
  {
    label: 'Model Context Protocol',
    href: 'https://modelcontextprotocol.io/introduction'
  },
  {
    label: 'GitHub Copilot',
    href: 'https://github.com/features/copilot'
  },
  {
    label: 'Gemini API Docs',
    href: 'https://ai.google.dev/docs'
  },
  {
    label: 'Neon Introduction',
    href: 'https://neon.tech/docs/introduction'
  },
  {
    label: 'Neon AI Guides',
    href: 'https://neon.tech/docs/guides/ai-technologies'
  },
  {
    label: 'Vercel AI SDK',
    href: 'https://sdk.vercel.ai/docs/introduction'
  },
  {
    label: 'Vercel Next.js Docs',
    href: 'https://vercel.com/docs/frameworks/nextjs'
  },
  {
    label: 'GitHub Copilot Guide',
    href: 'https://docs.github.com/en/copilot'
  }
];

export const researchResourceGroups = [
  {
    title: 'Gobernanza de datos y riesgo sistémico',
    links: [
      {
        label: 'WEF: Global Risks Report 2026',
        href: 'https://reports.weforum.org/docs/WEF_Global_Risks_Report_2026.pdf'
      },
      {
        label: 'UN SDG Report 2025',
        href: 'https://unstats.un.org/sdgs/report/2025/The-Sustainable-Development-Goals-Report-2025.pdf'
      },
      {
        label: 'IOM Global Appeal 2026',
        href: 'https://www.iom.int/sites/g/files/tmzbdl2616/files/global-appeal/iom_globalappeal_2026-en.pdf'
      },
      {
        label: 'Mexico Investment Plan 2026-2030',
        href: 'https://mexicobusiness.news/trade-and-investment/news/mexico-launches-mx56-trillion-investment-plan-2026-2030'
      }
    ]
  },
  {
    title: 'Sonora, clima, agua y salud urbana',
    links: [
      {
        label: 'NOAA: multi-year drought and heat waves across Mexico',
        href: 'https://www.climate.gov/news-features/event-tracker/multi-year-drought-and-heat-waves-across-mexico-2024'
      },
      {
        label: 'SciELO: vegetation cover and urban heat islands in Hermosillo',
        href: 'https://www.scielo.org.mx/scielo.php?pid=S0187-73722021000100106&script=sci_arttext&tlng=en'
      },
      {
        label: 'Sonora Sustainable Plan',
        href: 'https://codeso.mx/wp-content/uploads/2024/07/SONORA_PLAN_ENGLISH-V2.pdf'
      },
      {
        label: 'AI for Healthy Cities',
        href: 'https://www.novartisfoundation.org/our-programs/ai4healthycities'
      }
    ]
  },
  {
    title: 'Infraestructura técnica 2026',
    links: [
      {
        label: 'Destination Earth',
        href: 'https://destination-earth.eu/'
      },
      {
        label: 'TabPFN-2.5 paper',
        href: 'https://arxiv.org/abs/2511.08667'
      },
      {
        label: 'Physics-Informed GNNs',
        href: 'https://www.mdpi.com/2076-3417/15/16/8854'
      },
      {
        label: 'Best Vector Database for RAG',
        href: 'https://www.pingcap.com/compare/best-vector-database/'
      },
      {
        label: 'IBM: Explainable AI',
        href: 'https://www.ibm.com/think/topics/explainable-ai'
      },
      {
        label: 'IBM: Federated Learning',
        href: 'https://www.ibm.com/think/topics/federated-learning'
      }
    ]
  }
];

export const benchmarkProjects = [
  {
    title: 'Destination Earth',
    summary: 'Gemelos digitales del sistema Tierra a escala continental para simulaciones climaticas y escenarios what-if.',
    href: 'https://www.ecmwf.int/en/about/media-centre/news/2026/third-phase-destination-earth-confirmed'
  },
  {
    title: 'Abu Dhabi Population Health Intelligence',
    summary: 'Plataforma de inteligencia poblacional con flujos clinicos, genomicos y ambientales para anticipar riesgo no transmisible.',
    href: 'https://www.mediaoffice.abudhabi/en/health/department-of-health-abu-dhabi-unveils-worlds-1st-ai-powered-population-health-intelligence-platform-at-gitex-global-2025/'
  },
  {
    title: 'AI4HealthyCities',
    summary: 'Modelo global que vincula EHR y determinantes sociales para identificar vulnerabilidades cardiovasculares con IA.',
    href: 'https://fpanalytics.foreignpolicy.com/2026/01/16/artificial-intelligence-healthy-cities/'
  },
  {
    title: 'Hermosillo ¿Cómo Vamos? · Growth Lab Harvard',
    summary: 'Primera aplicación de metodología de complejidad económica y growth diagnostics a una ciudad del norte de México. Agenda de diversificación hacia manufactura avanzada, energías limpias y servicios digitales. Referencia directa para los proyectos del Dataller de IA 2026.',
    href: 'https://www.hermosillocomovamos.org',
  },
];

// 6 ejes temáticos con estado, dato clave y categoría de urgencia
export const thematicAxes = [
  {
    id: 'ciudades',
    label: 'Ciudades inteligentes y resilientes',
    status: 'urgent',        // red
    keyData: 'Hermosillo: 50.5 °C récord histórico (2021)',
    detail: 'Gemelos digitales, sensores urbanos y modelos what-if para responder a isla de calor, energia, movilidad y desastres. Hermosillo necesita datos operables, no solo dashboards bonitos.'
  },
  {
    id: 'sostenibilidad',
    label: 'Sostenibilidad y salud planetaria',
    status: 'warning',       // amber
    keyData: '76% del territorio mexicano bajo estrés hídrico',
    detail: 'El estres hidrico, el calor extremo y la agricultura de precision obligan a integrar clima, agua, energia y territorio. La crisis ambiental ya es una crisis de coordinacion de datos.'
  },
  {
    id: 'trazabilidad',
    label: 'Economía circular y trazabilidad industrial',
    status: 'warning',       // amber
    keyData: 'Pasaportes digitales industriales obligatorios UE 2027',
    detail: 'Pasaportes digitales, trazabilidad interoperable y monitoreo de cadenas de suministro reemplazan enfoques opacos. La trazabilidad deja de ser compliance y se vuelve ventaja operativa.'
  },
  {
    id: 'salud',
    label: 'Longevidad y salud de precisión',
    status: 'active',        // green
    keyData: 'Abu Dhabi: 1a plataforma IA de salud poblacional 2025',
    detail: 'La IA poblacional cruza entorno, clinica y demografia para anticipar riesgos de salud en poblaciones urbanas y envejecidas. Los determinantes sociales ya no pueden modelarse por separado.'
  },
  {
    id: 'fragilidad',
    label: 'Retos existenciales y fragilidad sistémica',
    status: 'urgent',        // red
    keyData: '200M de personas en riesgo de migración climática en 2030',
    detail: 'Geopolitica, migracion climatica y colapso de confianza hacen que la soberania de datos sea una prioridad institucional. La gobernanza de datos es una capacidad de seguridad publica.'
  },
  {
    id: 'gobernanza',
    label: 'Gobernanza de datos y soberanía digital',
    status: 'warning',       // amber
    keyData: '18% de las metas ODS en curso — 82% en rezago o retroceso',
    detail: 'La soberania sobre datos publicos, clinicos e industriales define quienes pueden tomar decisiones basadas en evidencia. Sin gobernanza efectiva, la IA amplifica las asimetrias existentes.'
  }
];

// Comparativa de stack tecnológico: estado del arte vs riesgo técnico
export const techComparison = {
  current: [
    { label: 'LLMs con razonamiento (Gemini, o3, Claude)', category: 'IA' },
    { label: 'Bases vectoriales + pgvector (Neon, pgvector)', category: 'Datos' },
    { label: 'RAG 2.0 con grafos de conocimiento', category: 'IA' },
    { label: 'Edge computing (Cloudflare Workers)', category: 'Infra' },
    { label: 'Serverless Postgres con branching (Neon)', category: 'Datos' },
    { label: 'Model Context Protocol (MCP)', category: 'IA' },
    { label: 'GitOps + CI/CD con IA integrada', category: 'DevOps' },
    { label: 'Federated Learning para datos sensibles', category: 'IA' },
    { label: 'Digital twins urbanos (Destination Earth)', category: 'Ciudad' },
    { label: 'Vibe coding con copilotos multinodales', category: 'DevOps' }
  ],
  legacy: [
    { label: 'MySQL / SQL sin capacidades vectoriales', category: 'Datos' },
    { label: 'Monolitos en servidores dedicados', category: 'Infra' },
    { label: 'Modelos ML con entrenamiento centralizado', category: 'IA' },
    { label: 'ETL batch sin streaming de eventos', category: 'Datos' },
    { label: 'APIs REST sin contexto semántico', category: 'Infra' },
    { label: 'Dashboards BI estáticos sin IA', category: 'Ciudad' },
    { label: 'Despliegue manual sin automatización', category: 'DevOps' },
    { label: 'Modelos de caja negra sin explicabilidad', category: 'IA' },
    { label: 'Silos de datos sectoriales sin interoperabilidad', category: 'Datos' },
    { label: 'Desarrollo waterfall sin iteración rápida', category: 'DevOps' }
  ]
};

// Recursos con categorías para filtrado
export const filteredResources = [
  {
    title: 'WEF: Global Risks Report 2026',
    source: 'WEF',
    year: '2026',
    category: 'gobernanza',
    href: 'https://reports.weforum.org/docs/WEF_Global_Risks_Report_2026.pdf'
  },
  {
    title: 'UN SDG Report 2025',
    source: 'ONU',
    year: '2025',
    category: 'gobernanza',
    href: 'https://unstats.un.org/sdgs/report/2025/The-Sustainable-Development-Goals-Report-2025.pdf'
  },
  {
    title: 'IOM Global Appeal 2026',
    source: 'OIM',
    year: '2026',
    category: 'gobernanza',
    href: 'https://www.iom.int/sites/g/files/tmzbdl2616/files/global-appeal/iom_globalappeal_2026-en.pdf'
  },
  {
    title: 'Mexico Investment Plan 2026-2030',
    source: 'Gobierno MX',
    year: '2026',
    category: 'gobernanza',
    href: 'https://mexicobusiness.news/trade-and-investment/news/mexico-launches-mx56-trillion-investment-plan-2026-2030'
  },
  {
    title: 'NOAA: Drought & Heat Waves Mexico 2024',
    source: 'NOAA',
    year: '2024',
    category: 'ciudad',
    href: 'https://www.climate.gov/news-features/event-tracker/multi-year-drought-and-heat-waves-across-mexico-2024'
  },
  {
    title: 'SciELO: Isla de calor urbana en Hermosillo',
    source: 'SciELO',
    year: '2021',
    category: 'ciudad',
    href: 'https://www.scielo.org.mx/scielo.php?pid=S0187-73722021000100106&script=sci_arttext&tlng=en'
  },
  {
    title: 'Sonora Sustainable Development Plan',
    source: 'CODESO',
    year: '2024',
    category: 'ciudad',
    href: 'https://codeso.mx/wp-content/uploads/2024/07/SONORA_PLAN_ENGLISH-V2.pdf'
  },
  {
    title: 'AI for Healthy Cities (Novartis)',
    source: 'Novartis Foundation',
    year: '2025',
    category: 'ciudad',
    href: 'https://www.novartisfoundation.org/our-programs/ai4healthycities'
  },
  {
    title: 'Destination Earth — Fase 3 confirmada',
    source: 'ECMWF',
    year: '2026',
    category: 'tecnologia',
    href: 'https://destination-earth.eu/'
  },
  {
    title: 'TabPFN-2.5: Foundation Models for Tabular Data',
    source: 'arXiv',
    year: '2025',
    category: 'tecnologia',
    href: 'https://arxiv.org/abs/2511.08667'
  },
  {
    title: 'Physics-Informed Graph Neural Networks',
    source: 'MDPI',
    year: '2025',
    category: 'tecnologia',
    href: 'https://www.mdpi.com/2076-3417/15/16/8854'
  },
  {
    title: 'IBM: Federated Learning',
    source: 'IBM',
    year: '2025',
    category: 'tecnologia',
    href: 'https://www.ibm.com/think/topics/federated-learning'
  },
  {
    title: 'IBM: Explainable AI',
    source: 'IBM',
    year: '2025',
    category: 'tecnologia',
    href: 'https://www.ibm.com/think/topics/explainable-ai'
  },
  {
    title: 'Best Vector Database for RAG 2025',
    source: 'PingCAP',
    year: '2025',
    category: 'tecnologia',
    href: 'https://www.pingcap.com/compare/best-vector-database/'
  },
  // ── Informe Harvard / Hermosillo ¿Cómo Vamos? ─────────────────────────────
  {
    title: 'Hermosillo con futuro: cómo podemos acelerar su crecimiento',
    source: 'Growth Lab · Harvard Kennedy School · Hermosillo ¿Cómo Vamos?',
    year: '2025',
    category: 'ciudad',
    href: 'https://growthlab.hks.harvard.edu/policy-research/economic-growth-strategies-hermosillo',
  },
  {
    title: 'Crecimiento a través de la Diversificación en Hermosillo — Estudio original',
    source: 'Growth Lab · Harvard Kennedy School · Ricardo Hausmann',
    year: '2024',
    category: 'ciudad',
    href: 'https://growthlab.hks.harvard.edu/policy-research/economic-growth-strategies-hermosillo',
  },
  {
    title: 'Hermosillo ¿Cómo Vamos? — Observatorio para la Competitividad y el Desarrollo',
    source: 'Observatorio para la Competitividad y el Desarrollo de Sonora A.C.',
    year: '2025',
    category: 'ciudad',
    href: 'https://www.hermosillocomovamos.org',
  },
];

// ─── Informe Harvard / Hermosillo ¿Cómo Vamos? ───────────────────────────────
// Fuente: Hermosillo ¿Cómo Vamos? (2025). Hermosillo con futuro: cómo podemos
// acelerar su crecimiento. Hermosillo, México: Observatorio para la
// Competitividad y el Desarrollo de Sonora A.C.
// Basado en: Growth Lab, Harvard Kennedy School (2024).
// Crecimiento a través de la Diversificación en Hermosillo.
// Director: Ricardo Hausmann.
// https://growthlab.hks.harvard.edu/policy-research/economic-growth-strategies-hermosillo

export const harvardFuente = {
  titulo: 'Hermosillo con futuro: cómo podemos acelerar su crecimiento',
  autores: 'Hermosillo ¿Cómo Vamos? · Growth Lab, Harvard Kennedy School',
  anio: 'Octubre 2025',
  linkEstudio:
    'https://growthlab.hks.harvard.edu/policy-research/economic-growth-strategies-hermosillo',
  linkOrg: 'https://www.hermosillocomovamos.org',
  citaAPA:
    'Hermosillo ¿Cómo Vamos? (2025). Hermosillo con futuro: cómo podemos acelerar su crecimiento. Hermosillo, México: Observatorio para la Competitividad y el Desarrollo de Sonora A.C.',
} as const;

export type MetricaTipo = 'rezago' | 'oportunidad' | 'contexto';
export type ColorAcento = 'heat' | 'amber' | 'go' | 'data';

export interface MetricaHarvard {
  valor: string;
  descripcion: string;
  tipo: MetricaTipo;
  color: ColorAcento;
  /** Si es numérico puro, se anima con contador. Si tiene texto, se muestra directo. */
  animable: boolean;
}

export const harvardMetricas: MetricaHarvard[] = [
  {
    valor: 'Último lugar',
    descripcion:
      'Hermosillo desarrolló la menor proporción de nuevas industrias potenciales entre ciudades comparables de México entre 2010 y 2020.',
    tipo: 'rezago',
    color: 'heat',
    animable: false,
  },
  {
    valor: '35',
    descripcion:
      'Porcentaje de empresas que consideran asequible el agua en Hermosillo, frente al 50% del promedio nacional.',
    tipo: 'rezago',
    color: 'heat',
    animable: true,
  },
  {
    valor: '3',
    descripcion:
      'Transbordos máximos que puede necesitar un trabajador para ir del norte de la ciudad a las zonas industriales del sur.',
    tipo: 'rezago',
    color: 'amber',
    animable: true,
  },
  {
    valor: '15',
    descripcion:
      'Tasa de crecimiento anual del comercio internacional de servicios digitales desde EUA. Oportunidad directa para el talento de Hermosillo.',
    tipo: 'oportunidad',
    color: 'go',
    animable: true,
  },
  {
    valor: '1,423',
    descripcion:
      'Megawatts de capacidad solar instalada en Sonora — la mayor de todo México — base del powershoring regional.',
    tipo: 'oportunidad',
    color: 'go',
    animable: false,
  },
  {
    valor: '73',
    descripcion:
      'Porcentaje de satisfacción empresarial con el servicio de agua en 2020, subiendo desde 54% en 2016. El problema estructural persiste.',
    tipo: 'contexto',
    color: 'amber',
    animable: true,
  },
];

export interface CuelloDeBottella {
  id: string;
  titulo: string;
  badge: string;
  badgeColor: ColorAcento;
  diagnostico: string;
  datoDestacado: string;
  soluciones: string[];
}

export const harvardCuellos: CuelloDeBottella[] = [
  {
    id: 'agua',
    titulo: 'Agua',
    badge: 'CRÍTICO',
    badgeColor: 'heat',
    diagnostico:
      'Hermosillo consume más de lo que sus acuíferos pueden reponer. La extracción subterránea supera la recarga natural. El Growth Lab lo describe como un impuesto oculto sobre la competitividad: empresas y familias pagan más en tarifas, infraestructura propia e incertidumbre de suministro.',
    datoDestacado:
      'Solo 35% de empresas considera asequible el servicio (vs. 50% nacional)',
    soluciones: [
      'Reducción de fugas con micromedidores y tecnología de detección',
      'Mercado de agua para reasignar concesiones hacia usos más productivos',
      'Reutilización de aguas residuales en industria y riego de áreas verdes',
    ],
  },
  {
    id: 'vivienda',
    titulo: 'Vivienda',
    badge: 'ESTRUCTURAL',
    badgeColor: 'amber',
    diagnostico:
      'Entre 2015 y 2020 los precios de vivienda crecieron más rápido que en ciudades comparables, obligando a exigir salarios más altos para vivir aquí. Los sueldos subieron como reflejo del encarecimiento habitacional, no por mayor productividad. La oferta no cubrió la demanda y se expandieron asentamientos informales en la periferia.',
    datoDestacado:
      'Salarios subieron por costo de vida, no por mayor productividad',
    soluciones: [
      'Aumentar oferta y asequibilidad de vivienda',
      'Planificar zonificación de corredores urbanos',
      'Fomentar densificación del centro histórico',
      'Uso mixto en nuevos desarrollos: vivienda, servicios y empleo integrados',
    ],
  },
  {
    id: 'transporte',
    titulo: 'Transporte público',
    badge: 'URGENTE',
    badgeColor: 'amber',
    diagnostico:
      'El sistema actual obliga a hasta 3 transbordos para ir del norte al sur. Muchas empresas costean transporte privado para sus trabajadores, lo que eleva significativamente los costos laborales. El Censo Económico 2024 confirma que la combinación de vivienda cara y transporte deficiente sigue limitando la oferta laboral.',
    datoDestacado:
      'Hasta 3 transbordos para llegar a zonas industriales del sur',
    soluciones: [
      'Sistema de Autobuses de Tránsito Rápido en bulevares principales',
      'Carriles exclusivos con estaciones cada 400–500 metros',
      'Corredores de movilidad integrada con ciclovías',
      'Reestructuración de rutas para eliminar duplicaciones',
    ],
  },
];

export interface OportunidadHarvard {
  id: string;
  titulo: string;
  descripcion: string;
  sectores: string[];
  colorBorde: ColorAcento;
}

export const harvardOportunidades: OportunidadHarvard[] = [
  {
    id: 'nearshoring',
    titulo: 'Nearshoring',
    descripcion:
      'El corredor Sonora-Arizona puede integrar nuevas piezas de valor. Arizona importa grandes volúmenes de insumos —electrónica, dispositivos médicos, baterías— desde fuera de México. Producir parte de esos insumos desde Hermosillo es una oportunidad directa y cercana.',
    sectores: ['Semiconductores', 'Dispositivos médicos', 'Maquinaria'],
    colorBorde: 'data',
  },
  {
    id: 'powershoring',
    titulo: 'Powershoring',
    descripcion:
      'Sonora tiene la mayor capacidad solar instalada de México: 1,423 MW. La descarbonización empuja industrias intensivas en energía a ubicarse donde hay renovables abundantes. Hermosillo puede atraer químicos, vidrio-cerámica, semiconductores y fabricantes OEM de paneles solares.',
    sectores: ['Industria verde', 'Energía limpia', 'Manufactura avanzada'],
    colorBorde: 'go',
  },
  {
    id: 'servicios-digitales',
    titulo: 'Servicios digitales',
    descripcion:
      'El comercio internacional de servicios de EUA crece a más del 15% anual. Hermosillo tiene capacidades locales en ingeniería, datos, diseño y software, con ventajas salariales para competir. La ciudad puede exportar conocimiento sin que el talento migre.',
    sectores: ['Ingeniería', 'Software', 'Consultoría', 'I+D'],
    colorBorde: 'amber',
  },
];
