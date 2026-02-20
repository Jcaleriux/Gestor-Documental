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
      WHERE mensaje IS NOT NULL
        AND mensaje NOT IN (1,2,3)
    ) THEN
      RAISE EXCEPTION 'No se puede aplicar CHECK: mensajes_hacienda.mensaje tiene valores fuera de 1,2,3';
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'mensajes_hacienda_mensaje_check'
        AND conrelid = 'mensajes_hacienda'::regclass
    ) THEN
      ALTER TABLE mensajes_hacienda
        ADD CONSTRAINT mensajes_hacienda_mensaje_check CHECK (mensaje IN (1,2,3));
    END IF;
  END IF;
END $$;
