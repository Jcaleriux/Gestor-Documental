CREATE TABLE IF NOT EXISTS usuarios_sociedades (
  id SERIAL PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  sociedad_id INTEGER NOT NULL REFERENCES sociedades(id) ON DELETE CASCADE,
  creado_en TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (usuario_id, sociedad_id)
);

CREATE INDEX IF NOT EXISTS idx_usuarios_sociedades_usuario
  ON usuarios_sociedades(usuario_id);

CREATE INDEX IF NOT EXISTS idx_usuarios_sociedades_sociedad
  ON usuarios_sociedades(sociedad_id);
