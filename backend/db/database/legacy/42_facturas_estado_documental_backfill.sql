WITH ultimo_estado_documental AS (
  SELECT DISTINCT ON (ed.factura_id)
    ed.factura_id,
    ed.estado_nuevo
  FROM estados_documento ed
  WHERE ed.dominio = 'contabilizacion'
  ORDER BY ed.factura_id, ed.creado_en DESC, ed.id DESC
)
UPDATE facturas f
SET estado = COALESCE(
  ued.estado_nuevo,
  CASE
    WHEN fc.factura_id IS NOT NULL THEN 'contabilizado'
    ELSE 'no_contabilizado'
  END
)
FROM facturas_workflow_pago_estado fwp
LEFT JOIN ultimo_estado_documental ued
  ON ued.factura_id = fwp.factura_id
LEFT JOIN facturas_contabilizacion fc
  ON fc.factura_id = fwp.factura_id
WHERE f.id = fwp.factura_id
  AND f.estado IN ('en_tramite_pago', 'pagado_parcialmente', 'pagado');
