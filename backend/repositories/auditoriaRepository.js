const pool = require('../db');
const {
  createFacturaWorkflowPagoJoin,
  createFacturaEstadoOperativoExpression,
  isFacturaWorkflowPagoEstado
} = require('./sqlFacturaEstado');
const { resolveFacturaEstadoTransitionDomain } = require('../domain/facturas');
const { createFacturaEstadoHistorial } = require('./facturaEstadoHistorialStore');

const facturaWorkflowPagoJoin = createFacturaWorkflowPagoJoin({ facturaAlias: 'f', workflowAlias: 'fwp' });
const facturaEstadoOperativoExpression = createFacturaEstadoOperativoExpression({
  facturaAlias: 'f',
  workflowAlias: 'fwp'
});

const monedaFacturaExpression = `
  upper(
    COALESCE(
      f.resumen #>> '{CodigoTipoMoneda,CodigoMoneda}',
      f.resumen #>> '{codigoTipoMoneda,codigoMoneda}',
      f.resumen ->> 'CodigoMoneda',
      f.resumen ->> 'codigoMoneda',
      'CRC'
    )
  )
`;

const listAuditoriaByFacturaId = async (facturaId) => {
  const { rows } = await pool.query(
    `SELECT
      a.id, a.accion, a.usuario, a.detalles, a.ip_address, a.creado_en
     FROM auditoria a
     WHERE a.factura_id = $1
     ORDER BY a.creado_en DESC`,
    [facturaId]
  );

  return rows;
};

