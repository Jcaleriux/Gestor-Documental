const pool = require('../db');
const {
  createFacturaWorkflowPagoJoin,
  createFacturaEstadoOperativoExpression
} = require('./sqlFacturaEstado');
const {
  createTotalFacturaExpression,
  createTotalPagoPrincipalExpression,
  createRetencionPendienteExpression,
  createTotalPendienteGlobalExpression
} = require('./sqlMontosFactura');
const { addSociedadScopeClause } = require('./sociedadScopeSql');

const facturaWorkflowPagoJoin = createFacturaWorkflowPagoJoin({ facturaAlias: 'f', workflowAlias: 'fwp' });
const estadoExpression = createFacturaEstadoOperativoExpression({ facturaAlias: 'f', workflowAlias: 'fwp' });
const totalExpression = createTotalFacturaExpression({ facturaAlias: 'f' });
const totalAPagarExpression = createTotalPagoPrincipalExpression({ facturaAlias: 'f', contaAlias: 'fc' });
const retencionPendienteExpression = createRetencionPendienteExpression({ contaAlias: 'fc' });
const pendienteGlobalExpression = createTotalPendienteGlobalExpression({ facturaAlias: 'f', contaAlias: 'fc' });
const monedaExpression = `
  COALESCE(
    f.resumen->'CodigoTipoMoneda'->>'CodigoMoneda',
    f.resumen->>'CodigoMoneda',
    f.resumen->>'codigoMoneda',
    'CRC'
  )
`;
const proveedorNombreExpression = `
  COALESCE(NULLIF(p.nombre, ''), NULLIF(f.emisor->>'Nombre', ''), NULLIF(f.emisor->>'nombre', ''), 'Sin proveedor')
`;
const proveedorIdentificacionExpression = `
  COALESCE(
    NULLIF(p.identificacion_numero, ''),
    NULLIF(f.emisor->'Identificacion'->>'Numero', ''),
    NULLIF(f.emisor->'identificacion'->>'numero', ''),
    ''
  )
`;

const addFilter = (params, clauses, value, sqlFactory) => {
  if (value === undefined || value === null || value === '') {
    return;
  }
  params.push(value);
  clauses.push(sqlFactory(`$${params.length}`));
};

const buildBaseQuery = ({ sociedadId, sociedadIds, filters = {} } = {}) => {
  const params = [];
  const clauses = [];

  addSociedadScopeClause({
    params,
    clauses,
    column: 'f.sociedad_id',
    sociedadId,
    sociedadIds
  });
  addFilter(params, clauses, filters.fechaDesde, (param) => `f.fecha_emision::date >= ${param}::date`);
  addFilter(params, clauses, filters.fechaHasta, (param) => `f.fecha_emision::date <= ${param}::date`);
  addFilter(params, clauses, filters.moneda, (param) => `${monedaExpression} = ${param}`);
  addFilter(params, clauses, filters.estado, (param) => `${estadoExpression} = ${param}`);
  addFilter(params, clauses, filters.proveedor, (param) => `LOWER(${proveedorNombreExpression}) LIKE LOWER('%' || ${param} || '%')`);
  addFilter(params, clauses, filters.centroCosto, (param) => `(
    LOWER(COALESCE(fc.centro_costo, '')) LIKE LOWER('%' || ${param} || '%')
    OR LOWER(COALESCE(fc.metadata->'centros_costo_lineas', '[]'::jsonb)::text) LIKE LOWER('%' || ${param} || '%')
  )`);
  addFilter(params, clauses, filters.busqueda, (param) => `(
    LOWER(COALESCE(f.consecutivo, '')) LIKE LOWER('%' || ${param} || '%')
    OR LOWER(COALESCE(f.clave, '')) LIKE LOWER('%' || ${param} || '%')
    OR LOWER(${proveedorNombreExpression}) LIKE LOWER('%' || ${param} || '%')
    OR LOWER(${proveedorIdentificacionExpression}) LIKE LOWER('%' || ${param} || '%')
    OR LOWER(COALESCE(fc.cuenta_contable, '')) LIKE LOWER('%' || ${param} || '%')
    OR LOWER(COALESCE(fc.centro_costo, '')) LIKE LOWER('%' || ${param} || '%')
  )`);

  const whereClause = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
  const sql = `
    SELECT
      f.id,
      f.clave,
      f.consecutivo,
      f.fecha_emision,
      f.creado_en,
      f.ruta_xml,
      f.ruta_pdf,
      ${proveedorNombreExpression} AS proveedor_nombre,
      ${proveedorIdentificacionExpression} AS proveedor_identificacion,
      ${monedaExpression} AS moneda,
      ${estadoExpression} AS estado,
      ${totalExpression} AS total,
      ${totalAPagarExpression} AS total_a_pagar,
      ${retencionPendienteExpression} AS retencion_pendiente,
      ${pendienteGlobalExpression} AS pendiente_global,
      fc.fecha_documento,
      fc.fecha_vencimiento,
      fc.fecha_contabilizacion,
      fc.centro_costo,
      fc.cuenta_contable,
      fc.proyecto,
      fc.orden_compra,
      fc.notas,
      fc.metadata,
      tr.tramite_id,
      tr.tramite_estado,
      tr.estado_tesoreria,
      tr.estado_gerencia,
      tr.estado_gerencia_contable,
      tr.estado_financiero
    FROM facturas f
    ${facturaWorkflowPagoJoin}
    LEFT JOIN facturas_contabilizacion fc ON fc.factura_id = f.id
    LEFT JOIN proveedores p ON p.id = fc.proveedor_id
    LEFT JOIN LATERAL (
      SELECT
        t.id AS tramite_id,
        t.estado AS tramite_estado,
        td.estado_tesoreria,
        td.estado_gerencia,
        td.estado_gerencia_contable,
        td.estado_financiero
      FROM tramites_pago_documentos td
      JOIN tramites_pago t ON t.id = td.tramite_id
      WHERE td.factura_id = f.id
      ORDER BY t.creado_en DESC, t.id DESC
      LIMIT 1
    ) tr ON TRUE
    ${whereClause}
  `;

  return { sql, params };
};

