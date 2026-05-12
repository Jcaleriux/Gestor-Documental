CREATE TABLE IF NOT EXISTS tramites_pago_documentos_aprobadores (
  id SERIAL PRIMARY KEY,
  tramite_id INTEGER NOT NULL,
  factura_id INTEGER NOT NULL,
  usuario_aprobador_id INTEGER NULL,
  usuario_aprobador_nombre VARCHAR(150),
  usuario_aprobador_email VARCHAR(255),
  rol_aprobador_id INTEGER,
  rol_aprobador_codigo VARCHAR(100),
  rol_aprobador_nombre VARCHAR(150),
  estado_gerencia VARCHAR(20) NOT NULL DEFAULT 'pendiente',
  motivo_gerencia TEXT,
  decision_usuario_id INTEGER,
  decision_usuario_nombre VARCHAR(150),
  decision_usuario_email VARCHAR(255),
  decision_en TIMESTAMP,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT tramites_pago_documentos_aprobadores_unique
    UNIQUE (tramite_id, factura_id, usuario_aprobador_id),
  CONSTRAINT tramites_pago_documentos_aprobadores_aprobador_check
    CHECK (num_nonnulls(usuario_aprobador_id, rol_aprobador_id) = 1),
  CONSTRAINT tramites_pago_documentos_aprobadores_estado_gerencia_check
    CHECK (estado_gerencia IN ('pendiente', 'aprobado', 'rechazado'))
);

DO $$
BEGIN
  ALTER TABLE tramites_pago_documentos_aprobadores
    ALTER COLUMN usuario_aprobador_id DROP NOT NULL;

  ALTER TABLE tramites_pago_documentos_aprobadores
    ADD COLUMN IF NOT EXISTS rol_aprobador_id INTEGER;

  ALTER TABLE tramites_pago_documentos_aprobadores
    ADD COLUMN IF NOT EXISTS rol_aprobador_codigo VARCHAR(100);

  ALTER TABLE tramites_pago_documentos_aprobadores
    ADD COLUMN IF NOT EXISTS rol_aprobador_nombre VARCHAR(150);

  ALTER TABLE tramites_pago_documentos_aprobadores
    ADD COLUMN IF NOT EXISTS decision_usuario_id INTEGER;

  ALTER TABLE tramites_pago_documentos_aprobadores
    ADD COLUMN IF NOT EXISTS decision_usuario_nombre VARCHAR(150);

  ALTER TABLE tramites_pago_documentos_aprobadores
    ADD COLUMN IF NOT EXISTS decision_usuario_email VARCHAR(255);

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'tramites_pago_documentos_aprobadores_tramite_id_fkey'
  ) THEN
    ALTER TABLE tramites_pago_documentos_aprobadores
      ADD CONSTRAINT tramites_pago_documentos_aprobadores_tramite_id_fkey
      FOREIGN KEY (tramite_id)
      REFERENCES tramites_pago(id)
      ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'tramites_pago_documentos_aprobadores_factura_id_fkey'
  ) THEN
    ALTER TABLE tramites_pago_documentos_aprobadores
      ADD CONSTRAINT tramites_pago_documentos_aprobadores_factura_id_fkey
      FOREIGN KEY (factura_id)
      REFERENCES facturas(id)
      ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'tramites_pago_documentos_aprobadores_usuario_aprobador_id_fkey'
  ) THEN
    ALTER TABLE tramites_pago_documentos_aprobadores
      ADD CONSTRAINT tramites_pago_documentos_aprobadores_usuario_aprobador_id_fkey
      FOREIGN KEY (usuario_aprobador_id)
      REFERENCES usuarios(id)
      ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'tramites_pago_documentos_aprobadores_rol_aprobador_id_fkey'
  ) THEN
    ALTER TABLE tramites_pago_documentos_aprobadores
      ADD CONSTRAINT tramites_pago_documentos_aprobadores_rol_aprobador_id_fkey
      FOREIGN KEY (rol_aprobador_id)
      REFERENCES roles(id)
      ON DELETE NO ACTION;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'tramites_pago_documentos_aprobadores_decision_usuario_id_fkey'
  ) THEN
    ALTER TABLE tramites_pago_documentos_aprobadores
      ADD CONSTRAINT tramites_pago_documentos_aprobadores_decision_usuario_id_fkey
      FOREIGN KEY (decision_usuario_id)
      REFERENCES usuarios(id)
      ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'tramites_pago_documentos_aprobadores_aprobador_check'
  ) THEN
    ALTER TABLE tramites_pago_documentos_aprobadores
      ADD CONSTRAINT tramites_pago_documentos_aprobadores_aprobador_check
      CHECK (num_nonnulls(usuario_aprobador_id, rol_aprobador_id) = 1);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_tramites_pago_doc_aprobadores_tramite
  ON tramites_pago_documentos_aprobadores(tramite_id);

