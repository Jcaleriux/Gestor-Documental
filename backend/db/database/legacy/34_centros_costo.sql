CREATE TABLE IF NOT EXISTS centros_costo (
  id SERIAL PRIMARY KEY,
  sociedad_id INTEGER NOT NULL,
  codigo VARCHAR(50) NOT NULL,
  nombre VARCHAR(255) NOT NULL,
  centro_padre_id INTEGER NULL,
  usuario_aprobador_id INTEGER NOT NULL,
  seleccionable_en_contabilizacion BOOLEAN NOT NULL DEFAULT TRUE,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  orden INTEGER NULL,
  metadata JSONB,
  creado_por VARCHAR(100),
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'centros_costo_sociedad_id_codigo_key'
  ) THEN
    ALTER TABLE centros_costo
      ADD CONSTRAINT centros_costo_sociedad_id_codigo_key UNIQUE (sociedad_id, codigo);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'centros_costo_sociedad_id_fkey'
  ) THEN
    ALTER TABLE centros_costo
      ADD CONSTRAINT centros_costo_sociedad_id_fkey
      FOREIGN KEY (sociedad_id)
      REFERENCES sociedades(id)
      ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'centros_costo_centro_padre_id_fkey'
  ) THEN
    ALTER TABLE centros_costo
      ADD CONSTRAINT centros_costo_centro_padre_id_fkey
      FOREIGN KEY (centro_padre_id)
      REFERENCES centros_costo(id)
      ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'centros_costo_usuario_aprobador_id_fkey'
  ) THEN
    ALTER TABLE centros_costo
      ADD CONSTRAINT centros_costo_usuario_aprobador_id_fkey
      FOREIGN KEY (usuario_aprobador_id)
      REFERENCES usuarios(id)
      ON DELETE NO ACTION;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_centros_costo_sociedad
  ON centros_costo(sociedad_id);

CREATE INDEX IF NOT EXISTS idx_centros_costo_padre
  ON centros_costo(centro_padre_id);

CREATE INDEX IF NOT EXISTS idx_centros_costo_aprobador
  ON centros_costo(usuario_aprobador_id);

CREATE INDEX IF NOT EXISTS idx_centros_costo_activo
  ON centros_costo(sociedad_id, activo);

CREATE UNIQUE INDEX IF NOT EXISTS idx_centros_costo_sociedad_codigo
  ON centros_costo(sociedad_id, codigo);