const getResumen = async (scope) => {
  const { sql, params } = buildBaseQuery(scope);
  const { rows } = await pool.query(
    `
    WITH base AS (${sql}),
    proveedores_agrupados AS (
      SELECT
        proveedor_nombre,
        proveedor_identificacion,
        moneda,
        COUNT(*)::int AS documentos,
        SUM(pendiente_global) AS monto,
        ROW_NUMBER() OVER (
          PARTITION BY moneda
          ORDER BY SUM(pendiente_global) DESC, COUNT(*) DESC, proveedor_nombre ASC
        ) AS posicion
      FROM base
      GROUP BY proveedor_nombre, proveedor_identificacion, moneda
      HAVING SUM(pendiente_global) > 0
    )
    SELECT
      (SELECT COUNT(*)::int FROM base) AS total_documentos,
      COALESCE((
        SELECT jsonb_agg(item ORDER BY item->>'moneda')
        FROM (
          SELECT jsonb_build_object(
            'moneda', moneda,
            'documentos', COUNT(*)::int,
            'total', SUM(total),
            'pendiente', SUM(pendiente_global)
          ) AS item
          FROM base
          GROUP BY moneda
        ) resumen_moneda
      ), '[]'::jsonb) AS totales_por_moneda,
      COALESCE((
        SELECT jsonb_agg(item ORDER BY item->>'mes', item->>'moneda')
        FROM (
          SELECT jsonb_build_object(
            'mes', TO_CHAR(DATE_TRUNC('month', fecha_emision), 'YYYY-MM'),
            'moneda', moneda,
            'documentos', COUNT(*)::int,
            'total', SUM(total)
          ) AS item
          FROM base
          WHERE fecha_emision IS NOT NULL
          GROUP BY DATE_TRUNC('month', fecha_emision), moneda
        ) serie
      ), '[]'::jsonb) AS serie_mensual,
      COALESCE((
        SELECT jsonb_agg(item ORDER BY (item->>'documentos')::int DESC, item->>'estado')
        FROM (
          SELECT jsonb_build_object('estado', estado, 'documentos', COUNT(*)::int) AS item
          FROM base
          GROUP BY estado
        ) estados
      ), '[]'::jsonb) AS estados,
      COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'proveedorNombre', proveedor_nombre,
          'proveedorIdentificacion', proveedor_identificacion,
          'moneda', moneda,
          'documentos', documentos,
          'monto', monto
        ) ORDER BY moneda, posicion)
        FROM proveedores_agrupados
        WHERE posicion <= 5
      ), '[]'::jsonb) AS top_proveedores
    `,
    params
  );
  return rows[0];
};

const listDocumentos = async ({ page, pageSize, ...scope }) => {
  const { sql, params } = buildBaseQuery(scope);
  params.push(pageSize);
  const limitParam = `$${params.length}`;
  params.push((page - 1) * pageSize);
  const offsetParam = `$${params.length}`;
  const { rows } = await pool.query(
    `
    WITH base AS (${sql})
    SELECT base.*, COUNT(*) OVER()::int AS total_filtrado
    FROM base
    ORDER BY fecha_emision DESC NULLS LAST, id DESC
    LIMIT ${limitParam} OFFSET ${offsetParam}
    `,
    params
  );
  return rows;
};

module.exports = {
  getResumen,
  listDocumentos
};
