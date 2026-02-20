BEGIN;

CREATE TABLE IF NOT EXISTS tramites_pago_retenciones (
  id SERIAL PRIMARY KEY,
  tramite_id INTEGER NOT NULL,
  factura_id INTEGER NOT NULL,
  proveedor_id INTEGER,
  monto_retencion NUMERIC(18,4) NOT NULL,
  estado_tesoreria VARCHAR(20) NOT NULL DEFAULT 'pendiente',
  motivo_tesoreria TEXT,
  actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT tramites_pago_retenciones_tramite_id_factura_id_key UNIQUE (tramite_id, factura_id),
  CONSTRAINT tramites_pago_retenciones_monto_check CHECK (monto_retencion > 0),
  CONSTRAINT tramites_pago_retenciones_estado_tesoreria_check CHECK (
    estado_tesoreria IN ('pendiente', 'excluido', 'reenviado', 'reincluido')
  )
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'tramites_pago_retenciones_factura_id_fkey'
  ) THEN
    ALTER TABLE tramites_pago_retenciones
      ADD CONSTRAINT tramites_pago_retenciones_factura_id_fkey
      FOREIGN KEY (factura_id)
      REFERENCES facturas(id)
      ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'tramites_pago_retenciones_tramite_id_fkey'
  ) THEN
    ALTER TABLE tramites_pago_retenciones
      ADD CONSTRAINT tramites_pago_retenciones_tramite_id_fkey
      FOREIGN KEY (tramite_id)
      REFERENCES tramites_pago(id)
      ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'tramites_pago_retenciones_proveedor_id_fkey'
  ) THEN
    ALTER TABLE tramites_pago_retenciones
      ADD CONSTRAINT tramites_pago_retenciones_proveedor_id_fkey
      FOREIGN KEY (proveedor_id)
      REFERENCES proveedores(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_tramites_pago_retenciones_factura
  ON tramites_pago_retenciones(factura_id);

CREATE INDEX IF NOT EXISTS idx_tramites_pago_retenciones_tramite
  ON tramites_pago_retenciones(tramite_id);

CREATE INDEX IF NOT EXISTS idx_tramites_pago_retenciones_proveedor
  ON tramites_pago_retenciones(proveedor_id);

COMMIT;
