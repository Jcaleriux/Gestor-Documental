ALTER TABLE tramites_pago_documentos
  ADD COLUMN IF NOT EXISTS estado_tesoreria VARCHAR(20) NOT NULL DEFAULT 'pendiente';

ALTER TABLE tramites_pago_documentos
  ADD COLUMN IF NOT EXISTS motivo_tesoreria TEXT;
