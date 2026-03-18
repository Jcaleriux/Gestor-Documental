const { TESORERIA_ESTADOS, DOCUMENTO_ESTADOS, TRAMITE_ESTADOS } = require('../domain/tramitesPago');

const tesoreriaActivaSql = (columnRef) =>
  `COALESCE(NULLIF(TRIM(LOWER(${columnRef})), ''), '${TESORERIA_ESTADOS.PENDIENTE}') NOT IN ('${TESORERIA_ESTADOS.EXCLUIDO}', '${TESORERIA_ESTADOS.DEVUELTO_CONTABILIDAD}')`;

const buildTesoreriaResetQuery = (destino) => {
  if (destino === TRAMITE_ESTADOS.EN_APROBACION_GERENCIA) {
    return `
      UPDATE tramites_pago_documentos
      SET estado_tesoreria = $1,
          motivo_tesoreria = $2,
          estado_gerencia = '${DOCUMENTO_ESTADOS.PENDIENTE}',
          motivo_gerencia = NULL,
          estado_gerencia_contable = '${DOCUMENTO_ESTADOS.PENDIENTE}',
          motivo_gerencia_contable = NULL,
          estado_financiero = '${DOCUMENTO_ESTADOS.PENDIENTE}',
          motivo_financiero = NULL,
          actualizado_en = CURRENT_TIMESTAMP
      WHERE tramite_id = $3 AND factura_id = $4
      RETURNING *
    `;
  }
  if (destino === TRAMITE_ESTADOS.EN_APROBACION_GERENCIA_CONTABLE) {
    return `
      UPDATE tramites_pago_documentos
      SET estado_tesoreria = $1,
          motivo_tesoreria = $2,
          estado_gerencia_contable = '${DOCUMENTO_ESTADOS.PENDIENTE}',
          motivo_gerencia_contable = NULL,
          estado_financiero = '${DOCUMENTO_ESTADOS.PENDIENTE}',
          motivo_financiero = NULL,
          actualizado_en = CURRENT_TIMESTAMP
      WHERE tramite_id = $3 AND factura_id = $4
      RETURNING *
    `;
  }
  return `
    UPDATE tramites_pago_documentos
    SET estado_tesoreria = $1,
        motivo_tesoreria = $2,
        estado_financiero = '${DOCUMENTO_ESTADOS.PENDIENTE}',
        motivo_financiero = NULL,
        actualizado_en = CURRENT_TIMESTAMP
    WHERE tramite_id = $3 AND factura_id = $4
    RETURNING *
  `;
};

module.exports = {
  tesoreriaActivaSql,
  buildTesoreriaResetQuery
};
