ALTER TABLE estados_documento
  ADD COLUMN IF NOT EXISTS dominio VARCHAR(30);

UPDATE estados_documento
SET dominio = CASE
  WHEN COALESCE(NULLIF(BTRIM(LOWER(estado_anterior)), ''), NULL) IN ('en_tramite_pago', 'pagado_parcialmente', 'pagado')
    AND COALESCE(NULLIF(BTRIM(LOWER(estado_nuevo)), ''), NULL) IN ('no_contabilizado', 'en_revision', 'contabilizado', 'rechazado')
      THEN 'mixto'
  WHEN COALESCE(NULLIF(BTRIM(LOWER(estado_anterior)), ''), NULL) IN ('no_contabilizado', 'en_revision', 'contabilizado', 'rechazado')
    AND COALESCE(NULLIF(BTRIM(LOWER(estado_nuevo)), ''), NULL) IN ('en_tramite_pago', 'pagado_parcialmente', 'pagado')
      THEN 'mixto'
  WHEN COALESCE(NULLIF(BTRIM(LOWER(estado_anterior)), ''), NULL) IN ('en_tramite_pago', 'pagado_parcialmente', 'pagado')
    OR COALESCE(NULLIF(BTRIM(LOWER(estado_nuevo)), ''), NULL) IN ('en_tramite_pago', 'pagado_parcialmente', 'pagado')
      THEN 'workflow_pago'
  WHEN COALESCE(NULLIF(BTRIM(LOWER(estado_anterior)), ''), NULL) IN ('no_contabilizado', 'en_revision', 'contabilizado', 'rechazado')
    OR COALESCE(NULLIF(BTRIM(LOWER(estado_nuevo)), ''), NULL) IN ('no_contabilizado', 'en_revision', 'contabilizado', 'rechazado')
      THEN 'contabilizacion'
  ELSE 'mixto'
END
WHERE dominio IS NULL OR BTRIM(dominio) = '';

ALTER TABLE estados_documento
  ALTER COLUMN dominio SET DEFAULT 'mixto';

UPDATE estados_documento
SET dominio = 'mixto'
WHERE dominio IS NULL OR BTRIM(dominio) = '';

ALTER TABLE estados_documento
  ALTER COLUMN dominio SET NOT NULL;

ALTER TABLE estados_documento
  DROP CONSTRAINT IF EXISTS estados_documento_dominio_check;

ALTER TABLE estados_documento
  ADD CONSTRAINT estados_documento_dominio_check CHECK (
    dominio IN ('contabilizacion', 'workflow_pago', 'mixto')
  );

CREATE INDEX IF NOT EXISTS idx_estados_documento_dominio
  ON estados_documento(dominio);
