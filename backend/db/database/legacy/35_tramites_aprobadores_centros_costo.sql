CREATE TABLE IF NOT EXISTS tramites_pago_documentos_aprobadores (
  id SERIAL PRIMARY KEY,
  tramite_id INTEGER NOT NULL,
  factura_id INTEGER NOT NULL,
  usuario_aprobador_id INTEGER NOT NULL,
  usuario_aprobador_nombre VARCHAR(150),
  usuario_aprobador_email VARCHAR(255),
  estado_gerencia VARCHAR(20) NOT NULL DEFAULT 'pendiente',
  motivo_gerencia TEXT,
  decision_en TIMESTAMP,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT tramites_pago_documentos_aprobadores_unique
    UNIQUE (tramite_id, factura_id, usuario_aprobador_id),
  CONSTRAINT tramites_pago_documentos_aprobadores_estado_gerencia_check
    CHECK (estado_gerencia IN ('pendiente', 'aprobado', 'rechazado'))
);

DO $$
BEGIN
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
END $$;

CREATE INDEX IF NOT EXISTS idx_tramites_pago_doc_aprobadores_tramite
  ON tramites_pago_documentos_aprobadores(tramite_id);

CREATE INDEX IF NOT EXISTS idx_tramites_pago_doc_aprobadores_factura
  ON tramites_pago_documentos_aprobadores(factura_id);

CREATE INDEX IF NOT EXISTS idx_tramites_pago_doc_aprobadores_usuario
  ON tramites_pago_documentos_aprobadores(usuario_aprobador_id);

INSERT INTO tramites_pago_documentos_aprobadores (
  tramite_id,
  factura_id,
  usuario_aprobador_id,
  usuario_aprobador_nombre,
  usuario_aprobador_email
)
SELECT DISTINCT
  td.tramite_id,
  td.factura_id,
  NULLIF(linea->>'usuario_aprobador_id', '')::INTEGER AS usuario_aprobador_id,
  NULLIF(BTRIM(COALESCE(linea->>'usuario_aprobador_nombre', '')), '') AS usuario_aprobador_nombre,
  NULLIF(BTRIM(COALESCE(linea->>'usuario_aprobador_email', '')), '') AS usuario_aprobador_email
FROM tramites_pago_documentos td
JOIN facturas_contabilizacion fc ON fc.factura_id = td.factura_id
CROSS JOIN LATERAL jsonb_array_elements(COALESCE(fc.metadata->'centros_costo_lineas', '[]'::jsonb)) AS linea
WHERE NULLIF(linea->>'usuario_aprobador_id', '') ~ '^[0-9]+$'
ON CONFLICT (tramite_id, factura_id, usuario_aprobador_id) DO NOTHING;
