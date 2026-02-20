-- Tabla de contabilizacion de facturas
CREATE TABLE IF NOT EXISTS facturas_contabilizacion (
  id SERIAL PRIMARY KEY,
  factura_id INTEGER NOT NULL UNIQUE
    REFERENCES facturas(id) ON DELETE CASCADE,
  fecha_documento DATE,
  fecha_vencimiento DATE,
  fecha_contabilizacion DATE DEFAULT CURRENT_DATE,
  plazo_credito INTEGER,
  retencion NUMERIC(18,4),
  descuento NUMERIC(18,4),
  anticipo_aplicado NUMERIC(18,4),
  centro_costo VARCHAR(100),
  cuenta_contable VARCHAR(100),
  proyecto VARCHAR(150),
  orden_compra VARCHAR(100),
  numero_proveedor VARCHAR(50),
  notas TEXT,
  metadata JSONB,
  creado_por VARCHAR(100),
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_facturas_contabilizacion_factura
  ON facturas_contabilizacion(factura_id);
