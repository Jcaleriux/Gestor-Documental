ALTER TABLE tramites_pago_documentos
  DROP CONSTRAINT IF EXISTS tramites_pago_documentos_estado_tesoreria_check;

ALTER TABLE tramites_pago_documentos
  ADD CONSTRAINT tramites_pago_documentos_estado_tesoreria_check CHECK (
    estado_tesoreria IN ('pendiente', 'excluido', 'devuelto_contabilidad', 'reenviado', 'reincluido', 'pagado')
  );

ALTER TABLE tramites_pago_retenciones
  DROP CONSTRAINT IF EXISTS tramites_pago_retenciones_estado_tesoreria_check;

ALTER TABLE tramites_pago_retenciones
  ADD CONSTRAINT tramites_pago_retenciones_estado_tesoreria_check CHECK (
    estado_tesoreria IN ('pendiente', 'excluido', 'devuelto_contabilidad', 'reenviado', 'reincluido', 'pagado')
  );
