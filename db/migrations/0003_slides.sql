-- Tabla de presentaciones
CREATE TABLE IF NOT EXISTS presentations (
  id           TEXT PRIMARY KEY,
  nombre       TEXT NOT NULL,
  slug         TEXT NOT NULL UNIQUE,
  token        TEXT NOT NULL,
  descripcion  TEXT,
  estado       TEXT NOT NULL DEFAULT 'borrador',
  pagina_url   TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TRIGGER IF NOT EXISTS presentations_updated_at
  AFTER UPDATE ON presentations
  BEGIN
    UPDATE presentations SET updated_at = datetime('now') WHERE id = NEW.id;
  END;

-- Tabla principal de slides
CREATE TABLE IF NOT EXISTS presentation_slides (
  id          TEXT PRIMARY KEY,
  presentacion TEXT NOT NULL DEFAULT 'dataller-2026',
  numero      INTEGER NOT NULL,
  tag         TEXT NOT NULL,
  titulo      TEXT NOT NULL,
  subtitulo   TEXT,
  cuerpo      TEXT NOT NULL,
  notas       TEXT,
  duracion    INTEGER NOT NULL DEFAULT 15,
  particle_state TEXT NOT NULL DEFAULT 'chaos',
  accent_color   TEXT NOT NULL DEFAULT 'primary',
  chord_json     TEXT NOT NULL DEFAULT '[]',
  particle_speed REAL NOT NULL DEFAULT 0.04,
  command_words_json TEXT DEFAULT '[]',
  referencias_json   TEXT DEFAULT '[]',
  codigo_demo  TEXT,
  conceptos_json TEXT DEFAULT '[]',
  is_active    INTEGER NOT NULL DEFAULT 1,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_slides_presentacion_numero
  ON presentation_slides(presentacion, numero);

CREATE TRIGGER IF NOT EXISTS slides_updated_at
  AFTER UPDATE ON presentation_slides
  BEGIN
    UPDATE presentation_slides SET updated_at = datetime('now') WHERE id = NEW.id;
  END;

-- Tabla de usuarios admin
CREATE TABLE IF NOT EXISTS admin_users (
  id           TEXT PRIMARY KEY,
  username     TEXT NOT NULL UNIQUE,
  pass_hash    TEXT NOT NULL,
  rol          TEXT NOT NULL DEFAULT 'editor',
  nombre       TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  last_login   TEXT
);
