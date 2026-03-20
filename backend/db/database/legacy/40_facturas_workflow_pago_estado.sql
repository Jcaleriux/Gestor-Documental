CREATE TABLE IF NOT EXISTS facturas_workflow_pago_estado (
  factura_id integer NOT NULL,
  estado VARCHAR(30) NOT NULL,
  actualizado_en timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT facturas_workflow_pago_estado_pkey PRIMARY KEY (factura_id),
  CONSTRAINT facturas_workflow_pago_estado_estado_check CHECK (
    estado IN ('en_tramite_pago', 'pagado_parcialmente', 'pagado')
  ),
  CONSTRAINT facturas_workflow_pago_estado_factura_id_fkey FOREIGN KEY (factura_id)
    REFERENCES facturas(id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_facturas_workflow_pago_estado_estado
  ON facturas_workflow_pago_estado(estado);

INSERT INTO facturas_workflow_pago_estado (factura_id, estado)
SELECT
  f.id,
  f.estado
FROM facturas f
WHERE f.estado IN ('en_tramite_pago', 'pagado_parcialmente', 'pagado')
ON CONFLICT (factura_id) DO UPDATE
SET
  estado = EXCLUDED.estado,
  actualizado_en = CURRENT_TIMESTAMP;
