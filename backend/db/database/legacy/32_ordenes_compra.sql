BEGIN;

CREATE TABLE IF NOT EXISTS ordenes_compra (
  id SERIAL PRIMARY KEY,
  sociedad_id INTEGER NOT NULL,
  proveedor_id INTEGER NOT NULL,
  nombre VARCHAR(255) NOT NULL,
  monto NUMERIC(18,4) NOT NULL,
  moneda VARCHAR(10) NOT NULL,
  estado VARCHAR(20) NOT NULL DEFAULT 'abierta',
  fecha DATE NOT NULL,
  ruta_pdf VARCHAR(255) NOT NULL,
  creado_por VARCHAR(100),
  metadata JSONB,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT ordenes_compra_estado_check CHECK (estado IN ('abierta', 'cerrada')),
  CONSTRAINT ordenes_compra_monto_check CHECK (monto > 0)
);

ALTER TABLE facturas_contabilizacion
  ADD COLUMN IF NOT EXISTS orden_compra_id INTEGER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ordenes_compra_sociedad_id_fkey'
  ) THEN
    ALTER TABLE ordenes_compra
      ADD CONSTRAINT ordenes_compra_sociedad_id_fkey
      FOREIGN KEY (sociedad_id)
      REFERENCES sociedades(id)
      ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'ordenes_compra_proveedor_id_fkey'
  ) THEN
    ALTER TABLE ordenes_compra
      ADD CONSTRAINT ordenes_compra_proveedor_id_fkey
      FOREIGN KEY (proveedor_id)
      REFERENCES proveedores(id)
      ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'facturas_contabilizacion_orden_compra_id_fkey'
  ) THEN
    ALTER TABLE facturas_contabilizacion
      ADD CONSTRAINT facturas_contabilizacion_orden_compra_id_fkey
      FOREIGN KEY (orden_compra_id)
      REFERENCES ordenes_compra(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_ordenes_compra_sociedad
  ON ordenes_compra(sociedad_id);

CREATE INDEX IF NOT EXISTS idx_ordenes_compra_proveedor
  ON ordenes_compra(proveedor_id);

CREATE INDEX IF NOT EXISTS idx_ordenes_compra_estado
  ON ordenes_compra(estado);

CREATE INDEX IF NOT EXISTS idx_ordenes_compra_fecha
  ON ordenes_compra(fecha);

CREATE INDEX IF NOT EXISTS idx_facturas_contabilizacion_orden_compra
  ON facturas_contabilizacion(orden_compra_id);

COMMIT;
