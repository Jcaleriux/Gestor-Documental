BEGIN;

ALTER TABLE IF EXISTS facturas_contabilizacion
  ADD COLUMN IF NOT EXISTS retencion_pagada NUMERIC(18,4) NOT NULL DEFAULT 0;

ALTER TABLE IF EXISTS facturas_contabilizacion
  ADD COLUMN IF NOT EXISTS estado_retencion VARCHAR(20) NOT NULL DEFAULT 'pagada';

ALTER TABLE IF EXISTS facturas_contabilizacion
  ADD COLUMN IF NOT EXISTS fecha_ultimo_pago_retencion DATE;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'facturas_contabilizacion_estado_retencion_check'
  ) THEN
    ALTER TABLE facturas_contabilizacion
      ADD CONSTRAINT facturas_contabilizacion_estado_retencion_check
      CHECK (estado_retencion IN ('pendiente', 'parcial', 'pagada'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'facturas_contabilizacion_retencion_pagada_check'
  ) THEN
    ALTER TABLE facturas_contabilizacion
      ADD CONSTRAINT facturas_contabilizacion_retencion_pagada_check
      CHECK (retencion_pagada >= 0);
  END IF;
END $$;

UPDATE facturas_contabilizacion
SET retencion_pagada = LEAST(
  GREATEST(COALESCE(retencion_pagada, 0), 0),
  GREATEST(COALESCE(retencion, 0), 0)
);

UPDATE facturas_contabilizacion
SET estado_retencion = CASE
  WHEN GREATEST(COALESCE(retencion, 0), 0) = 0 THEN 'pagada'
  WHEN COALESCE(retencion_pagada, 0) = 0 THEN 'pendiente'
  WHEN COALESCE(retencion_pagada, 0) >= GREATEST(COALESCE(retencion, 0), 0) THEN 'pagada'
  ELSE 'parcial'
END;

UPDATE facturas_contabilizacion
SET fecha_ultimo_pago_retencion = NULL
WHERE COALESCE(retencion_pagada, 0) = 0;

CREATE TABLE IF NOT EXISTS facturas_retenciones_pagos (
  id SERIAL PRIMARY KEY,
  factura_id INTEGER NOT NULL,
  contabilizacion_id INTEGER,
  monto NUMERIC(18,4) NOT NULL,
  fecha_pago DATE NOT NULL DEFAULT CURRENT_DATE,
  usuario VARCHAR(100),
  notas TEXT,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT facturas_retenciones_pagos_monto_check CHECK (monto > 0)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'facturas_retenciones_pagos_factura_id_fkey'
  ) THEN
    ALTER TABLE facturas_retenciones_pagos
      ADD CONSTRAINT facturas_retenciones_pagos_factura_id_fkey
      FOREIGN KEY (factura_id)
      REFERENCES facturas(id)
      ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'facturas_retenciones_pagos_contabilizacion_id_fkey'
  ) THEN
    ALTER TABLE facturas_retenciones_pagos
      ADD CONSTRAINT facturas_retenciones_pagos_contabilizacion_id_fkey
      FOREIGN KEY (contabilizacion_id)
      REFERENCES facturas_contabilizacion(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_facturas_contabilizacion_estado_retencion
  ON facturas_contabilizacion(estado_retencion);

CREATE INDEX IF NOT EXISTS idx_facturas_retenciones_pagos_factura
  ON facturas_retenciones_pagos(factura_id);

CREATE INDEX IF NOT EXISTS idx_facturas_retenciones_pagos_contabilizacion
  ON facturas_retenciones_pagos(contabilizacion_id);

CREATE INDEX IF NOT EXISTS idx_facturas_retenciones_pagos_fecha
  ON facturas_retenciones_pagos(fecha_pago);

COMMIT;
