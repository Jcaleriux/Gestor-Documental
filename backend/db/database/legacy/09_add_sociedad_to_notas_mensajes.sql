-- Agregar sociedad_id a notas_credito
ALTER TABLE notas_credito ADD COLUMN IF NOT EXISTS sociedad_id INTEGER;

-- Agregar sociedad_id a mensajes_hacienda
ALTER TABLE mensajes_hacienda ADD COLUMN IF NOT EXISTS sociedad_id INTEGER;

-- FKs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_notas_sociedad'
      AND table_name = 'notas_credito'
  ) THEN
    ALTER TABLE notas_credito
      ADD CONSTRAINT fk_notas_sociedad
      FOREIGN KEY (sociedad_id) REFERENCES sociedades(id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_mensajes_sociedad'
      AND table_name = 'mensajes_hacienda'
  ) THEN
    ALTER TABLE mensajes_hacienda
      ADD CONSTRAINT fk_mensajes_sociedad
      FOREIGN KEY (sociedad_id) REFERENCES sociedades(id);
  END IF;
END $$;

-- Indices
CREATE INDEX IF NOT EXISTS idx_notas_sociedad ON notas_credito(sociedad_id);
CREATE INDEX IF NOT EXISTS idx_mensajes_sociedad ON mensajes_hacienda(sociedad_id);

-- Backfill usando xml_completo (JSON)
UPDATE notas_credito n
SET sociedad_id = s.id
FROM sociedades s
WHERE n.sociedad_id IS NULL
  AND regexp_replace(n.xml_completo->'Receptor'->'Identificacion'->>'Numero', '\D', '', 'g')
      = regexp_replace(s.cedula_juridica, '\D', '', 'g');

UPDATE mensajes_hacienda m
SET sociedad_id = s.id
FROM sociedades s
WHERE m.sociedad_id IS NULL
  AND regexp_replace(m.xml_completo->>'NumeroCedulaReceptor', '\D', '', 'g')
      = regexp_replace(s.cedula_juridica, '\D', '', 'g');
