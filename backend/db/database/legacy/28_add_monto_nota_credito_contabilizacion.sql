-- Agrega monto manual de nota de credito en contabilizacion.
ALTER TABLE IF EXISTS facturas_contabilizacion
  ADD COLUMN IF NOT EXISTS monto_nota_credito NUMERIC(18,4);
