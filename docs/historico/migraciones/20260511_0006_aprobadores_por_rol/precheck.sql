-- Precheck para la migracion 20260511_0006_centros_costo_aprobadores_por_rol
-- Ejecutar antes de npm run db:migrate o npm run preprod:db:migrate

-- 1. Estado actual del tracking de la migracion.
SELECT version, name, source, executed_at
FROM public.schema_migrations
WHERE version = '20260511_0006';

-- 2. Totales base para tener referencia antes del cambio.
SELECT
  (SELECT COUNT(*) FROM public.centros_costo) AS total_centros_costo,
  (SELECT COUNT(*) FROM public.tramites_pago_documentos_aprobadores) AS total_snapshots_aprobadores,
  (SELECT COUNT(*) FROM public.tramites_pago_documentos) AS total_tramites_documentos,
  (SELECT COUNT(*) FROM public.facturas_contabilizacion) AS total_facturas_contabilizacion;

-- 3. Lineas de metadata que ya traen rol_aprobador_id y seran candidatas a backfill.
WITH role_lines AS (
  SELECT
    td.tramite_id,
    td.factura_id,
    NULLIF(linea->>'rol_aprobador_id', '')::integer AS rol_aprobador_id,
    NULLIF(BTRIM(COALESCE(linea->>'rol_aprobador_codigo', '')), '') AS rol_aprobador_codigo,
    NULLIF(BTRIM(COALESCE(linea->>'rol_aprobador_nombre', '')), '') AS rol_aprobador_nombre
  FROM public.tramites_pago_documentos td
  JOIN public.facturas_contabilizacion fc
    ON fc.factura_id = td.factura_id
  CROSS JOIN LATERAL jsonb_array_elements(COALESCE(fc.metadata->'centros_costo_lineas', '[]'::jsonb)) AS linea
  WHERE NULLIF(linea->>'rol_aprobador_id', '') ~ '^[0-9]+$'
)
SELECT
  COUNT(*) AS total_lineas_metadata_con_rol,
  COUNT(DISTINCT rol_aprobador_id) AS roles_distintos_en_metadata
FROM role_lines;

-- 4. Roles referenciados en metadata que no existen en catalogo.
-- Esperado: 0 filas.
WITH role_lines AS (
  SELECT DISTINCT
    td.tramite_id,
    td.factura_id,
    NULLIF(linea->>'rol_aprobador_id', '')::integer AS rol_aprobador_id,
    NULLIF(BTRIM(COALESCE(linea->>'rol_aprobador_codigo', '')), '') AS rol_aprobador_codigo,
    NULLIF(BTRIM(COALESCE(linea->>'rol_aprobador_nombre', '')), '') AS rol_aprobador_nombre
  FROM public.tramites_pago_documentos td
  JOIN public.facturas_contabilizacion fc
    ON fc.factura_id = td.factura_id
  CROSS JOIN LATERAL jsonb_array_elements(COALESCE(fc.metadata->'centros_costo_lineas', '[]'::jsonb)) AS linea
  WHERE NULLIF(linea->>'rol_aprobador_id', '') ~ '^[0-9]+$'
)
SELECT
  rl.tramite_id,
  rl.factura_id,
  rl.rol_aprobador_id,
  rl.rol_aprobador_codigo,
  rl.rol_aprobador_nombre
FROM role_lines rl
LEFT JOIN public.roles r
  ON r.id = rl.rol_aprobador_id
WHERE r.id IS NULL
ORDER BY rl.tramite_id ASC, rl.factura_id ASC, rl.rol_aprobador_id ASC;

-- 5. Vista resumida de los centros de costo existentes.
-- Esperado hoy: usuario_aprobador_id poblado; despues de la migracion podran coexistir usuario o rol.
SELECT
  COUNT(*) FILTER (WHERE usuario_aprobador_id IS NOT NULL) AS centros_con_usuario_aprobador,
  COUNT(*) AS total_centros
FROM public.centros_costo;

-- 6. Muestra de documentos que hoy ya tienen metadata con rol.
WITH role_lines AS (
  SELECT DISTINCT
    td.tramite_id,
    td.factura_id,
    NULLIF(linea->>'rol_aprobador_id', '')::integer AS rol_aprobador_id,
    NULLIF(BTRIM(COALESCE(linea->>'rol_aprobador_codigo', '')), '') AS rol_aprobador_codigo,
    NULLIF(BTRIM(COALESCE(linea->>'rol_aprobador_nombre', '')), '') AS rol_aprobador_nombre
  FROM public.tramites_pago_documentos td
  JOIN public.facturas_contabilizacion fc
    ON fc.factura_id = td.factura_id
  CROSS JOIN LATERAL jsonb_array_elements(COALESCE(fc.metadata->'centros_costo_lineas', '[]'::jsonb)) AS linea
  WHERE NULLIF(linea->>'rol_aprobador_id', '') ~ '^[0-9]+$'
)
SELECT *
FROM role_lines
ORDER BY tramite_id DESC, factura_id DESC, rol_aprobador_id ASC
LIMIT 20;
