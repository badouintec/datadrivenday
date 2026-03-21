CREATE TABLE IF NOT EXISTS recursos (
  id           TEXT PRIMARY KEY,
  titulo       TEXT NOT NULL,
  fuente       TEXT NOT NULL,
  anio         TEXT NOT NULL,
  url          TEXT NOT NULL,
  tipo         TEXT NOT NULL DEFAULT 'informe',
  categoria    TEXT NOT NULL DEFAULT 'tecnologia',
  descripcion  TEXT,
  is_featured  INTEGER NOT NULL DEFAULT 0,
  is_active    INTEGER NOT NULL DEFAULT 1,
  orden        INTEGER NOT NULL DEFAULT 0,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_recursos_categoria
  ON recursos(categoria, orden ASC);

CREATE TRIGGER IF NOT EXISTS recursos_updated_at
  AFTER UPDATE ON recursos
  BEGIN
    UPDATE recursos SET updated_at = datetime('now') WHERE id = NEW.id;
  END;
