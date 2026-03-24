export interface SlideRow {
  id: string;
  presentacion: string;
  numero: number;
  tag: string;
  titulo: string;
  subtitulo: string | null;
  cuerpo: string;
  notas: string | null;
  duracion: number;
  particle_state: string;
  accent_color: string;
  chord_json: string;
  particle_speed: number;
  command_words_json: string;
  referencias_json: string;
  codigo_demo: string | null;
  conceptos_json: string;
  imagen_url: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface PresentationRow {
  id: string;
  nombre: string;
  slug: string;
  token: string;
  descripcion: string | null;
  estado: string;
  pagina_url: string | null;
  created_at: string;
  updated_at: string;
}

function safeJsonParse<T>(json: string, fallback: T): T {
  try { return JSON.parse(json) as T; } catch { return fallback; }
}

function parseSlideRow(row: SlideRow) {
  return {
    ...row,
    chord: safeJsonParse<number[]>(row.chord_json, [196, 261.63, 329.63]),
    commandWords: safeJsonParse<string[]>(row.command_words_json, []),
    referencias: safeJsonParse<unknown[]>(row.referencias_json, []),
    conceptosClave: safeJsonParse<string[]>(row.conceptos_json, []),
    isActive: row.is_active === 1,
    particleState: row.particle_state,
    accentColor: row.accent_color,
    particleSpeed: row.particle_speed,
    codigoDemo: row.codigo_demo,
    imagenUrl: row.imagen_url,
  };
}

// ── Presentations ─────────────────────────────────────────────────────────────

export async function getPresentations(db: D1Database) {
  const result = await db
    .prepare(`
      SELECT p.*,
             COALESCE(s.slide_count, 0) AS slideCount
      FROM presentations p
      LEFT JOIN (
        SELECT presentacion, COUNT(*) AS slide_count
        FROM presentation_slides
        GROUP BY presentacion
      ) s ON s.presentacion = p.id
      ORDER BY p.updated_at DESC
    `)
    .all<PresentationRow & { slideCount: number }>();
  return result.results;
}

export async function getPresentation(db: D1Database, id: string) {
  return db
    .prepare('SELECT * FROM presentations WHERE id = ?')
    .bind(id)
    .first<PresentationRow>();
}

export async function insertPresentation(
  db: D1Database,
  data: { nombre: string; slug: string; token: string; descripcion?: string; pagina_url?: string }
) {
  const id = crypto.randomUUID();
  await db
    .prepare(
      `INSERT INTO presentations (id, nombre, slug, token, descripcion, pagina_url)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .bind(id, data.nombre, data.slug, data.token, data.descripcion ?? null, data.pagina_url ?? null)
    .run();
  return id;
}

const ALLOWED_PRESENTATION_FIELDS = new Set<string>([
  'nombre', 'slug', 'token', 'descripcion', 'estado', 'pagina_url',
]);

export async function updatePresentation(
  db: D1Database,
  id: string,
  patch: Partial<Omit<PresentationRow, 'id' | 'created_at' | 'updated_at'>>
) {
  const safe = Object.entries(patch).filter(([k]) => ALLOWED_PRESENTATION_FIELDS.has(k));
  if (!safe.length) return;
  const fields = safe.map(([k]) => `${k} = ?`).join(', ');
  const values = safe.map(([, v]) => v);
  await db
    .prepare(`UPDATE presentations SET ${fields} WHERE id = ?`)
    .bind(...values, id)
    .run();
}

export async function deletePresentation(db: D1Database, id: string) {
  await db.batch([
    db.prepare('DELETE FROM participant_presentation_comments WHERE presentacion_id = ?').bind(id),
    db.prepare('DELETE FROM presentation_slides WHERE presentacion = ?').bind(id),
    db.prepare('DELETE FROM presentations WHERE id = ?').bind(id),
  ]);
}

// ── Slides ────────────────────────────────────────────────────────────────────

export async function getSlides(db: D1Database, presentacion = 'pres-dataller-2026') {
  const result = await db
    .prepare(
      `SELECT * FROM presentation_slides
       WHERE presentacion = ?
       ORDER BY numero ASC`
    )
    .bind(presentacion)
    .all<SlideRow>();
  return result.results.map(parseSlideRow);
}

export async function getSlide(db: D1Database, id: string) {
  const row = await db
    .prepare('SELECT * FROM presentation_slides WHERE id = ?')
    .bind(id)
    .first<SlideRow>();
  return row ? parseSlideRow(row) : null;
}

export async function getMaxSlideNumero(db: D1Database, presentacion: string): Promise<number> {
  const row = await db
    .prepare('SELECT COALESCE(MAX(numero), 0) AS max_n FROM presentation_slides WHERE presentacion = ?')
    .bind(presentacion)
    .first<{ max_n: number }>();
  return row?.max_n ?? 0;
}

export async function insertSlide(
  db: D1Database,
  data: Omit<SlideRow, 'id' | 'created_at' | 'updated_at'>
) {
  const id = crypto.randomUUID();
  await db
    .prepare(
      `INSERT INTO presentation_slides
       (id, presentacion, numero, tag, titulo, subtitulo, cuerpo, notas,
        duracion, particle_state, accent_color, chord_json, particle_speed,
        command_words_json, referencias_json, codigo_demo, conceptos_json,
        imagen_url, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      id, data.presentacion, data.numero, data.tag, data.titulo,
      data.subtitulo ?? null, data.cuerpo, data.notas ?? null,
      data.duracion, data.particle_state, data.accent_color,
      data.chord_json, data.particle_speed, data.command_words_json,
      data.referencias_json, data.codigo_demo ?? null,
      data.conceptos_json, data.imagen_url ?? null, data.is_active
    )
    .run();
  return id;
}

const ALLOWED_SLIDE_FIELDS = new Set<string>([
  'presentacion', 'numero', 'tag', 'titulo', 'subtitulo', 'cuerpo', 'notas',
  'duracion', 'particle_state', 'accent_color', 'chord_json', 'particle_speed',
  'command_words_json', 'referencias_json', 'codigo_demo', 'conceptos_json', 'imagen_url', 'is_active',
]);

export async function updateSlide(
  db: D1Database,
  id: string,
  patch: Partial<Omit<SlideRow, 'id' | 'created_at' | 'updated_at'>>
) {
  const safe = Object.entries(patch).filter(([k]) => ALLOWED_SLIDE_FIELDS.has(k));
  if (!safe.length) return;
  const fields = safe.map(([k]) => `${k} = ?`).join(', ');
  const values = safe.map(([, v]) => v);
  await db
    .prepare(`UPDATE presentation_slides SET ${fields} WHERE id = ?`)
    .bind(...values, id)
    .run();
}

export async function deleteSlide(db: D1Database, id: string) {
  await db
    .prepare('DELETE FROM presentation_slides WHERE id = ?')
    .bind(id)
    .run();
}

export async function reorderSlides(
  db: D1Database,
  updates: Array<{ id: string; numero: number }>
) {
  const statements = updates.map(({ id, numero }) =>
    db.prepare('UPDATE presentation_slides SET numero = ? WHERE id = ?').bind(numero, id)
  );
  await db.batch(statements);
}

export async function duplicateSlide(db: D1Database, id: string) {
  const original = await getSlide(db, id);
  if (!original) throw new Error('Slide not found');

  const newNumero = original.numero + 1;

  // Shift all subsequent slides up by 1 to make room
  await db
    .prepare(
      'UPDATE presentation_slides SET numero = numero + 1 WHERE presentacion = ? AND numero >= ?'
    )
    .bind(original.presentacion, newNumero)
    .run();

  return insertSlide(db, {
    presentacion: original.presentacion,
    numero: newNumero,
    tag: original.tag,
    titulo: `${original.titulo} (copia)`,
    subtitulo: original.subtitulo,
    cuerpo: original.cuerpo,
    notas: original.notas,
    duracion: original.duracion,
    particle_state: original.particle_state,
    accent_color: original.accent_color,
    chord_json: JSON.stringify(original.chord),
    particle_speed: original.particle_speed,
    command_words_json: JSON.stringify(original.commandWords),
    referencias_json: JSON.stringify(original.referencias),
    codigo_demo: original.codigo_demo,
    conceptos_json: JSON.stringify(original.conceptosClave),
    imagen_url: null,
    is_active: original.isActive ? 1 : 0,
  });
}
