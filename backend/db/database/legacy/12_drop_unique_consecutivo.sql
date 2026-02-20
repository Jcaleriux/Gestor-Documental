-- Quitar restriccion UNIQUE sobre facturas.consecutivo (si existe)
DO $$
DECLARE
  cname text;
BEGIN
  SELECT c.conname INTO cname
  FROM pg_constraint c
  JOIN pg_class t ON c.conrelid = t.oid
  JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY (c.conkey)
  WHERE t.relname = 'facturas'
    AND c.contype = 'u'
    AND a.attname = 'consecutivo'
  LIMIT 1;

  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE facturas DROP CONSTRAINT %I', cname);
  END IF;
END $$;
