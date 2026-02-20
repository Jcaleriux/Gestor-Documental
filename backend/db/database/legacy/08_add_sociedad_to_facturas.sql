-- Agregar sociedad_id a facturas
ALTER TABLE facturas ADD COLUMN IF NOT EXISTS sociedad_id INTEGER;

-- Relacion con sociedades
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_facturas_sociedad'
      AND table_name = 'facturas'
  ) THEN
    ALTER TABLE facturas
      ADD CONSTRAINT fk_facturas_sociedad
      FOREIGN KEY (sociedad_id) REFERENCES sociedades(id);
  END IF;
END $$;

-- Indice para filtros por sociedad
CREATE INDEX IF NOT EXISTS idx_facturas_sociedad ON facturas(sociedad_id);

-- Backfill usando receptor del JSON de la factura
UPDATE facturas f
SET sociedad_id = s.id
FROM sociedades s
WHERE f.sociedad_id IS NULL
  AND regexp_replace(f.receptor->'Identificacion'->>'Numero', '\D', '', 'g')
      = regexp_replace(s.cedula_juridica, '\D', '', 'g');
