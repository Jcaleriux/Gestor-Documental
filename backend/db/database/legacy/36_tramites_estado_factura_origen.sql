ALTER TABLE tramites_pago_documentos
  ADD COLUMN IF NOT EXISTS estado_factura_origen VARCHAR(30);

UPDATE tramites_pago_documentos td
SET estado_factura_origen = CASE
  WHEN f.estado IN ('contabilizado', 'pagado_parcialmente') THEN f.estado
  WHEN EXISTS (
    SELECT 1
    FROM facturas_pagos fp
    WHERE fp.factura_id = td.factura_id
  ) THEN 'pagado_parcialmente'
  ELSE 'contabilizado'
END
FROM facturas f
WHERE f.id = td.factura_id
  AND (td.estado_factura_origen IS NULL OR BTRIM(td.estado_factura_origen) = '');
