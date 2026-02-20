-- Eliminar referencias a receptores y la tabla receptores
DO $$
DECLARE
  r record;
BEGIN
  IF to_regclass('public.receptores') IS NOT NULL THEN
    -- Eliminar cualquier FK que apunte a receptores (sin asumir nombre de columna)
    FOR r IN
      SELECT conrelid::regclass AS tabla, conname
      FROM pg_constraint
      WHERE contype = 'f'
        AND confrelid = 'receptores'::regclass
    LOOP
      EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', r.tabla, r.conname);
    END LOOP;
  END IF;
END $$;

-- Drop columns receptor_id if exist
ALTER TABLE facturas DROP COLUMN IF EXISTS receptor_id;
ALTER TABLE notas_credito DROP COLUMN IF EXISTS receptor_id;
ALTER TABLE mensajes_hacienda DROP COLUMN IF EXISTS receptor_id;

-- Drop indexes tied to receptores
DROP INDEX IF EXISTS idx_facturas_receptor;
DROP INDEX IF EXISTS idx_receptores_identificacion;

-- Drop table receptores
DROP TABLE IF EXISTS receptores;
