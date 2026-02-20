-- Agrega asociacion opcional de nota de credito a la contabilizacion.
ALTER TABLE IF EXISTS facturas_contabilizacion
  ADD COLUMN IF NOT EXISTS nota_credito_id INTEGER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'facturas_contabilizacion_nota_credito_id_fkey'
  ) THEN
    ALTER TABLE facturas_contabilizacion
      ADD CONSTRAINT facturas_contabilizacion_nota_credito_id_fkey
      FOREIGN KEY (nota_credito_id)
      REFERENCES notas_credito(id)
      ON UPDATE NO ACTION
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_facturas_contabilizacion_nota_credito
  ON facturas_contabilizacion(nota_credito_id);
