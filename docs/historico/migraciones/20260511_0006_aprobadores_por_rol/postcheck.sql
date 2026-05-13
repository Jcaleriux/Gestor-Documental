-- Postcheck para la migracion 20260511_0006_centros_costo_aprobadores_por_rol
-- Ejecutar despues de npm run db:migrate o npm run preprod:db:migrate

-- 1. Confirmar que la migracion quedo registrada.
SELECT version, name, source, executed_at
FROM public.schema_migrations
WHERE version = '20260511_0006';

-- 2. Confirmar que las columnas nuevas existen.
SELECT table_name, column_name, is_nullable, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (
    (table_name = 'centros_costo' AND column_name IN (
      'usuario_aprobador_id',
      'rol_aprobador_id'
    ))
    OR
    (table_name = 'tramites_pago_documentos_aprobadores' AND column_name IN (
      'usuario_aprobador_id',
      'rol_aprobador_id',
      'rol_aprobador_codigo',
      'rol_aprobador_nombre',
      'decision_usuario_id',
      'decision_usuario_nombre',
      'decision_usuario_email'
    ))
  )
ORDER BY table_name, column_name;

-- 3. Confirmar constraints nuevas o relevantes.
SELECT conrelid::regclass AS tabla, conname
FROM pg_constraint
WHERE conname IN (
  'centros_costo_aprobador_check',
  'centros_costo_rol_aprobador_id_fkey',
  'tramites_pago_documentos_aprobadores_aprobador_check',
  'tramites_pago_documentos_aprobadores_rol_aprobador_id_fkey',
  'tramites_pago_documentos_aprobadores_decision_usuario_id_fkey'
)
ORDER BY conname;

-- 4. Confirmar indices nuevos o relevantes.
SELECT schemaname, tablename, indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname IN (
    'idx_centros_costo_aprobador_rol',
    'idx_tramites_pago_doc_aprobadores_rol',
    'idx_tramites_pago_doc_aprobadores_decision_usuario',
    'idx_tramites_pago_doc_aprobadores_rol_unique'
  )
ORDER BY indexname;

-- 5. No deben existir filas invalidas con cero o dos aprobadores.
SELECT
  (SELECT COUNT(*) FROM public.centros_costo WHERE num_nonnulls(usuario_aprobador_id, rol_aprobador_id) <> 1) AS centros_invalidos,
  (
    SELECT COUNT(*)
    FROM public.tramites_pago_documentos_aprobadores
    WHERE num_nonnulls(usuario_aprobador_id, rol_aprobador_id) <> 1
  ) AS snapshots_invalidos;

-- 6. No deben existir duplicados por rol dentro del mismo tramite/factura.
-- Esperado: 0 filas.
SELECT
  tramite_id,
  factura_id,
  rol_aprobador_id,
  COUNT(*) AS total
FROM public.tramites_pago_documentos_aprobadores
WHERE usuario_aprobador_id IS NULL
  AND rol_aprobador_id IS NOT NULL
GROUP BY tramite_id, factura_id, rol_aprobador_id
HAVING COUNT(*) > 1
ORDER BY tramite_id ASC, factura_id ASC, rol_aprobador_id ASC;

-- 7. Confirmar que no quedaron snapshots por rol faltantes respecto a metadata.
-- Esperado: 0 faltantes.
WITH role_snapshot_source AS (
  SELECT DISTINCT
    td.tramite_id,
    td.factura_id,
    NULLIF(linea->>'rol_aprobador_id', '')::integer AS rol_aprobador_id
  FROM public.tramites_pago_documentos td
  JOIN public.facturas_contabilizacion fc
    ON fc.factura_id = td.factura_id
  CROSS JOIN LATERAL jsonb_array_elements(COALESCE(fc.metadata->'centros_costo_lineas', '[]'::jsonb)) AS linea
  WHERE NULLIF(linea->>'rol_aprobador_id', '') ~ '^[0-9]+$'
)
SELECT COUNT(*) AS total_snapshots_por_rol_faltantes
FROM role_snapshot_source source
LEFT JOIN public.tramites_pago_documentos_aprobadores tda
  ON tda.tramite_id = source.tramite_id
 AND tda.factura_id = source.factura_id
 AND tda.usuario_aprobador_id IS NULL
 AND tda.rol_aprobador_id = source.rol_aprobador_id
WHERE tda.id IS NULL;

-- 8. Resumen final de mezcla usuario/rol en centros de costo y snapshots.
SELECT
  COUNT(*) FILTER (WHERE usuario_aprobador_id IS NOT NULL AND rol_aprobador_id IS NULL) AS centros_con_usuario,
  COUNT(*) FILTER (WHERE usuario_aprobador_id IS NULL AND rol_aprobador_id IS NOT NULL) AS centros_con_rol,
  COUNT(*) AS total_centros
FROM public.centros_costo;

SELECT
  COUNT(*) FILTER (WHERE usuario_aprobador_id IS NOT NULL AND rol_aprobador_id IS NULL) AS snapshots_con_usuario,
  COUNT(*) FILTER (WHERE usuario_aprobador_id IS NULL AND rol_aprobador_id IS NOT NULL) AS snapshots_con_rol,
  COUNT(*) AS total_snapshots
FROM public.tramites_pago_documentos_aprobadores;

-- 9. Muestra de snapshots por rol ya materializados.
SELECT
  tda.tramite_id,
  tda.factura_id,
  tda.rol_aprobador_id,
  tda.rol_aprobador_codigo,
  tda.rol_aprobador_nombre,
  tda.estado_gerencia,
  tda.decision_usuario_id,
  tda.decision_usuario_nombre,
  tda.decision_usuario_email,
  tda.decision_en
FROM public.tramites_pago_documentos_aprobadores tda
WHERE tda.rol_aprobador_id IS NOT NULL
ORDER BY tda.tramite_id DESC, tda.factura_id DESC, tda.rol_aprobador_id ASC
LIMIT 20;