const createAuditoria = async ({ facturaId, accion, usuario, detalles, ip_address }) => {
  const { rows } = await pool.query(
    `INSERT INTO auditoria (factura_id, accion, usuario, detalles, ip_address)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [facturaId, accion, usuario, detalles, ip_address]
  );

  return rows[0] || null;
};

const listEstadosByFacturaId = async (facturaId) => {
  const { rows } = await pool.query(
    `
    WITH historial_estado AS (
      SELECT
        fedh.id,
        fedh.factura_id,
        'contabilizacion'::varchar AS dominio,
        'facturas_estado_documental_historial'::text AS origen_historial,
        fedh.estado_anterior,
        fedh.estado_nuevo,
        fedh.usuario,
        fedh.motivo,
        fedh.creado_en
      FROM facturas_estado_documental_historial fedh
      WHERE fedh.factura_id = $1

      UNION ALL

      SELECT
        fwh.id,
        fwh.factura_id,
        'workflow_pago'::varchar AS dominio,
        'facturas_workflow_pago_historial'::text AS origen_historial,
        fwh.estado_anterior,
        fwh.estado_nuevo,
        fwh.usuario,
        fwh.motivo,
        fwh.creado_en
      FROM facturas_workflow_pago_historial fwh
      WHERE fwh.factura_id = $1

      UNION ALL

      SELECT
        fmh.id,
        fmh.factura_id,
        'mixto'::varchar AS dominio,
        'facturas_estado_mixto_historial'::text AS origen_historial,
        fmh.estado_anterior,
        fmh.estado_nuevo,
        fmh.usuario,
        fmh.motivo,
        fmh.creado_en
      FROM facturas_estado_mixto_historial fmh
      WHERE fmh.factura_id = $1
    )
    SELECT *
    FROM historial_estado
    ORDER BY creado_en DESC, id DESC
    `,
    [facturaId]
  );

  return rows;
};

const listTramiteHistorialByFacturaId = async (facturaId) => {
  const { rows } = await pool.query(
    `
    SELECT
      h.*,
      t.estado AS tramite_estado
    FROM tramites_pago_historial h
    LEFT JOIN tramites_pago t ON t.id = h.tramite_id
    WHERE h.factura_id = $1
    ORDER BY h.creado_en DESC, h.id DESC
    `,
    [facturaId]
  );

  return rows;
};

const listGerenciaAprobacionesByFacturaId = async (facturaId) => {
  const { rows } = await pool.query(
    `
    SELECT
      tda.*,
      t.estado AS tramite_estado
    FROM tramites_pago_documentos_aprobadores tda
    LEFT JOIN tramites_pago t ON t.id = tda.tramite_id
    WHERE tda.factura_id = $1
      AND tda.decision_en IS NOT NULL
    ORDER BY tda.decision_en DESC, tda.id DESC
    `,
    [facturaId]
  );

  return rows;
};

const listTramiteDocumentoLinksByFacturaId = async (facturaId) => {
  const { rows } = await pool.query(
    `
    SELECT
      td.id,
      td.tramite_id,
      td.factura_id,
      td.estado_factura_origen,
      td.estado_tesoreria,
      td.motivo_tesoreria,
      td.actualizado_en,
      t.estado AS tramite_estado,
      t.creado_en AS tramite_creado_en,
      t.creado_por AS tramite_creado_por
    FROM tramites_pago_documentos td
    JOIN tramites_pago t ON t.id = td.tramite_id
    WHERE td.factura_id = $1
    ORDER BY t.creado_en DESC, td.id DESC
    `,
    [facturaId]
  );

  return rows;
};

const listPagosFacturaByFacturaId = async (facturaId) => {
  const { rows } = await pool.query(
    `
    SELECT
      fp.*,
      ${monedaFacturaExpression} AS moneda
    FROM facturas_pagos fp
    JOIN facturas f ON f.id = fp.factura_id
    WHERE fp.factura_id = $1
    ORDER BY COALESCE(fp.fecha_pago, CURRENT_DATE) DESC, fp.id DESC
    `,
    [facturaId]
  );

  return rows;
};

const listRetencionPagosByFacturaId = async (facturaId) => {
  const { rows } = await pool.query(
    `
    SELECT
      rp.*,
      ${monedaFacturaExpression} AS moneda
    FROM facturas_retenciones_pagos rp
    JOIN facturas f ON f.id = rp.factura_id
    WHERE rp.factura_id = $1
    ORDER BY COALESCE(rp.fecha_pago, CURRENT_DATE) DESC, rp.id DESC
    `,
    [facturaId]
  );

  return rows;
};

const createEstado = async ({ facturaId, dominio, estado_anterior, estado_nuevo, usuario, motivo }) => {
  const dominioFinal = dominio || resolveFacturaEstadoTransitionDomain({
    estadoAnterior: estado_anterior,
    estadoNuevo: estado_nuevo
  });

  return createFacturaEstadoHistorial({
    facturaId,
    dominio: dominioFinal,
    estadoAnterior: estado_anterior || null,
    estadoNuevo: estado_nuevo,
    usuario,
    motivo: motivo || null
  });
};

const updateFacturaEstado = async ({ facturaId, estado }) => {
  const facturaExists = await pool.query(
    'SELECT 1 FROM facturas WHERE id = $1',
    [facturaId]
  );

  if (facturaExists.rowCount === 0) {
    return null;
  }

  if (isFacturaWorkflowPagoEstado(estado)) {
    await pool.query(
      `
      INSERT INTO facturas_workflow_pago_estado (factura_id, estado)
      VALUES ($1, $2)
      ON CONFLICT (factura_id)
      DO UPDATE SET
        estado = EXCLUDED.estado,
        actualizado_en = CURRENT_TIMESTAMP
      `,
      [facturaId, estado]
    );
  } else {
    await pool.query(
      `
      DELETE FROM facturas_workflow_pago_estado
      WHERE factura_id = $1
      `,
      [facturaId]
    );
    await pool.query(
      'UPDATE facturas SET estado = $1 WHERE id = $2',
      [estado, facturaId]
    );
  }

  const { rows } = await pool.query(
    `
    SELECT
      f.id,
      ${facturaEstadoOperativoExpression} AS estado,
      f.estado AS estado_documental,
      fwp.estado AS estado_workflow_pago
    FROM facturas f
    ${facturaWorkflowPagoJoin}
    WHERE f.id = $1
    `,
    [facturaId]
  );

  return rows[0] || null;
};

module.exports = {
  listAuditoriaByFacturaId,
  createAuditoria,
  listEstadosByFacturaId,
  listTramiteHistorialByFacturaId,
  listGerenciaAprobacionesByFacturaId,
  listTramiteDocumentoLinksByFacturaId,
  listPagosFacturaByFacturaId,
  listRetencionPagosByFacturaId,
  createEstado,
  updateFacturaEstado
};
