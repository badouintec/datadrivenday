export interface RecursoRow {
  id: string;
  titulo: string;
  fuente: string;
  anio: string;
  url: string;
  tipo: string;
  categoria: string;
  descripcion: string | null;
  is_featured: number;
  is_active: number;
  orden: number;
  created_at: string;
  updated_at: string;
}

export async function getRecursos(db: D1Database, categoria?: string) {
  let query = 'SELECT * FROM recursos';
  const params: string[] = [];

  if (categoria) {
    query += ' WHERE categoria = ?';
    params.push(categoria);
  }

  query += ' ORDER BY orden ASC, created_at DESC';

  const stmt = params.length
    ? db.prepare(query).bind(...params)
    : db.prepare(query);

  const result = await stmt.all<RecursoRow>();
  return result.results;
}

export async function getRecurso(db: D1Database, id: string) {
  return db
    .prepare('SELECT * FROM recursos WHERE id = ?')
    .bind(id)
    .first<RecursoRow>();
}

export async function getPublicRecursos(db: D1Database, categoria?: string) {
  let query = 'SELECT * FROM recursos WHERE is_active = 1';
  const params: string[] = [];

  if (categoria) {
    query += ' AND categoria = ?';
    params.push(categoria);
  }

  query += ' ORDER BY orden ASC';

  const stmt = params.length
    ? db.prepare(query).bind(...params)
    : db.prepare(query);

  const result = await stmt.all<RecursoRow>();
  return result.results;
}

export async function insertRecurso(
  db: D1Database,
  data: Omit<RecursoRow, 'id' | 'created_at' | 'updated_at'>
) {
  const id = crypto.randomUUID();
  await db
    .prepare(
      `INSERT INTO recursos (id, titulo, fuente, anio, url, tipo, categoria, descripcion, is_featured, is_active, orden)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      id, data.titulo, data.fuente, data.anio, data.url,
      data.tipo, data.categoria, data.descripcion ?? null,
      data.is_featured, data.is_active, data.orden
    )
    .run();
  return id;
}

const ALLOWED_RECURSO_FIELDS = new Set<string>([
  'titulo', 'fuente', 'anio', 'url', 'tipo', 'categoria',
  'descripcion', 'is_featured', 'is_active', 'orden',
]);

export async function updateRecurso(
  db: D1Database,
  id: string,
  patch: Partial<Omit<RecursoRow, 'id' | 'created_at' | 'updated_at'>>
) {
  const safe = Object.entries(patch).filter(([k]) => ALLOWED_RECURSO_FIELDS.has(k));
  if (!safe.length) return;
  const fields = safe.map(([k]) => `${k} = ?`).join(', ');
  const values = safe.map(([, v]) => v);
  await db
    .prepare(`UPDATE recursos SET ${fields} WHERE id = ?`)
    .bind(...values, id)
    .run();
}

export async function deleteRecurso(db: D1Database, id: string) {
  await db
    .prepare('DELETE FROM recursos WHERE id = ?')
    .bind(id)
    .run();
}

export async function reorderRecursos(
  db: D1Database,
  updates: Array<{ id: string; orden: number }>
) {
  const statements = updates.map(({ id, orden }) =>
    db.prepare('UPDATE recursos SET orden = ? WHERE id = ?').bind(orden, id)
  );
  await db.batch(statements);
}
