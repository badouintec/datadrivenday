/**
 * Cloudflare Workers AI helpers for slide content generation.
 * Uses @cf/meta/llama-3.1-8b-instruct via the AI binding.
 */

const MODEL = '@cf/meta/llama-3.1-8b-instruct' as const;

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

  const result = await ai.run(MODEL, {
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

  const result = await ai.run(MODEL, {
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
