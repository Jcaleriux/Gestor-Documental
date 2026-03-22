CREATE TABLE IF NOT EXISTS facturas_estado_mixto_historial (
  id SERIAL PRIMARY KEY,
  factura_id INTEGER NOT NULL REFERENCES facturas(id) ON DELETE CASCADE,
  estado_anterior VARCHAR(50),
  estado_nuevo VARCHAR(50) NOT NULL,
  usuario VARCHAR(100) NOT NULL,
  motivo TEXT,
  creado_en TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_facturas_estado_mixto_historial_factura_id
  ON facturas_estado_mixto_historial(factura_id);

CREATE INDEX IF NOT EXISTS idx_facturas_estado_mixto_historial_creado_en
  ON facturas_estado_mixto_historial(creado_en);

DO $$
BEGIN
  IF to_regclass('public.estados_documento') IS NOT NULL THEN
    INSERT INTO facturas_estado_mixto_historial (
      factura_id,
      estado_anterior,
      estado_nuevo,
      usuario,
      motivo,
      creado_en
    )
    SELECT
      ed.factura_id,
      ed.estado_anterior,
      ed.estado_nuevo,
      ed.usuario,
      ed.motivo,
      ed.creado_en
    FROM estados_documento ed
    WHERE ed.dominio = 'mixto'
      AND NOT EXISTS (
        SELECT 1
        FROM facturas_estado_mixto_historial fmh
        WHERE fmh.factura_id = ed.factura_id
          AND COALESCE(fmh.estado_anterior, '') = COALESCE(ed.estado_anterior, '')
          AND fmh.estado_nuevo = ed.estado_nuevo
          AND COALESCE(fmh.usuario, '') = COALESCE(ed.usuario, '')
          AND COALESCE(fmh.motivo, '') = COALESCE(ed.motivo, '')
          AND fmh.creado_en = ed.creado_en
      );
  END IF;
END $$;
