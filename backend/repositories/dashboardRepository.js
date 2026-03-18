const pool = require('../db');
const { FACTURA_ESTADOS } = require('../domain/facturas');
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
const dashboardTotalPorEstadoExpression = `
  CASE
    WHEN COALESCE(f.estado, '${FACTURA_ESTADOS.NO_CONTABILIZADO}') = '${FACTURA_ESTADOS.PAGADO}'
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
  const whereSociedad = sociedadId ? 'WHERE sociedad_id = $1' : '';

  const { rows } = await pool.query(
    `
    SELECT
      COUNT(*)::int as total_facturas,
      SUM(
        CASE WHEN estado IN (
          '${FACTURA_ESTADOS.CONTABILIZADO}',
          '${FACTURA_ESTADOS.EN_TRAMITE_PAGO}',
          '${FACTURA_ESTADOS.PAGADO_PARCIALMENTE}'
        ) THEN 1 ELSE 0 END
      )::int as contabilizados,
      SUM(CASE WHEN estado = '${FACTURA_ESTADOS.RECHAZADO}' THEN 1 ELSE 0 END)::int as rechazados,
      SUM(CASE WHEN estado = '${FACTURA_ESTADOS.EN_REVISION}' THEN 1 ELSE 0 END)::int as en_revision,
      SUM(CASE WHEN estado IS NULL OR estado = '${FACTURA_ESTADOS.NO_CONTABILIZADO}' THEN 1 ELSE 0 END)::int as no_contabilizado,
      SUM(CASE WHEN fecha_emision >= date_trunc('month', CURRENT_DATE) THEN 1 ELSE 0 END)::int as total_mes,
      SUM(CASE WHEN estado = '${FACTURA_ESTADOS.CONTABILIZADO}' THEN 1 ELSE 0 END)::int as contabilizado_simple,
      SUM(CASE WHEN estado = '${FACTURA_ESTADOS.EN_TRAMITE_PAGO}' THEN 1 ELSE 0 END)::int as en_tramite,
      SUM(CASE WHEN estado = '${FACTURA_ESTADOS.PAGADO_PARCIALMENTE}' THEN 1 ELSE 0 END)::int as pagados_parcialmente,
      SUM(CASE WHEN estado = '${FACTURA_ESTADOS.PAGADO}' THEN 1 ELSE 0 END)::int as pagados
    FROM facturas
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
      COALESCE(f.estado, '${FACTURA_ESTADOS.NO_CONTABILIZADO}') AS estado,
      SUM(${dashboardTotalPorEstadoExpression}) AS total,
      COUNT(*)::int AS count
    FROM facturas f
    LEFT JOIN facturas_contabilizacion fc ON fc.factura_id = f.id
    ${whereSociedadFactura}
    GROUP BY moneda, estado
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
    SELECT
      ed.id,
      ed.factura_id,
      ed.estado_anterior,
      ed.estado_nuevo,
      ed.usuario,
      ed.motivo,
      ed.creado_en,
      f.consecutivo,
      f.clave,
      f.emisor,
      f.estado,
      f.resumen,
      f.sociedad_id
    FROM estados_documento ed
    JOIN facturas f ON f.id = ed.factura_id
    ${sociedadFilter}
    ORDER BY ed.creado_en DESC
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
  const whereClauses = [`f.estado IN ${estadosFlujoPago}`];

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
    `f.estado IN (
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

module.exports = {
  getFacturasStats,
  countNotasCredito,
  countMensajesHacienda,
  countSociedades,
  getMonedasResumen,
  getCuentasPagarResumenPorMoneda,
  getTopProveedoresPorPagar,
  listRecentFacturas,
  listRecentNotasCredito,
  listRecentMensajesHacienda,
  listRecentDocuments
};
