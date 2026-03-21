CREATE TABLE IF NOT EXISTS blog_posts (
  id           TEXT PRIMARY KEY,
  slug         TEXT NOT NULL UNIQUE,
  titulo       TEXT NOT NULL,
  subtitulo    TEXT,
  cuerpo_md    TEXT NOT NULL DEFAULT '',
  extracto     TEXT,
  imagen_url   TEXT,
  autor        TEXT NOT NULL DEFAULT 'Data Driven Day',
  tags_json    TEXT NOT NULL DEFAULT '[]',
  estado       TEXT NOT NULL DEFAULT 'borrador',
  publicado_en TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_blog_estado
  ON blog_posts(estado, publicado_en DESC);

CREATE INDEX IF NOT EXISTS idx_blog_slug
  ON blog_posts(slug);

CREATE TRIGGER IF NOT EXISTS blog_updated_at
  AFTER UPDATE ON blog_posts
  BEGIN
    UPDATE blog_posts SET updated_at = datetime('now') WHERE id = NEW.id;
  END;
