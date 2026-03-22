const pool = require('../db');
const { FACTURA_ESTADOS } = require('../domain/facturas');
const { TRAMITE_ESTADOS, DOCUMENTO_ESTADOS } = require('../domain/tramitesPago');
const { tesoreriaActivaSql } = require('../services/tramitesPagoQueries');
const {
  createFacturaWorkflowPagoJoin,
  createFacturaEstadoOperativoExpression
} = require('./sqlFacturaEstado');
const {
  createTotalPagoBaseExpression,
  createTotalPagoPrincipalExpression,
  createRetencionPendienteExpression,
  createTotalPendienteGlobalExpression
} = require('./sqlMontosFactura');

const totalPagoBaseExpression = createTotalPagoBaseExpression({ facturaAlias: 'f', contaAlias: 'fc' });
const totalAPagarExpression = createTotalPagoPrincipalExpression({ facturaAlias: 'f', contaAlias: 'fc' });
const retencionPendienteExpression = createRetencionPendienteExpression({ contaAlias: 'fc' });
const totalPendienteGlobalExpression = createTotalPendienteGlobalExpression({ facturaAlias: 'f', contaAlias: 'fc' });
const facturaWorkflowPagoJoin = createFacturaWorkflowPagoJoin({ facturaAlias: 'f', workflowAlias: 'fwp' });
const facturaEstadoOperativoExpression = createFacturaEstadoOperativoExpression({
  facturaAlias: 'f',
  workflowAlias: 'fwp'
});
const dashboardTotalPorEstadoExpression = `
  CASE
    WHEN ${facturaEstadoOperativoExpression} = '${FACTURA_ESTADOS.PAGADO}'
      THEN ${totalPagoBaseExpression}
    ELSE ${totalAPagarExpression}
  END
`;
const monedaFacturaExpression = `
  COALESCE(
    f.resumen->'CodigoTipoMoneda'->>'CodigoMoneda',
    f.resumen->>'CodigoMoneda',
    f.resumen->>'codigoMoneda',
    'CRC'
  )
`;

const getFacturasStats = async ({ sociedadId } = {}) => {
  const params = sociedadId ? [sociedadId] : [];
  const whereSociedad = sociedadId ? 'WHERE f.sociedad_id = $1' : '';

  const { rows } = await pool.query(
    `
    SELECT
      COUNT(*)::int as total_facturas,
      SUM(
        CASE WHEN ${facturaEstadoOperativoExpression} IN (
          '${FACTURA_ESTADOS.CONTABILIZADO}',
          '${FACTURA_ESTADOS.EN_TRAMITE_PAGO}',
          '${FACTURA_ESTADOS.PAGADO_PARCIALMENTE}'
        ) THEN 1 ELSE 0 END
      )::int as contabilizados,
      SUM(CASE WHEN ${facturaEstadoOperativoExpression} = '${FACTURA_ESTADOS.RECHAZADO}' THEN 1 ELSE 0 END)::int as rechazados,
      SUM(CASE WHEN ${facturaEstadoOperativoExpression} = '${FACTURA_ESTADOS.EN_REVISION}' THEN 1 ELSE 0 END)::int as en_revision,
      SUM(CASE WHEN ${facturaEstadoOperativoExpression} = '${FACTURA_ESTADOS.NO_CONTABILIZADO}' THEN 1 ELSE 0 END)::int as no_contabilizado,
      SUM(CASE WHEN f.fecha_emision >= date_trunc('month', CURRENT_DATE) THEN 1 ELSE 0 END)::int as total_mes,
      SUM(CASE WHEN ${facturaEstadoOperativoExpression} = '${FACTURA_ESTADOS.CONTABILIZADO}' THEN 1 ELSE 0 END)::int as contabilizado_simple,
      SUM(CASE WHEN ${facturaEstadoOperativoExpression} = '${FACTURA_ESTADOS.EN_TRAMITE_PAGO}' THEN 1 ELSE 0 END)::int as en_tramite,
      SUM(CASE WHEN ${facturaEstadoOperativoExpression} = '${FACTURA_ESTADOS.PAGADO_PARCIALMENTE}' THEN 1 ELSE 0 END)::int as pagados_parcialmente,
      SUM(CASE WHEN ${facturaEstadoOperativoExpression} = '${FACTURA_ESTADOS.PAGADO}' THEN 1 ELSE 0 END)::int as pagados
    FROM facturas f
    ${facturaWorkflowPagoJoin}
    ${whereSociedad}
    `,
    params
  );

  return rows[0] || null;
};

