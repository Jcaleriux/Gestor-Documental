BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'facturas_estado_check'
  ) THEN
    ALTER TABLE facturas DROP CONSTRAINT facturas_estado_check;
  END IF;
END $$;

ALTER TABLE facturas
  ADD CONSTRAINT facturas_estado_check CHECK (
    estado IN (
      'no_contabilizado',
      'en_revision',
      'en_tramite_pago',
      'contabilizado',
      'pagado_parcialmente',
      'rechazado',
      'pagado'
    )
  );

CREATE TABLE IF NOT EXISTS facturas_pagos (
  id SERIAL PRIMARY KEY,
  factura_id INTEGER NOT NULL,
  tramite_id INTEGER,
  monto NUMERIC(18,4) NOT NULL,
  fecha_pago DATE NOT NULL DEFAULT CURRENT_DATE,
  usuario VARCHAR(100),
  notas TEXT,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT facturas_pagos_monto_check CHECK (monto > 0)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'facturas_pagos_factura_id_fkey'
  ) THEN
    ALTER TABLE facturas_pagos
      ADD CONSTRAINT facturas_pagos_factura_id_fkey
      FOREIGN KEY (factura_id)
      REFERENCES facturas(id)
      ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'facturas_pagos_tramite_id_fkey'
  ) THEN
    ALTER TABLE facturas_pagos
      ADD CONSTRAINT facturas_pagos_tramite_id_fkey
      FOREIGN KEY (tramite_id)
      REFERENCES tramites_pago(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_facturas_pagos_factura
  ON facturas_pagos(factura_id);

CREATE INDEX IF NOT EXISTS idx_facturas_pagos_tramite
  ON facturas_pagos(tramite_id);

CREATE INDEX IF NOT EXISTS idx_facturas_pagos_fecha
  ON facturas_pagos(fecha_pago);

COMMIT;
