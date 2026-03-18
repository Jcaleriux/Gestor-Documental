UPDATE tramites_pago_documentos td
SET estado_tesoreria = 'pagado',
    actualizado_en = CURRENT_TIMESTAMP
FROM tramites_pago t
WHERE td.tramite_id = t.id
  AND t.estado = 'pagado'
  AND COALESCE(NULLIF(TRIM(LOWER(td.estado_tesoreria)), ''), 'pendiente') IN ('pendiente', 'reenviado', 'reincluido');

UPDATE tramites_pago_retenciones tr
SET estado_tesoreria = 'pagado',
    actualizado_en = CURRENT_TIMESTAMP
FROM tramites_pago t
WHERE tr.tramite_id = t.id
  AND t.estado = 'pagado'
  AND COALESCE(NULLIF(TRIM(LOWER(tr.estado_tesoreria)), ''), 'pendiente') IN ('pendiente', 'reenviado', 'reincluido');
