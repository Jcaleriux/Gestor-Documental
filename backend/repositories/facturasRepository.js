const pool = require('../db');
const {
  createTotalFacturaExpression,
  createRebajosAplicadosExpression,
  createRetencionTotalExpression,
  createRetencionPagadaExpression,
  createRetencionPendienteExpression,
  createTotalPagoPrincipalExpression,
  createTotalPendienteGlobalExpression
} = require('./sqlMontosFactura');

const totalFacturaExpression = createTotalFacturaExpression({ facturaAlias: 'f' });
const totalRebajosExpression = createRebajosAplicadosExpression({ contaAlias: 'fc' });
const retencionTotalExpression = createRetencionTotalExpression({ contaAlias: 'fc' });
const retencionPagadaExpression = createRetencionPagadaExpression({ contaAlias: 'fc' });
const retencionPendienteExpression = createRetencionPendienteExpression({ contaAlias: 'fc' });
const totalPagoPrincipalExpression = createTotalPagoPrincipalExpression({ facturaAlias: 'f', contaAlias: 'fc' });
const totalPendienteGlobalExpression = createTotalPendienteGlobalExpression({ facturaAlias: 'f', contaAlias: 'fc' });
const estadoRetencionExpression = `
  CASE
    WHEN ${retencionPendienteExpression} <= 0 THEN 'pagada'
    WHEN ${retencionPagadaExpression} > 0 THEN 'parcial'
    ELSE 'pendiente'
  END
`;

const listFacturas = async ({ sociedadId } = {}) => {
  const params = [];
  let whereClause = '';
  if (sociedadId) {
    params.push(sociedadId);
    whereClause = 'WHERE f.sociedad_id = $1';
  }

  const { rows } = await pool.query(
    `
    SELECT
      f.*,
      ${totalFacturaExpression} AS total_factura,
      ${totalRebajosExpression} AS total_rebajos,
      ${retencionTotalExpression} AS retencion_total,
      ${retencionPagadaExpression} AS retencion_pagada,
      ${retencionPendienteExpression} AS retencion_pendiente,
      ${totalPagoPrincipalExpression} AS total_a_pagar,
      ${totalPendienteGlobalExpression} AS total_pendiente_global
    FROM facturas f
    LEFT JOIN facturas_contabilizacion fc ON fc.factura_id = f.id
    ${whereClause}
    ORDER BY f.fecha_emision DESC
    `,
    params
  );

  return rows;
};

const listRetencionesPendientes = async ({ sociedadId } = {}) => {
  const params = [];
  const whereClauses = [
    `${retencionPendienteExpression} > 0`,
    `f.estado = 'pagado'`
  ];

  if (sociedadId) {
    params.push(sociedadId);
    whereClauses.push(`f.sociedad_id = $${params.length}`);
  }

  const whereClause = whereClauses.length > 0
    ? `WHERE ${whereClauses.join(' AND ')}`
    : '';

  const { rows } = await pool.query(
    `
    SELECT
      f.*,
      ${totalFacturaExpression} AS total_factura,
      ${totalRebajosExpression} AS total_rebajos,
      ${retencionTotalExpression} AS retencion_total,
      ${retencionPagadaExpression} AS retencion_pagada,
      ${retencionPendienteExpression} AS retencion_pendiente,
      ${totalPagoPrincipalExpression} AS total_a_pagar,
      ${totalPendienteGlobalExpression} AS total_pendiente_global,
      ${estadoRetencionExpression} AS estado_retencion,
      fc.fecha_ultimo_pago_retencion,
      p.id AS proveedor_id,
      p.nombre AS proveedor_nombre,
      p.identificacion_numero AS proveedor_identificacion,
      EXISTS (
        SELECT 1
        FROM tramites_pago_retenciones tr
        JOIN tramites_pago t ON t.id = tr.tramite_id
        WHERE tr.factura_id = f.id
          AND t.estado NOT IN ('pagado', 'cancelado')
          AND COALESCE(NULLIF(TRIM(LOWER(tr.estado_tesoreria)), ''), 'pendiente') <> 'excluido'
      ) AS retencion_en_tramite_activo
    FROM facturas f
    JOIN facturas_contabilizacion fc ON fc.factura_id = f.id
    LEFT JOIN proveedores p ON p.id = fc.proveedor_id
    ${whereClause}
    ORDER BY f.fecha_emision DESC NULLS LAST, f.id DESC
    `,
    params
  );

  return rows;
};