CREATE INDEX IF NOT EXISTS idx_tramites_pago_doc_aprobadores_factura
  ON tramites_pago_documentos_aprobadores(factura_id);

CREATE INDEX IF NOT EXISTS idx_tramites_pago_doc_aprobadores_usuario
  ON tramites_pago_documentos_aprobadores(usuario_aprobador_id);

CREATE INDEX IF NOT EXISTS idx_tramites_pago_doc_aprobadores_rol
  ON tramites_pago_documentos_aprobadores(rol_aprobador_id);

CREATE INDEX IF NOT EXISTS idx_tramites_pago_doc_aprobadores_decision_usuario
  ON tramites_pago_documentos_aprobadores(decision_usuario_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_tramites_pago_doc_aprobadores_rol_unique
  ON tramites_pago_documentos_aprobadores(tramite_id, factura_id, rol_aprobador_id)
  WHERE usuario_aprobador_id IS NULL AND rol_aprobador_id IS NOT NULL;

INSERT INTO tramites_pago_documentos_aprobadores (
  tramite_id,
  factura_id,
  usuario_aprobador_id,
  usuario_aprobador_nombre,
  usuario_aprobador_email,
  rol_aprobador_id,
  rol_aprobador_codigo,
  rol_aprobador_nombre
)
SELECT DISTINCT
  td.tramite_id,
  td.factura_id,
  NULLIF(linea->>'usuario_aprobador_id', '')::INTEGER AS usuario_aprobador_id,
  NULLIF(BTRIM(COALESCE(linea->>'usuario_aprobador_nombre', '')), '') AS usuario_aprobador_nombre,
  NULLIF(BTRIM(COALESCE(linea->>'usuario_aprobador_email', '')), '') AS usuario_aprobador_email,
  NULL::INTEGER AS rol_aprobador_id,
  NULL::VARCHAR(100) AS rol_aprobador_codigo,
  NULL::VARCHAR(150) AS rol_aprobador_nombre
FROM tramites_pago_documentos td
JOIN facturas_contabilizacion fc ON fc.factura_id = td.factura_id
CROSS JOIN LATERAL jsonb_array_elements(COALESCE(fc.metadata->'centros_costo_lineas', '[]'::jsonb)) AS linea
WHERE NULLIF(linea->>'usuario_aprobador_id', '') ~ '^[0-9]+$'
ON CONFLICT (tramite_id, factura_id, usuario_aprobador_id) DO NOTHING;

INSERT INTO tramites_pago_documentos_aprobadores (
  tramite_id,
  factura_id,
  usuario_aprobador_id,
  usuario_aprobador_nombre,
  usuario_aprobador_email,
  rol_aprobador_id,
  rol_aprobador_codigo,
  rol_aprobador_nombre
)
SELECT DISTINCT
  td.tramite_id,
  td.factura_id,
  NULL::INTEGER AS usuario_aprobador_id,
  NULL::VARCHAR(150) AS usuario_aprobador_nombre,
  NULL::VARCHAR(255) AS usuario_aprobador_email,
  NULLIF(linea->>'rol_aprobador_id', '')::INTEGER AS rol_aprobador_id,
  NULLIF(BTRIM(COALESCE(linea->>'rol_aprobador_codigo', '')), '') AS rol_aprobador_codigo,
  NULLIF(BTRIM(COALESCE(linea->>'rol_aprobador_nombre', '')), '') AS rol_aprobador_nombre
FROM tramites_pago_documentos td
JOIN facturas_contabilizacion fc ON fc.factura_id = td.factura_id
CROSS JOIN LATERAL jsonb_array_elements(COALESCE(fc.metadata->'centros_costo_lineas', '[]'::jsonb)) AS linea
WHERE NULLIF(linea->>'rol_aprobador_id', '') ~ '^[0-9]+$'
  AND NOT EXISTS (
    SELECT 1
    FROM tramites_pago_documentos_aprobadores tda
    WHERE tda.tramite_id = td.tramite_id
      AND tda.factura_id = td.factura_id
      AND tda.usuario_aprobador_id IS NULL
      AND tda.rol_aprobador_id = NULLIF(linea->>'rol_aprobador_id', '')::INTEGER
  );
