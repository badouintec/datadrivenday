/**
 * Cloudflare Workers AI helpers for slide content generation.
 * Uses @cf/meta/llama-3.1-8b-instruct via the AI binding.
 */

const MODEL = '@cf/meta/llama-3.1-8b-instruct-fp8' as const;

function runModel(ai: Ai, input: Record<string, unknown>) {
  return ai.run(MODEL as keyof AiModels, input);
}

interface SlideContext {
  titulo: string;
  subtitulo?: string | null;
  cuerpo?: string | null;
  conceptosClave?: string[];
  tag?: string | null;
}

function buildSlidePrompt(slide: SlideContext): string {
  let ctx = `Título: ${slide.titulo}`;
  if (slide.subtitulo) ctx += `\nSubtítulo: ${slide.subtitulo}`;
  if (slide.tag) ctx += `\nTag: ${slide.tag}`;
  if (slide.cuerpo) ctx += `\nCuerpo: ${slide.cuerpo}`;
  if (slide.conceptosClave?.length) ctx += `\nConceptos clave: ${slide.conceptosClave.join(', ')}`;
  return ctx;
}

/** Generate presenter notes (talking points) from slide content. */
export async function generateNotes(ai: Ai, slide: SlideContext): Promise<string> {
  const slideCtx = buildSlidePrompt(slide);

  const result = await runModel(ai, {
    messages: [
      {
        role: 'system',
        content:
          'Eres un asistente para presentadores en conferencias de datos y política pública en Hermosillo, México. ' +
          'Genera notas concisas para el presentador en español. Formato: 3-5 bullet points con "•". ' +
          'Cada punto debe ser una oración corta que el presentador pueda leer de un vistazo. ' +
          'No repitas el título. No uses emojis. Sé directo y útil.',
      },
      {
        role: 'user',
        content: `Genera notas del presentador para este slide:\n\n${slideCtx}`,
      },
    ],
    max_tokens: 300,
  });

  const text = (result as { response?: string }).response ?? '';
  return text.trim();
}

/** Suggest key concepts/tags from slide content. Returns 3-6 short terms. */
export async function suggestConcepts(ai: Ai, slide: SlideContext): Promise<string[]> {
  const slideCtx = buildSlidePrompt(slide);

  const result = await runModel(ai, {
    messages: [
      {
        role: 'system',
        content:
          'Eres un asistente que extrae conceptos clave de slides de presentaciones sobre datos y política pública. ' +
          'Responde SOLO con una lista separada por comas de 3 a 6 conceptos cortos (1-3 palabras cada uno) en español. ' +
          'Sin numeración, sin explicaciones, solo los conceptos separados por coma.',
      },
      {
        role: 'user',
        content: `Extrae los conceptos clave de este slide:\n\n${slideCtx}`,
      },
    ],
    max_tokens: 100,
  });

  const text = (result as { response?: string }).response ?? '';
  return text
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && s.length < 40);
}

/** Live concept graph — extract nodes and edges from speech + slide context. */
export interface GraphNode {
  id: string;
  label: string;
}
export interface GraphEdge {
  from: string;
  to: string;
}
export interface ConceptGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

function normalizeText(value: string): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function toGraphId(value: string): string {
  return normalizeText(value)
    .replace(/\s+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 48);
}

