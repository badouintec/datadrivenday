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

export async function extractConceptGraph(
  ai: Ai,
  slide: SlideContext,
  transcript: string,
  existingNodes: string[],
): Promise<ConceptGraph> {
  const slideCtx = buildSlidePrompt(slide);
  const existing = existingNodes.length ? `\nNodos ya visibles: ${existingNodes.join(', ')}` : '';

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
  try {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return { nodes: [], edges: [] };
    const parsed = JSON.parse(match[0]);
    const nodes: GraphNode[] = (parsed.nodes ?? [])
      .filter((n: { id?: string; label?: string }) => n?.id && n?.label)
      .map((n: { id: string; label: string }) => ({ id: String(n.id), label: String(n.label) }));
    const edges: GraphEdge[] = (parsed.edges ?? [])
      .filter((e: { from?: string; to?: string }) => e?.from && e?.to)
      .map((e: { from: string; to: string }) => ({ from: String(e.from), to: String(e.to) }));
    return { nodes, edges };
  } catch {
    return { nodes: [], edges: [] };
  }
}
