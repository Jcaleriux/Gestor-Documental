-- Agregar ruta_xml si no existe (compatibilidad con bases antiguas)
ALTER TABLE facturas ADD COLUMN IF NOT EXISTS ruta_xml VARCHAR(255);
ALTER TABLE notas_credito ADD COLUMN IF NOT EXISTS ruta_xml VARCHAR(255);
ALTER TABLE mensajes_hacienda ADD COLUMN IF NOT EXISTS ruta_xml VARCHAR(255);

-- Asegurar ruta_pdf si no existe
ALTER TABLE facturas ADD COLUMN IF NOT EXISTS ruta_pdf VARCHAR(255);
ALTER TABLE notas_credito ADD COLUMN IF NOT EXISTS ruta_pdf VARCHAR(255);

-- Migrar datos desde ruta_archivo cuando exista
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'facturas' AND column_name = 'ruta_archivo'
  ) THEN
    UPDATE facturas
    SET ruta_xml = ruta_archivo
    WHERE ruta_xml IS NULL AND ruta_archivo IS NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'notas_credito' AND column_name = 'ruta_archivo'
  ) THEN
    UPDATE notas_credito
    SET ruta_xml = ruta_archivo
    WHERE ruta_xml IS NULL AND ruta_archivo IS NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'mensajes_hacienda' AND column_name = 'ruta_archivo'
  ) THEN
    UPDATE mensajes_hacienda
    SET ruta_xml = ruta_archivo
    WHERE ruta_xml IS NULL AND ruta_archivo IS NOT NULL;
  END IF;
END $$;