const countNotasCredito = async ({ sociedadId } = {}) => {
  const params = sociedadId ? [sociedadId] : [];
  const whereSociedad = sociedadId ? 'WHERE sociedad_id = $1' : '';
  const { rows } = await pool.query(
    `SELECT COUNT(*)::int as count FROM notas_credito ${whereSociedad}`,
    params
  );

  return rows[0] || null;
};

const countMensajesHacienda = async ({ sociedadId } = {}) => {
  const params = sociedadId ? [sociedadId] : [];
  const whereSociedad = sociedadId ? 'WHERE sociedad_id = $1' : '';
  const { rows } = await pool.query(
    `SELECT COUNT(*)::int as count FROM mensajes_hacienda ${whereSociedad}`,
    params
  );

  return rows[0] || null;
};

const countSociedades = async ({ sociedadId } = {}) => {
  if (sociedadId) {
    const { rows } = await pool.query(
      'SELECT COUNT(*)::int as count FROM sociedades WHERE id = $1',
      [sociedadId]
    );
    return rows[0] || null;
  }

  const { rows } = await pool.query('SELECT COUNT(*)::int as count FROM sociedades');
  return rows[0] || null;
};

const getMonedasResumen = async ({ sociedadId } = {}) => {
  const params = sociedadId ? [sociedadId] : [];
  const whereSociedadFactura = sociedadId ? 'WHERE f.sociedad_id = $1' : '';

  const { rows } = await pool.query(
    `
    SELECT
      ${monedaFacturaExpression} AS moneda,
      ${facturaEstadoOperativoExpression} AS estado,
      SUM(${dashboardTotalPorEstadoExpression}) AS total,
      COUNT(*)::int AS count
    FROM facturas f
    ${facturaWorkflowPagoJoin}
    LEFT JOIN facturas_contabilizacion fc ON fc.factura_id = f.id
    ${whereSociedadFactura}
    GROUP BY 1, 2
    `,
    params
  );

  return rows;
};

const listRecentFacturas = async ({ sociedadId } = {}) => {
  const params = sociedadId ? [sociedadId] : [];
  const sociedadFilter = sociedadId ? 'AND sociedad_id = $1' : '';

  const { rows } = await pool.query(
    `
    SELECT id, 'Factura' as tipo, CONCAT('Factura procesada: ', consecutivo) as descripcion,
           fecha_emision as fecha
    FROM facturas
    WHERE fecha_emision IS NOT NULL
    ${sociedadFilter}
    ORDER BY fecha_emision DESC
    LIMIT 5
    `,
    params
  );

  return rows;
};

const listRecentNotasCredito = async ({ sociedadId } = {}) => {
  const params = sociedadId ? [sociedadId] : [];
  const sociedadFilter = sociedadId ? 'AND sociedad_id = $1' : '';

  const { rows } = await pool.query(
    `
    SELECT id, 'Nota de Credito' as tipo, CONCAT('Nota de credito procesada: ', clave) as descripcion,
           fecha_emision as fecha
    FROM notas_credito
    WHERE fecha_emision IS NOT NULL
    ${sociedadFilter}
    ORDER BY fecha_emision DESC
    LIMIT 5
    `,
    params
  );

  return rows;
};