function toGraphLabel(value: string): string {
  return String(value ?? '')
    .trim()
    .split(/\s+/)
    .slice(0, 3)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

const GRAPH_STOPWORDS = new Set([
  'para', 'como', 'este', 'esta', 'estos', 'estas', 'sobre', 'desde', 'hasta', 'donde', 'cuando',
  'porque', 'tambien', 'entre', 'tener', 'tiene', 'vamos', 'puede', 'pueden', 'hacer', 'hacia',
  'cada', 'todos', 'todas', 'datos', 'valor', 'senal', 'senalar', 'mismo', 'misma', 'mismos',
  'mismas', 'muy', 'mas', 'menos', 'bien', 'solo', 'nada', 'algo', 'esta', 'esto', 'aqui', 'alli',
  'entonces', 'bueno', 'pues', 'osea', 'digamos', 'ser', 'estar', 'fue', 'son', 'era', 'eran',
  'hay', 'una', 'uno', 'unos', 'unas', 'con', 'sin', 'por', 'del', 'las', 'los', 'que', 'esa',
  'ese', 'eso', 'sus', 'nos', 'les', 'pero', 'sobre', 'tema', 'cosa', 'cosas', 'parte', 'nivel',
]);

export function buildFallbackConceptGraph(
  slide: SlideContext,
  transcript: string,
  existingNodes: string[],
): ConceptGraph {
  const normalizedTranscript = normalizeText(transcript);
  const existingNodeSet = new Set(existingNodes.map((node) => normalizeText(node).replace(/\s+/g, '_')));
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const seen = new Set(existingNodeSet);

  const addNode = (rawLabel: string) => {
    const label = toGraphLabel(rawLabel);
    const id = toGraphId(label);
    if (!label || !id || seen.has(id)) return;
    seen.add(id);
    nodes.push({ id, label });
  };

  for (const concept of slide.conceptosClave ?? []) {
    const normalizedConcept = normalizeText(concept);
    if (normalizedConcept && normalizedTranscript.includes(normalizedConcept)) {
      addNode(concept);
    }
    if (nodes.length >= 4) break;
  }

  if (nodes.length < 4) {
    const wordCounts = new Map<string, number>();
    const words = normalizedTranscript.split(' ').filter(Boolean);
    for (const word of words) {
      if (word.length < 4 || GRAPH_STOPWORDS.has(word)) continue;
      wordCounts.set(word, (wordCounts.get(word) ?? 0) + 1);
    }

    const topWords = [...wordCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([word]) => word);

    for (const word of topWords) {
      addNode(word);
      if (nodes.length >= 4) break;
    }
  }

  if (!nodes.length) {
    const fallbackContext = [slide.tag, slide.titulo, slide.subtitulo]
      .map((part) => String(part ?? '').trim())
      .find(Boolean);
    if (fallbackContext) addNode(fallbackContext);
  }

  const anchor = existingNodes.find(Boolean);
  for (let index = 0; index < nodes.length; index += 1) {
    const current = nodes[index];
    if (index > 0) {
      edges.push({ from: nodes[index - 1].id, to: current.id });
    } else if (anchor) {
      const anchorId = toGraphId(anchor);
      if (anchorId && anchorId !== current.id) {
        edges.push({ from: anchorId, to: current.id });
      }
    }
  }

  return { nodes, edges };
}

export async function extractConceptGraph(
  ai: Ai,
  slide: SlideContext,
  transcript: string,
  existingNodes: string[],
): Promise<ConceptGraph> {
  const slideCtx = buildSlidePrompt(slide);
  const existing = existingNodes.length ? `\nNodos ya visibles: ${existingNodes.join(', ')}` : '';

  try {
    const result = await runModel(ai, {
      messages: [
        {
          role: 'system',
          content:
            'Extraes conceptos clave y sus conexiones de lo que dice un presentador en una conferencia de datos y política pública. ' +
            'Responde SOLO con JSON válido, sin markdown, sin explicación. Formato exacto:\n' +
            '{"nodes":[{"id":"concepto_corto","label":"Concepto Corto"}],"edges":[{"from":"id1","to":"id2"}]}\n' +
            'Reglas:\n' +
            '- Máximo 4 nodos nuevos por llamada\n' +
            '- Los id son snake_case sin acentos\n' +
            '- Labels son 1-3 palabras en español, capitalizados\n' +
            '- Conecta nodos relacionados semánticamente (incluye nodos existentes si aplica)\n' +
            '- No repitas nodos que ya existen\n' +
            '- Si no hay conceptos claros, responde {"nodes":[],"edges":[]}',
        },
        {
          role: 'user',
          content: `Contexto del slide:\n${slideCtx}${existing}\n\nTranscripción reciente:\n"${transcript}"`,
        },
      ],
      max_tokens: 250,
    });

    const text = (result as { response?: string }).response ?? '';
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return buildFallbackConceptGraph(slide, transcript, existingNodes);
    let parsed: { nodes?: Array<{ id?: string; label?: string }>; edges?: Array<{ from?: string; to?: string }> };
    try {
      parsed = JSON.parse(match[0]) as { nodes?: Array<{ id?: string; label?: string }>; edges?: Array<{ from?: string; to?: string }> };
    } catch {
      return buildFallbackConceptGraph(slide, transcript, existingNodes);
    }
    const nodes: GraphNode[] = (parsed.nodes ?? [])
      .filter((n): n is { id: string; label: string } => Boolean(n?.id && n?.label))
      .map((n) => ({ id: String(n.id), label: String(n.label) }));
    const edges: GraphEdge[] = (parsed.edges ?? [])
      .filter((e): e is { from: string; to: string } => Boolean(e?.from && e?.to))
      .map((e) => ({ from: String(e.from), to: String(e.to) }));
    if (!nodes.length && !edges.length) {
      return buildFallbackConceptGraph(slide, transcript, existingNodes);
    }
    return { nodes, edges };
  } catch {
    return buildFallbackConceptGraph(slide, transcript, existingNodes);
  }
}
