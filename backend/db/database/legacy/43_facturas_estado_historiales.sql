CREATE TABLE IF NOT EXISTS facturas_estado_documental_historial (
  id SERIAL PRIMARY KEY,
  factura_id INTEGER NOT NULL REFERENCES facturas(id) ON DELETE CASCADE,
  estado_anterior VARCHAR(50),
  estado_nuevo VARCHAR(50) NOT NULL,
  usuario VARCHAR(100) NOT NULL,
  motivo TEXT,
  creado_en TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_facturas_estado_documental_historial_factura_id
  ON facturas_estado_documental_historial(factura_id);

CREATE INDEX IF NOT EXISTS idx_facturas_estado_documental_historial_creado_en
  ON facturas_estado_documental_historial(creado_en);

CREATE TABLE IF NOT EXISTS facturas_workflow_pago_historial (
  id SERIAL PRIMARY KEY,
  factura_id INTEGER NOT NULL REFERENCES facturas(id) ON DELETE CASCADE,
  estado_anterior VARCHAR(50),
  estado_nuevo VARCHAR(50) NOT NULL,
  usuario VARCHAR(100) NOT NULL,
  motivo TEXT,
  creado_en TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_facturas_workflow_pago_historial_factura_id
  ON facturas_workflow_pago_historial(factura_id);

CREATE INDEX IF NOT EXISTS idx_facturas_workflow_pago_historial_creado_en
  ON facturas_workflow_pago_historial(creado_en);

DO $$
BEGIN
  IF to_regclass('public.estados_documento') IS NOT NULL THEN
    INSERT INTO facturas_estado_documental_historial (
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
    WHERE ed.dominio = 'contabilizacion'
      AND NOT EXISTS (
        SELECT 1
        FROM facturas_estado_documental_historial fedh
        WHERE fedh.factura_id = ed.factura_id
          AND COALESCE(fedh.estado_anterior, '') = COALESCE(ed.estado_anterior, '')
          AND fedh.estado_nuevo = ed.estado_nuevo
          AND COALESCE(fedh.usuario, '') = COALESCE(ed.usuario, '')
          AND COALESCE(fedh.motivo, '') = COALESCE(ed.motivo, '')
          AND fedh.creado_en = ed.creado_en
      );
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.estados_documento') IS NOT NULL THEN
    INSERT INTO facturas_workflow_pago_historial (
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
    WHERE ed.dominio = 'workflow_pago'
      AND NOT EXISTS (
        SELECT 1
        FROM facturas_workflow_pago_historial fwh
        WHERE fwh.factura_id = ed.factura_id
          AND COALESCE(fwh.estado_anterior, '') = COALESCE(ed.estado_anterior, '')
          AND fwh.estado_nuevo = ed.estado_nuevo
          AND COALESCE(fwh.usuario, '') = COALESCE(ed.usuario, '')
          AND COALESCE(fwh.motivo, '') = COALESCE(ed.motivo, '')
          AND fwh.creado_en = ed.creado_en
      );
  END IF;
END $$;