const listRecentMensajesHacienda = async ({ sociedadId } = {}) => {
  const params = sociedadId ? [sociedadId] : [];
  const sociedadFilter = sociedadId ? 'AND sociedad_id = $1' : '';

  const { rows } = await pool.query(
    `
    SELECT id, 'Mensaje Hacienda' as tipo, CONCAT('Mensaje procesado: ', estado) as descripcion,
           creado_en as fecha
    FROM mensajes_hacienda
    WHERE creado_en IS NOT NULL
    ${sociedadFilter}
    ORDER BY creado_en DESC
    LIMIT 5
    `,
    params
  );

  return rows;
};

const listRecentDocuments = async ({ sociedadId } = {}) => {
  const params = sociedadId ? [sociedadId] : [];
  const sociedadFilter = sociedadId ? 'WHERE f.sociedad_id = $1' : '';

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
    )
    SELECT
      he.id,
      he.origen_historial,
      he.factura_id,
      he.estado_anterior,
      he.estado_nuevo,
      he.dominio,
      he.usuario,
      he.motivo,
      he.creado_en,
      f.consecutivo,
      f.clave,
      f.emisor,
      ${facturaEstadoOperativoExpression} AS estado,
      f.estado AS estado_documental,
      fwp.estado AS estado_workflow_pago,
      f.resumen,
      f.sociedad_id
    FROM historial_estado he
    JOIN facturas f ON f.id = he.factura_id
    ${facturaWorkflowPagoJoin}
    ${sociedadFilter}
    ORDER BY he.creado_en DESC, he.id DESC
    LIMIT 10
    `,
    params
  );

  return rows;
};

const getCuentasPagarResumenPorMoneda = async ({ sociedadId } = {}) => {
  const params = sociedadId ? [sociedadId] : [];
  const estadosFlujoPago = `
    (
      '${FACTURA_ESTADOS.CONTABILIZADO}',
      '${FACTURA_ESTADOS.EN_TRAMITE_PAGO}',
      '${FACTURA_ESTADOS.PAGADO_PARCIALMENTE}'
    )
  `;
  const whereClauses = [`${facturaEstadoOperativoExpression} IN ${estadosFlujoPago}`];

  if (sociedadId) {
    whereClauses.push('f.sociedad_id = $1');
  }

  const whereClause = `WHERE ${whereClauses.join(' AND ')}`;

  const { rows } = await pool.query(
    `
    SELECT
      ${monedaFacturaExpression} AS moneda,
      COUNT(*)::int AS docs_por_pagar,
      COALESCE(SUM(${totalAPagarExpression}), 0) AS monto_por_pagar,
      COUNT(*) FILTER (
        WHERE fc.fecha_vencimiento IS NOT NULL
          AND fc.fecha_vencimiento < CURRENT_DATE
      )::int AS docs_vencidas,
      COALESCE(SUM(
        CASE WHEN fc.fecha_vencimiento IS NOT NULL
          AND fc.fecha_vencimiento < CURRENT_DATE
            THEN ${totalAPagarExpression}
            ELSE 0
        END
      ), 0) AS monto_vencidas,
      COUNT(*) FILTER (
        WHERE fc.fecha_vencimiento IS NOT NULL
          AND fc.fecha_vencimiento >= CURRENT_DATE
          AND fc.fecha_vencimiento <= (CURRENT_DATE + INTERVAL '7 days')
      )::int AS docs_por_vencer_7,
      COALESCE(SUM(
        CASE WHEN fc.fecha_vencimiento IS NOT NULL
          AND fc.fecha_vencimiento >= CURRENT_DATE
          AND fc.fecha_vencimiento <= (CURRENT_DATE + INTERVAL '7 days')
            THEN ${totalAPagarExpression}
            ELSE 0
        END
      ), 0) AS monto_por_vencer_7,
      COUNT(*) FILTER (
        WHERE ${retencionPendienteExpression} > 0
      )::int AS docs_retencion_pendiente,
      COALESCE(SUM(${retencionPendienteExpression}), 0) AS monto_retencion_pendiente,
      COALESCE(SUM(${totalPendienteGlobalExpression}), 0) AS monto_pendiente_global
    FROM facturas f
    ${facturaWorkflowPagoJoin}
    LEFT JOIN facturas_contabilizacion fc ON fc.factura_id = f.id
    ${whereClause}
    GROUP BY moneda
    ORDER BY moneda ASC
    `,
    params
  );

  return rows;
};

const getTopProveedoresPorPagar = async ({ sociedadId, limit = 10 } = {}) => {
  const params = [];
  const whereClauses = [
    `${facturaEstadoOperativoExpression} IN (
      '${FACTURA_ESTADOS.CONTABILIZADO}',
      '${FACTURA_ESTADOS.EN_TRAMITE_PAGO}',
      '${FACTURA_ESTADOS.PAGADO_PARCIALMENTE}'
    )`
  ];

  if (sociedadId) {
    params.push(sociedadId);
    whereClauses.push(`f.sociedad_id = $${params.length}`);
  }

  params.push(limit);
  const limitPlaceholder = `$${params.length}`;
  const whereClause = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  const { rows } = await pool.query(
    `
    WITH proveedores_agrupados AS (
      SELECT
        p.id AS proveedor_id,
        p.nombre AS proveedor_nombre,
        p.identificacion_numero AS proveedor_identificacion,
        ${monedaFacturaExpression} AS moneda,
        COUNT(*)::int AS documentos,
        SUM(${totalAPagarExpression}) AS total_a_pagar,
        SUM(${retencionPendienteExpression}) AS total_retencion_pendiente,
        SUM(${totalPendienteGlobalExpression}) AS total_pendiente_global
      FROM facturas f
      ${facturaWorkflowPagoJoin}
      JOIN facturas_contabilizacion fc ON fc.factura_id = f.id
      JOIN proveedores p ON p.id = fc.proveedor_id
      ${whereClause}
      GROUP BY p.id, p.nombre, p.identificacion_numero, moneda
      HAVING SUM(${totalPendienteGlobalExpression}) > 0
    ),
    ranked AS (
      SELECT
        proveedor_id,
        proveedor_nombre,
        proveedor_identificacion,
        moneda,
        documentos,
        total_a_pagar,
        total_retencion_pendiente,
        total_pendiente_global,
        ROW_NUMBER() OVER (
          PARTITION BY moneda
          ORDER BY total_pendiente_global DESC, documentos DESC, proveedor_nombre ASC
        ) AS moneda_rank
      FROM proveedores_agrupados
    )
    SELECT
      proveedor_id,
      proveedor_nombre,
      proveedor_identificacion,
      moneda,
      documentos,
      total_a_pagar,
      total_retencion_pendiente,
      total_pendiente_global
    FROM ranked
    WHERE moneda_rank <= ${limitPlaceholder}
    ORDER BY moneda ASC, moneda_rank ASC
    `,
    params
  );

  return rows;
};

const getTramitesWorkQueueSummary = async ({ sociedadId } = {}) => {
  const params = [];
  const whereClauses = [];

  if (sociedadId) {
    params.push(sociedadId);
    whereClauses.push(`t.sociedad_id = $${params.length}`);
  }

  const whereClause = whereClauses.length > 0
    ? `WHERE ${whereClauses.join(' AND ')}`
    : '';

  const { rows } = await pool.query(
    `
    WITH tramites_base AS (
      SELECT
        t.id,
        t.estado
      FROM tramites_pago t
      ${whereClause}
    ),
    documentos_activos AS (
      SELECT
        tb.id AS tramite_id,
        tb.estado AS tramite_estado,
        td.estado_gerencia,
        td.estado_gerencia_contable,
        td.estado_financiero
      FROM tramites_base tb
      JOIN tramites_pago_documentos td ON td.tramite_id = tb.id
      WHERE ${tesoreriaActivaSql('td.estado_tesoreria')}
    )
    SELECT
      (SELECT COUNT(*)::int FROM tramites_base WHERE estado NOT IN ('${TRAMITE_ESTADOS.PAGADO}', '${TRAMITE_ESTADOS.CANCELADO}')) AS activos,
      (SELECT COUNT(*)::int FROM tramites_base WHERE estado = '${TRAMITE_ESTADOS.EN_APROBACION_GERENCIA}') AS estado_en_aprobacion_gerencia,
      (SELECT COUNT(*)::int FROM tramites_base WHERE estado = '${TRAMITE_ESTADOS.EN_APROBACION_GERENCIA_CONTABLE}') AS estado_en_aprobacion_gerencia_contable,
      (SELECT COUNT(*)::int FROM tramites_base WHERE estado = '${TRAMITE_ESTADOS.EN_APROBACION_GERENCIA_FINANCIERA}') AS estado_en_aprobacion_gerencia_financiera,
      (SELECT COUNT(*)::int FROM tramites_base WHERE estado = '${TRAMITE_ESTADOS.EN_REVISION_TESORERIA}') AS estado_en_revision_tesoreria,
      (SELECT COUNT(*)::int FROM tramites_base WHERE estado = '${TRAMITE_ESTADOS.EN_REVISION_TESORERIA_1}') AS estado_en_revision_tesoreria_1,
      (SELECT COUNT(*)::int FROM tramites_base WHERE estado = '${TRAMITE_ESTADOS.EN_REVISION_TESORERIA_2}') AS estado_en_revision_tesoreria_2,
      (SELECT COUNT(*)::int FROM tramites_base WHERE estado = '${TRAMITE_ESTADOS.PAGADO}') AS estado_pagado,
      (SELECT COUNT(*)::int FROM tramites_base WHERE estado = '${TRAMITE_ESTADOS.CANCELADO}') AS estado_cancelado,
      (SELECT COUNT(*)::int
       FROM documentos_activos
       WHERE tramite_estado = '${TRAMITE_ESTADOS.EN_APROBACION_GERENCIA}'
         AND estado_gerencia = '${DOCUMENTO_ESTADOS.PENDIENTE}') AS aprobaciones_pendientes_gerencia,
      (SELECT COUNT(*)::int
       FROM documentos_activos
       WHERE tramite_estado = '${TRAMITE_ESTADOS.EN_APROBACION_GERENCIA_CONTABLE}'
         AND estado_gerencia_contable = '${DOCUMENTO_ESTADOS.PENDIENTE}') AS aprobaciones_pendientes_gerencia_contable,
      (SELECT COUNT(*)::int
       FROM documentos_activos
       WHERE tramite_estado = '${TRAMITE_ESTADOS.EN_APROBACION_GERENCIA_FINANCIERA}'
         AND estado_financiero = '${DOCUMENTO_ESTADOS.PENDIENTE}') AS aprobaciones_pendientes_financiera,
      (SELECT COUNT(*)::int
       FROM documentos_activos
       WHERE tramite_estado NOT IN ('${TRAMITE_ESTADOS.PAGADO}', '${TRAMITE_ESTADOS.CANCELADO}')
         AND (
           estado_gerencia = '${DOCUMENTO_ESTADOS.RECHAZADO}'
           OR estado_gerencia_contable = '${DOCUMENTO_ESTADOS.RECHAZADO}'
           OR estado_financiero = '${DOCUMENTO_ESTADOS.RECHAZADO}'
         )) AS rechazados_activos
    `,
    params
  );

  return rows[0] || null;
};

module.exports = {
  getFacturasStats,
  countNotasCredito,
  countMensajesHacienda,
  countSociedades,
  getMonedasResumen,
  getCuentasPagarResumenPorMoneda,
  getTopProveedoresPorPagar,
  getTramitesWorkQueueSummary,
  listRecentFacturas,
  listRecentNotasCredito,
  listRecentMensajesHacienda,
  listRecentDocuments
};
