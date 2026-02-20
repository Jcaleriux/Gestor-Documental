BEGIN;

ALTER TABLE IF EXISTS proveedores
  ADD COLUMN IF NOT EXISTS sociedad_id INTEGER;

ALTER TABLE IF EXISTS proveedores
  DROP CONSTRAINT IF EXISTS proveedores_identificacion_numero_normalizado_key;

WITH docs_map AS (
  SELECT DISTINCT
    f.sociedad_id,
    upper(regexp_replace(coalesce(f.emisor->'Identificacion'->>'Numero', ''), '[^0-9A-Za-z]', '', 'g')) AS id_norm
  FROM facturas f
  UNION
  SELECT DISTINCT
    t.sociedad_id,
    upper(regexp_replace(coalesce(t.emisor->'Identificacion'->>'Numero', ''), '[^0-9A-Za-z]', '', 'g')) AS id_norm
  FROM tiquetes_electronicos t
  UNION
  SELECT DISTINCT
    n.sociedad_id,
    upper(regexp_replace(coalesce(n.xml_completo->'Emisor'->'Identificacion'->>'Numero', ''), '[^0-9A-Za-z]', '', 'g')) AS id_norm
  FROM notas_credito n
)
INSERT INTO proveedores (
  sociedad_id,
  identificacion_tipo,
  identificacion_numero,
  identificacion_numero_normalizado,
  nombre,
  nombre_comercial,
  correo_electronico,
  telefono_codigo_pais,
  telefono_numero
)
SELECT DISTINCT
  d.sociedad_id,
  p.identificacion_tipo,
  p.identificacion_numero,
  p.identificacion_numero_normalizado,
  p.nombre,
  p.nombre_comercial,
  p.correo_electronico,
  p.telefono_codigo_pais,
  p.telefono_numero
FROM proveedores p
JOIN docs_map d
  ON d.id_norm = p.identificacion_numero_normalizado
WHERE p.sociedad_id IS NULL
  AND d.sociedad_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM proveedores px
    WHERE px.sociedad_id = d.sociedad_id
      AND px.identificacion_numero_normalizado = p.identificacion_numero_normalizado
  );

WITH primera_sociedad AS (
  SELECT id
  FROM sociedades
  ORDER BY id ASC
  LIMIT 1
)
UPDATE proveedores p
SET sociedad_id = s.id
FROM primera_sociedad s
WHERE p.sociedad_id IS NULL;

DELETE FROM proveedores
WHERE sociedad_id IS NULL;

DELETE FROM proveedores p
USING proveedores d
WHERE p.id > d.id
  AND p.sociedad_id = d.sociedad_id
  AND p.identificacion_numero_normalizado = d.identificacion_numero_normalizado;

ALTER TABLE IF EXISTS proveedores
  ALTER COLUMN sociedad_id SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'proveedores_sociedad_id_fkey'
  ) THEN
    ALTER TABLE proveedores
      ADD CONSTRAINT proveedores_sociedad_id_fkey
      FOREIGN KEY (sociedad_id)
      REFERENCES sociedades(id)
      ON DELETE NO ACTION;
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_proveedores_sociedad
  ON proveedores(sociedad_id);

CREATE INDEX IF NOT EXISTS idx_proveedores_nombre
  ON proveedores(nombre);

CREATE UNIQUE INDEX IF NOT EXISTS idx_proveedores_sociedad_identificacion
  ON proveedores(sociedad_id, identificacion_numero_normalizado);

CREATE TABLE IF NOT EXISTS tablas_pago (
  id SERIAL PRIMARY KEY,
  sociedad_id INTEGER NOT NULL REFERENCES sociedades(id) ON DELETE CASCADE,
  proveedor_id INTEGER NOT NULL REFERENCES proveedores(id) ON DELETE CASCADE,
  nombre VARCHAR(255) NOT NULL,
  ruta_pdf VARCHAR(255) NOT NULL,
  creado_por VARCHAR(100),
  metadata JSONB,
  creado_en TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE IF EXISTS facturas_contabilizacion
  ADD COLUMN IF NOT EXISTS proveedor_id INTEGER;

ALTER TABLE IF EXISTS facturas_contabilizacion
  ADD COLUMN IF NOT EXISTS tabla_pago_id INTEGER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'facturas_contabilizacion_proveedor_id_fkey'
  ) THEN
    ALTER TABLE facturas_contabilizacion
      ADD CONSTRAINT facturas_contabilizacion_proveedor_id_fkey
      FOREIGN KEY (proveedor_id)
      REFERENCES proveedores(id)
      ON DELETE SET NULL;
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'facturas_contabilizacion_tabla_pago_id_fkey'
  ) THEN
    ALTER TABLE facturas_contabilizacion
      ADD CONSTRAINT facturas_contabilizacion_tabla_pago_id_fkey
      FOREIGN KEY (tabla_pago_id)
      REFERENCES tablas_pago(id)
      ON DELETE SET NULL;
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS idx_tablas_pago_sociedad
  ON tablas_pago(sociedad_id);

CREATE INDEX IF NOT EXISTS idx_tablas_pago_proveedor
  ON tablas_pago(proveedor_id);

CREATE INDEX IF NOT EXISTS idx_facturas_contabilizacion_proveedor
  ON facturas_contabilizacion(proveedor_id);

CREATE INDEX IF NOT EXISTS idx_facturas_contabilizacion_tabla_pago
  ON facturas_contabilizacion(tabla_pago_id);

UPDATE facturas_contabilizacion fc
SET proveedor_id = p.id
FROM facturas f
JOIN proveedores p
  ON p.sociedad_id = f.sociedad_id
WHERE fc.factura_id = f.id
  AND fc.proveedor_id IS NULL
  AND coalesce(fc.numero_proveedor, '') <> ''
  AND p.identificacion_numero_normalizado = upper(regexp_replace(fc.numero_proveedor, '[^0-9A-Za-z]', '', 'g'));

UPDATE facturas_contabilizacion fc
SET proveedor_id = p.id
FROM facturas f
JOIN proveedores p
  ON p.sociedad_id = f.sociedad_id
WHERE fc.factura_id = f.id
  AND fc.proveedor_id IS NULL
  AND coalesce(f.emisor->'Identificacion'->>'Numero', '') <> ''
  AND p.identificacion_numero_normalizado = upper(regexp_replace(f.emisor->'Identificacion'->>'Numero', '[^0-9A-Za-z]', '', 'g'));

COMMIT;
