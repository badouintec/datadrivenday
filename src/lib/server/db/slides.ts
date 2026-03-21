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

function parseSlideRow(row: SlideRow) {
  return {
    ...row,
    chord: JSON.parse(row.chord_json) as number[],
    commandWords: JSON.parse(row.command_words_json) as string[],
    referencias: JSON.parse(row.referencias_json),
    conceptosClave: JSON.parse(row.conceptos_json) as string[],
    isActive: row.is_active === 1,
    particleState: row.particle_state,
    accentColor: row.accent_color,
    particleSpeed: row.particle_speed,
    codigoDemo: row.codigo_demo,
  };
}

// ── Presentations ─────────────────────────────────────────────────────────────

export async function getPresentations(db: D1Database) {
  const result = await db
    .prepare('SELECT * FROM presentations ORDER BY updated_at DESC')
    .all<PresentationRow>();
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

export async function updatePresentation(
  db: D1Database,
  id: string,
  patch: Partial<Omit<PresentationRow, 'id' | 'created_at' | 'updated_at'>>
) {
  const fields = Object.keys(patch).map(k => `${k} = ?`).join(', ');
  const values = Object.values(patch);
  await db
    .prepare(`UPDATE presentations SET ${fields} WHERE id = ?`)
    .bind(...values, id)
    .run();
}

export async function deletePresentation(db: D1Database, id: string) {
  await db.batch([
    db.prepare('DELETE FROM presentation_slides WHERE presentacion = ?').bind(id),
    db.prepare('DELETE FROM presentations WHERE id = ?').bind(id),
  ]);
}

// ── Slides ────────────────────────────────────────────────────────────────────

export async function getSlides(db: D1Database, presentacion = 'dataller-2026') {
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
        command_words_json, referencias_json, codigo_demo, conceptos_json, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      id, data.presentacion, data.numero, data.tag, data.titulo,
      data.subtitulo ?? null, data.cuerpo, data.notas ?? null,
      data.duracion, data.particle_state, data.accent_color,
      data.chord_json, data.particle_speed, data.command_words_json,
      data.referencias_json, data.codigo_demo ?? null,
      data.conceptos_json, data.is_active
    )
    .run();
  return id;
}

export async function updateSlide(
  db: D1Database,
  id: string,
  patch: Partial<Omit<SlideRow, 'id' | 'created_at' | 'updated_at'>>
) {
  const fields = Object.keys(patch).map(k => `${k} = ?`).join(', ');
  const values = Object.values(patch);
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

  return insertSlide(db, {
    presentacion: original.presentacion,
    numero: original.numero + 1,
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
    is_active: original.isActive ? 1 : 0,
  });
}
