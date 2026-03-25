CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  username TEXT NOT NULL,
  user_rol TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  action TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'success',
  error_code TEXT,
  old_values TEXT,
  new_values TEXT,
  changes_count INTEGER NOT NULL DEFAULT 0,
  request_id TEXT,
  client_ip TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES admin_users(id),
  CHECK (action IN ('CREATE', 'PATCH', 'DELETE', 'PUBLISH', 'ARCHIVE', 'EXPORT')),
  CHECK (status IN ('success', 'error', 'rejected'))
);

CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx
ON audit_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS audit_logs_user_created_at_idx
ON audit_logs(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS audit_logs_resource_created_at_idx
ON audit_logs(resource_type, resource_id, created_at DESC);
