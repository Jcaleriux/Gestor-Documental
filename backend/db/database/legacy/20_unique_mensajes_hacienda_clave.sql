DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'mensajes_hacienda'
  ) THEN
    IF EXISTS (
      SELECT 1
      FROM mensajes_hacienda
      GROUP BY clave
      HAVING COUNT(*) > 1
    ) THEN
      RAISE EXCEPTION 'No se puede crear UNIQUE en mensajes_hacienda.clave: existen duplicados';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'mensajes_hacienda_clave_key'
        AND conrelid = 'mensajes_hacienda'::regclass
    ) THEN
      ALTER TABLE mensajes_hacienda
        ADD CONSTRAINT mensajes_hacienda_clave_key UNIQUE (clave);
    END IF;
  END IF;
END $$;
