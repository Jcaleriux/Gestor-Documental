DO $$
BEGIN
  -- facturas
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'facturas'
      AND column_name = 'sociedad_id'
  ) THEN
    IF EXISTS (SELECT 1 FROM facturas WHERE sociedad_id IS NULL) THEN
      RAISE EXCEPTION 'No se puede aplicar NOT NULL: facturas.sociedad_id tiene valores NULL';
    END IF;
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'facturas'
        AND column_name = 'sociedad_id'
        AND is_nullable = 'YES'
    ) THEN
      ALTER TABLE facturas ALTER COLUMN sociedad_id SET NOT NULL;
    END IF;
  END IF;

  -- notas_credito
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'notas_credito'
      AND column_name = 'sociedad_id'
  ) THEN
    IF EXISTS (SELECT 1 FROM notas_credito WHERE sociedad_id IS NULL) THEN
      RAISE EXCEPTION 'No se puede aplicar NOT NULL: notas_credito.sociedad_id tiene valores NULL';
    END IF;
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'notas_credito'
        AND column_name = 'sociedad_id'
        AND is_nullable = 'YES'
    ) THEN
      ALTER TABLE notas_credito ALTER COLUMN sociedad_id SET NOT NULL;
    END IF;
  END IF;

  -- mensajes_hacienda
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'mensajes_hacienda'
      AND column_name = 'sociedad_id'
  ) THEN
    IF EXISTS (SELECT 1 FROM mensajes_hacienda WHERE sociedad_id IS NULL) THEN
      RAISE EXCEPTION 'No se puede aplicar NOT NULL: mensajes_hacienda.sociedad_id tiene valores NULL';
    END IF;
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'mensajes_hacienda'
        AND column_name = 'sociedad_id'
        AND is_nullable = 'YES'
    ) THEN
      ALTER TABLE mensajes_hacienda ALTER COLUMN sociedad_id SET NOT NULL;
    END IF;
  END IF;

  -- tiquetes_electronicos
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'tiquetes_electronicos'
      AND column_name = 'sociedad_id'
  ) THEN
    IF EXISTS (SELECT 1 FROM tiquetes_electronicos WHERE sociedad_id IS NULL) THEN
      RAISE EXCEPTION 'No se puede aplicar NOT NULL: tiquetes_electronicos.sociedad_id tiene valores NULL';
    END IF;
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'tiquetes_electronicos'
        AND column_name = 'sociedad_id'
        AND is_nullable = 'YES'
    ) THEN
      ALTER TABLE tiquetes_electronicos ALTER COLUMN sociedad_id SET NOT NULL;
    END IF;
  END IF;
END $$;