const getFacturaById = async (id) => {
  const { rows } = await pool.query(
    `
    SELECT
      f.*,
      ${totalFacturaExpression} AS total_factura,
      ${totalRebajosExpression} AS total_rebajos,
      ${retencionTotalExpression} AS retencion_total,
      ${retencionPagadaExpression} AS retencion_pagada,
      ${retencionPendienteExpression} AS retencion_pendiente,
      ${totalPagoPrincipalExpression} AS total_a_pagar,
      ${totalPendienteGlobalExpression} AS total_pendiente_global,
      EXISTS (
        SELECT 1
        FROM mensajes_hacienda m
        WHERE m.factura_id = f.id OR m.clave = f.clave
      ) AS has_mensaje_hacienda
    FROM facturas f
    LEFT JOIN facturas_contabilizacion fc ON fc.factura_id = f.id
    WHERE f.id = $1
    `,
    [id]
  );

  return rows[0] || null;
};

const getClaveByFacturaId = async (id) => {
  const { rows } = await pool.query(
    'SELECT clave FROM facturas WHERE id = $1',
    [id]
  );

  return rows[0] || null;
};

const getLatestMensajeHaciendaByClave = async (clave) => {
  const { rows } = await pool.query(
    `
    SELECT id, clave, mensaje, estado, detalle, ruta_xml, creado_en, sociedad_id, factura_id
    FROM mensajes_hacienda
    WHERE clave = $1
    ORDER BY creado_en DESC
    LIMIT 1
    `,
    [clave]
  );

  return rows[0] || null;
};

const getLatestMensajeHaciendaByFacturaId = async (facturaId) => {
  const { rows } = await pool.query(
    `
    SELECT id, clave, mensaje, estado, detalle, ruta_xml, creado_en, sociedad_id, factura_id
    FROM mensajes_hacienda
    WHERE factura_id = $1
    ORDER BY creado_en DESC
    LIMIT 1
    `,
    [facturaId]
  );

  return rows[0] || null;
};

const listNotasCredito = async ({ sociedadId, proveedorId } = {}) => {
  const params = [];
  const whereClauses = [];
  let proveedorJoin = '';

  const emisorIdentificacionNormalizada = `
    regexp_replace(
      upper(
        COALESCE(
          n.xml_completo #>> '{Emisor,Identificacion,Numero}',
          n.xml_completo #>> '{emisor,identificacion,numero}',
          ''
        )
      ),
      '[^0-9A-Z]',
      '',
      'g'
    )
  `;

  if (sociedadId) {
    params.push(sociedadId);
    whereClauses.push(`n.sociedad_id = $${params.length}`);
  }

  if (proveedorId) {
    params.push(proveedorId);
    proveedorJoin = `JOIN proveedores p ON p.id = $${params.length}`;
    whereClauses.push('p.sociedad_id = n.sociedad_id');
    whereClauses.push(`p.identificacion_numero_normalizado = ${emisorIdentificacionNormalizada}`);
  }

  const whereClause = whereClauses.length > 0
    ? `WHERE ${whereClauses.join(' AND ')}`
    : '';

  const { rows } = await pool.query(
    `
    SELECT n.*
    FROM notas_credito n
    ${proveedorJoin}
    ${whereClause}
    ORDER BY n.fecha_emision DESC
    `,
    params
  );

  return rows;
};

const getNotaCreditoById = async (id) => {
  const { rows } = await pool.query(
    `
    SELECT n.*
    FROM notas_credito n
    WHERE n.id = $1
    `,
    [id]
  );

  return rows[0] || null;
};

const listTiquetesElectronicos = async ({ sociedadId } = {}) => {
  const params = [];
  let whereClause = '';
  if (sociedadId) {
    params.push(sociedadId);
    whereClause = 'WHERE t.sociedad_id = $1';
  }

  const { rows } = await pool.query(
    `
    SELECT t.*
    FROM tiquetes_electronicos t
    ${whereClause}
    ORDER BY t.fecha_emision DESC
    `,
    params
  );

  return rows;
};

const listMensajesHacienda = async ({ sociedadId } = {}) => {
  const params = [];
  let whereClause = '';
  if (sociedadId) {
    params.push(sociedadId);
    whereClause = 'WHERE m.sociedad_id = $1';
  }

  const { rows } = await pool.query(
    `
    SELECT m.*
    FROM mensajes_hacienda m
    ${whereClause}
    ORDER BY m.creado_en DESC
    `,
    params
  );

  return rows;
};

module.exports = {
  listFacturas,
  listRetencionesPendientes,
  getFacturaById,
  getClaveByFacturaId,
  getLatestMensajeHaciendaByFacturaId,
  getLatestMensajeHaciendaByClave,
  listNotasCredito,
  getNotaCreditoById,
  listTiquetesElectronicos,
  listMensajesHacienda
};
