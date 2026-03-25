export interface BlogPostRow {
  id: string;
  slug: string;
  titulo: string;
  subtitulo: string | null;
  cuerpo_md: string;
  extracto: string | null;
  imagen_url: string | null;
  autor: string;
  tags_json: string;
  estado: string;
  publicado_en: string | null;
  created_at: string;
  updated_at: string;
}

function parseRow(row: BlogPostRow) {
  return {
    ...row,
    tags: safeJsonParse<string[]>(row.tags_json, []),
  };
}

function safeJsonParse<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export async function getBlogPosts(db: D1Database, estado?: string) {
  let query = 'SELECT * FROM blog_posts';
  const params: string[] = [];

  if (estado) {
    query += ' WHERE estado = ?';
    params.push(estado);
  }

  query += ' ORDER BY COALESCE(publicado_en, created_at) DESC';

  const stmt = params.length
    ? db.prepare(query).bind(...params)
    : db.prepare(query);

  const result = await stmt.all<BlogPostRow>();
  return result.results.map(parseRow);
}

export async function getBlogPost(db: D1Database, id: string) {
  const row = await db
    .prepare('SELECT * FROM blog_posts WHERE id = ?')
    .bind(id)
    .first<BlogPostRow>();
  return row ? parseRow(row) : null;
}

export async function getBlogPostBySlug(db: D1Database, slug: string) {
  const row = await db
    .prepare('SELECT * FROM blog_posts WHERE slug = ? AND estado = "publicado"')
    .bind(slug)
    .first<BlogPostRow>();
  return row ? parseRow(row) : null;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export async function insertBlogPost(
  db: D1Database,
  data: { titulo: string; subtitulo?: string; cuerpo_md?: string; extracto?: string; autor?: string; tags?: string[] }
) {
  const id = crypto.randomUUID();
  const slug = slugify(data.titulo) + '-' + id.slice(0, 6);

  await db
    .prepare(
      `INSERT INTO blog_posts (id, slug, titulo, subtitulo, cuerpo_md, extracto, autor, tags_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      id, slug, data.titulo,
      data.subtitulo ?? null,
      data.cuerpo_md ?? '',
      data.extracto ?? null,
      data.autor ?? 'Data Driven Day',
      JSON.stringify(data.tags ?? [])
    )
    .run();

  return { id, slug };
}

const ALLOWED_BLOG_FIELDS = new Set<string>([
  'titulo', 'subtitulo', 'cuerpo_md', 'extracto', 'imagen_url', 'autor',
  'tags_json', 'estado', 'slug',
]);

export async function updateBlogPost(
  db: D1Database,
  id: string,
  patch: Record<string, unknown>
) {
  // Handle tags → tags_json conversion
  if (patch.tags) {
    patch.tags_json = JSON.stringify(patch.tags);
    delete patch.tags;
  }

  const safe = Object.entries(patch).filter(([k]) => ALLOWED_BLOG_FIELDS.has(k));
  if (!safe.length) return;
  const fields = safe.map(([k]) => `${k} = ?`).join(', ');
  const values = safe.map(([, v]) => v);

  await db
    .prepare(`UPDATE blog_posts SET ${fields} WHERE id = ?`)
    .bind(...values, id)
    .run();
}

export async function publishBlogPost(db: D1Database, id: string) {
  await db
    .prepare(
      `UPDATE blog_posts SET estado = 'publicado', publicado_en = datetime('now') WHERE id = ?`
    )
    .bind(id)
    .run();
}

export async function archiveBlogPost(db: D1Database, id: string) {
  await db
    .prepare(`UPDATE blog_posts SET estado = 'archivado' WHERE id = ?`)
    .bind(id)
    .run();
}

export async function deleteBlogPost(db: D1Database, id: string) {
  await db
    .prepare('DELETE FROM blog_posts WHERE id = ?')
    .bind(id)
    .run();
}
