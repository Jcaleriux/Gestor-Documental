DO $$
BEGIN
  -- Agregar columna mensaje (codigo 1/2/3)
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'mensajes_hacienda'
      AND column_name = 'mensaje'
  ) THEN
    ALTER TABLE mensajes_hacienda ADD COLUMN mensaje SMALLINT;
  END IF;

  -- Agregar columna factura_id
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'mensajes_hacienda'
      AND column_name = 'factura_id'
  ) THEN
    ALTER TABLE mensajes_hacienda ADD COLUMN factura_id INTEGER;
  END IF;

  -- FK factura_id -> facturas(id)
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_mensajes_factura'
      AND table_name = 'mensajes_hacienda'
  ) THEN
    ALTER TABLE mensajes_hacienda
      ADD CONSTRAINT fk_mensajes_factura
      FOREIGN KEY (factura_id) REFERENCES facturas(id)
      ON DELETE SET NULL;
  END IF;

  -- Index para factura_id
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'idx_mensajes_factura'
  ) THEN
    CREATE INDEX idx_mensajes_factura ON mensajes_hacienda(factura_id);
  END IF;

  -- Backfill mensaje desde xml_completo si existe
  UPDATE mensajes_hacienda
  SET mensaje = NULLIF(regexp_replace(xml_completo->>'Mensaje', '\\D', '', 'g'), '')::int
  WHERE mensaje IS NULL
    AND xml_completo ? 'Mensaje';

  -- Backfill factura_id desde facturas por clave
  UPDATE mensajes_hacienda m
  SET factura_id = f.id
  FROM facturas f
  WHERE m.factura_id IS NULL
    AND m.clave = f.clave;

  -- Eliminar columnas no usadas
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'mensajes_hacienda'
      AND column_name = 'ruta_archivo'
  ) THEN
    ALTER TABLE mensajes_hacienda DROP COLUMN ruta_archivo;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'mensajes_hacienda'
      AND column_name = 'ruta_pdf'
  ) THEN
    ALTER TABLE mensajes_hacienda DROP COLUMN ruta_pdf;
  END IF;
END $$;
