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

const emisorNombreExpression = `
  COALESCE(
    f.emisor ->> 'Nombre',
    f.emisor ->> 'nombre',
    ''
  )
`;

const receptorNombreExpression = `
  COALESCE(
    f.receptor ->> 'Nombre',
    f.receptor ->> 'nombre',
    ''
  )
`;

const hasMensajeHaciendaExpression = `
  EXISTS (
    SELECT 1
    FROM mensajes_hacienda m
    WHERE m.factura_id = f.id OR m.clave = f.clave
  )
`;

const notaCreditoMontoExpression = `
  COALESCE(
    NULLIF(n.xml_completo #>> '{ResumenFactura,TotalComprobante}', '')::numeric,
    NULLIF(n.xml_completo #>> '{ResumenFactura,totalComprobante}', '')::numeric,
    NULLIF(n.xml_completo #>> '{ResumenNotaCredito,TotalComprobante}', '')::numeric,
    NULLIF(n.xml_completo #>> '{ResumenNotaCredito,totalComprobante}', '')::numeric,
    0
  )
`;

const notaCreditoMonedaExpression = `
  upper(
    COALESCE(
      NULLIF(n.xml_completo #>> '{ResumenFactura,CodigoTipoMoneda,CodigoMoneda}', ''),
      NULLIF(n.xml_completo #>> '{ResumenFactura,codigoTipoMoneda,codigoMoneda}', ''),
      NULLIF(n.xml_completo #>> '{ResumenFactura,CodigoMoneda}', ''),
      NULLIF(n.xml_completo #>> '{ResumenFactura,codigoMoneda}', ''),
      NULLIF(n.xml_completo #>> '{ResumenNotaCredito,CodigoTipoMoneda,CodigoMoneda}', ''),
      NULLIF(n.xml_completo #>> '{ResumenNotaCredito,codigoTipoMoneda,codigoMoneda}', ''),
      NULLIF(n.xml_completo #>> '{ResumenNotaCredito,CodigoMoneda}', ''),
      NULLIF(n.xml_completo #>> '{ResumenNotaCredito,codigoMoneda}', ''),
      'CRC'
    )
  )
`;

const notaCreditoEmisorNombreExpression = `
  COALESCE(
    n.xml_completo #>> '{Emisor,Nombre}',
    n.xml_completo #>> '{emisor,Nombre}',
    n.xml_completo #>> '{Emisor,nombre}',
    n.xml_completo #>> '{emisor,nombre}',
    ''
  )
`;

const notaCreditoNumeroConsecutivoExpression = `
  COALESCE(
    NULLIF(n.xml_completo #>> '{NumeroConsecutivo}', ''),
    NULLIF(n.xml_completo #>> '{numeroConsecutivo}', ''),
    ''
  )
`;

const notaCreditoEmisorIdentificacionExpression = `
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

const tiqueteMonedaExpression = `
  upper(
    COALESCE(
      t.resumen #>> '{CodigoTipoMoneda,CodigoMoneda}',
      t.resumen #>> '{codigoTipoMoneda,codigoMoneda}',
      t.resumen ->> 'CodigoMoneda',
      t.resumen ->> 'codigoMoneda',
      'CRC'
    )
  )
`;

const tiqueteMontoExpression = `
  COALESCE(
    NULLIF(t.resumen #>> '{TotalComprobante}', '')::numeric,
    NULLIF(t.resumen #>> '{totalComprobante}', '')::numeric,
    0
  )
`;

const tiqueteEmisorNombreExpression = `
  COALESCE(
    t.emisor ->> 'Nombre',
    t.emisor ->> 'nombre',
    ''
  )
`;

const buildFacturasListBaseCte = () => `
  WITH facturas_enriquecidas AS (
    SELECT
      f.*,
      ${totalFacturaExpression} AS total_factura,
      ${totalRebajosExpression} AS total_rebajos,
      ${retencionTotalExpression} AS retencion_total,
      ${retencionPagadaExpression} AS retencion_pagada,
      ${retencionPendienteExpression} AS retencion_pendiente,
      ${totalPagoPrincipalExpression} AS total_a_pagar,
      ${totalPendienteGlobalExpression} AS total_pendiente_global,
      ${monedaFacturaExpression} AS moneda,
      ${emisorNombreExpression} AS emisor_nombre,
      ${receptorNombreExpression} AS receptor_nombre,
      COALESCE(f.consecutivo::text, '') AS numero_documento,
      COALESCE(f.clave::text, '') AS clave_text,
      ${hasMensajeHaciendaExpression} AS has_mensaje_hacienda
    FROM facturas f
    LEFT JOIN facturas_contabilizacion fc ON fc.factura_id = f.id
  )
`;

const buildFacturasListWhere = ({
  sociedadId,
  search,
  estado,
  emisor,
  moneda,
  fechaDesde,
  fechaHasta,
  montoMin,
  montoMax,
} = {}) => {
  const params = [];
  const clauses = [];

  if (sociedadId) {
    params.push(sociedadId);
    clauses.push(`fe.sociedad_id = $${params.length}`);
  }

  if (search) {
    params.push(`%${String(search).toLowerCase()}%`);
    clauses.push(`
      (
        LOWER(fe.emisor_nombre) LIKE $${params.length}
        OR LOWER(fe.receptor_nombre) LIKE $${params.length}
        OR LOWER(fe.numero_documento) LIKE $${params.length}
        OR LOWER(fe.clave_text) LIKE $${params.length}
      )
    `);
  }

  if (estado) {
    params.push(estado);
    clauses.push(`fe.estado = $${params.length}`);
  }

  if (emisor) {
    params.push(`%${String(emisor).toLowerCase()}%`);
    clauses.push(`LOWER(fe.emisor_nombre) LIKE $${params.length}`);
  }

  if (moneda) {
    params.push(moneda);
    clauses.push(`fe.moneda = $${params.length}`);
  }

  if (fechaDesde) {
    params.push(fechaDesde);
    clauses.push(`fe.fecha_emision::date >= $${params.length}::date`);
  }

  if (fechaHasta) {
    params.push(fechaHasta);
    clauses.push(`fe.fecha_emision::date <= $${params.length}::date`);
  }

  if (montoMin !== null && montoMin !== undefined) {
    params.push(montoMin);
    clauses.push(`fe.total_factura >= $${params.length}`);
  }

  if (montoMax !== null && montoMax !== undefined) {
    params.push(montoMax);
    clauses.push(`fe.total_factura <= $${params.length}`);
  }

  return {
    params,
    whereClause: clauses.length > 0
      ? `WHERE ${clauses.join(' AND ')}`
      : '',
  };
};

const buildFacturasOrderBy = (sortBy, sortDir) => {
  switch (sortBy) {
    case 'emisor':
      return `LOWER(fe.emisor_nombre) ${sortDir} NULLS LAST, fe.fecha_emision DESC NULLS LAST, fe.id DESC`;
    case 'estado':
      return `COALESCE(fe.estado, '') ${sortDir}, fe.fecha_emision DESC NULLS LAST, fe.id DESC`;
    case 'total_factura':
      return `fe.total_factura ${sortDir} NULLS LAST, fe.fecha_emision DESC NULLS LAST, fe.id DESC`;
    case 'fecha_emision':
    default:
      return `fe.fecha_emision ${sortDir} NULLS LAST, fe.id DESC`;
  }
};

const listFacturas = async ({
  sociedadId,
  search,
  estado,
  emisor,
  moneda,
  fechaDesde,
  fechaHasta,
  montoMin,
  montoMax,
  sortBy = 'fecha_emision',
  sortDir = 'desc',
  page = 1,
  pageSize = 50,
} = {}) => {
  const baseCte = buildFacturasListBaseCte();
  const { params, whereClause } = buildFacturasListWhere({
    sociedadId,
    search,
    estado,
    emisor,
    moneda,
    fechaDesde,
    fechaHasta,
    montoMin,
    montoMax,
  });
  const orderByClause = buildFacturasOrderBy(sortBy, sortDir);
  const offset = (page - 1) * pageSize;

  const itemsSql = `
    ${baseCte}
    SELECT fe.*
    FROM facturas_enriquecidas fe
    ${whereClause}
    ORDER BY ${orderByClause}
    LIMIT $${params.length + 1}
    OFFSET $${params.length + 2}
  `;

  const totalsSql = `
    ${baseCte}
    SELECT
      COUNT(*)::int AS total_items,
      COALESCE(SUM(fe.total_factura), 0) AS total_amount
    FROM facturas_enriquecidas fe
    ${whereClause}
  `;

  const byEstadoSql = `
    ${baseCte}
    SELECT
      COALESCE(fe.estado, 'no_contabilizado') AS estado,
      COUNT(*)::int AS total_items,
      COALESCE(SUM(fe.total_factura), 0) AS total_amount
    FROM facturas_enriquecidas fe
    ${whereClause}
    GROUP BY COALESCE(fe.estado, 'no_contabilizado')
    ORDER BY COUNT(*) DESC, COALESCE(fe.estado, 'no_contabilizado') ASC
  `;

  const byMonedaSql = `
    ${baseCte}
    SELECT
      COALESCE(fe.moneda, 'CRC') AS moneda,
      COUNT(*)::int AS total_items,
      COALESCE(SUM(fe.total_factura), 0) AS total_amount
    FROM facturas_enriquecidas fe
    ${whereClause}
    GROUP BY COALESCE(fe.moneda, 'CRC')
    ORDER BY COUNT(*) DESC, COALESCE(fe.moneda, 'CRC') ASC
  `;

  const [itemsResult, totalsResult, byEstadoResult, byMonedaResult] = await Promise.all([
    pool.query(itemsSql, [...params, pageSize, offset]),
    pool.query(totalsSql, params),
    pool.query(byEstadoSql, params),
    pool.query(byMonedaSql, params),
  ]);

  const totalItems = Number(totalsResult.rows[0]?.total_items || 0);
  const totalPages = totalItems > 0 ? Math.ceil(totalItems / pageSize) : 0;

  return {
    items: itemsResult.rows,
    meta: {
      page,
      pageSize,
      totalItems,
      totalPages,
      hasNext: totalPages > 0 && page < totalPages,
      hasPrev: page > 1 && totalPages > 0,
      sortBy,
      sortDir,
    },
    summary: {
      totalItems,
      totalAmount: Number(totalsResult.rows[0]?.total_amount || 0),
      byEstado: byEstadoResult.rows.map((row) => ({
        estado: row.estado,
        totalItems: Number(row.total_items || 0),
        totalAmount: Number(row.total_amount || 0),
      })),
      byMoneda: byMonedaResult.rows.map((row) => ({
        moneda: row.moneda,
        totalItems: Number(row.total_items || 0),
        totalAmount: Number(row.total_amount || 0),
      })),
    },
  };
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

const listNotasCredito = async ({
  sociedadId,
  proveedorId,
  search,
  estado,
  emisor,
  moneda,
  fechaDesde,
  fechaHasta,
  montoMin,
  montoMax,
  sortBy = 'fecha_emision',
  sortDir = 'desc',
  page = 1,
  pageSize = 50,
} = {}) => {
  const buildNotasCreditoBaseCte = () => `
    WITH notas_credito_base AS (
      SELECT
        n.*,
        ${notaCreditoMontoExpression} AS monto_total,
        ${notaCreditoMonedaExpression} AS moneda,
        ${notaCreditoEmisorNombreExpression} AS emisor_nombre,
        ${notaCreditoNumeroConsecutivoExpression} AS numero_consecutivo,
        COALESCE(n.clave::text, '') AS clave_text,
        ${notaCreditoEmisorIdentificacionExpression} AS emisor_identificacion_normalizada
      FROM notas_credito n
    ),
    notas_credito_enriquecidas AS (
      SELECT
        nb.*,
        LEAST(COALESCE(uso.total_aplicado_estimado, 0), COALESCE(nb.monto_total, 0)) AS total_aplicado,
        GREATEST(
          COALESCE(nb.monto_total, 0) - LEAST(COALESCE(uso.total_aplicado_estimado, 0), COALESCE(nb.monto_total, 0)),
          0
        ) AS saldo_disponible,
        CASE
          WHEN GREATEST(
            COALESCE(nb.monto_total, 0) - LEAST(COALESCE(uso.total_aplicado_estimado, 0), COALESCE(nb.monto_total, 0)),
            0
          ) > 0 THEN 'disponible'
          ELSE 'aplicada'
        END AS estado
      FROM notas_credito_base nb
      LEFT JOIN LATERAL (
        SELECT
          COALESCE(
            SUM(
              CASE
                WHEN fc.monto_nota_credito IS NOT NULL AND fc.monto_nota_credito >= 0 THEN fc.monto_nota_credito
                ELSE COALESCE(nb.monto_total, 0)
              END
            ),
            0
          ) AS total_aplicado_estimado
        FROM facturas_contabilizacion fc
        WHERE fc.nota_credito_id = nb.id
      ) uso ON true
    )
  `;

  const buildNotasCreditoListWhere = ({
    sociedadId: currentSociedadId,
    proveedorId: currentProveedorId,
    search,
    estado,
    emisor,
    moneda,
    fechaDesde,
    fechaHasta,
    montoMin,
    montoMax,
  } = {}) => {
    const params = [];
    const clauses = [];

    if (currentSociedadId) {
      params.push(currentSociedadId);
      clauses.push(`ne.sociedad_id = $${params.length}`);
    }

    if (currentProveedorId) {
      params.push(currentProveedorId);
      clauses.push(`
        EXISTS (
          SELECT 1
          FROM proveedores p
          WHERE p.id = $${params.length}
            AND p.sociedad_id = ne.sociedad_id
            AND p.identificacion_numero_normalizado = ne.emisor_identificacion_normalizada
        )
      `);
    }

    if (search) {
      params.push(`%${String(search).toLowerCase()}%`);
      clauses.push(`
        (
          LOWER(ne.emisor_nombre) LIKE $${params.length}
          OR LOWER(ne.numero_consecutivo) LIKE $${params.length}
          OR LOWER(ne.clave_text) LIKE $${params.length}
        )
      `);
    }

    if (estado) {
      params.push(estado);
      clauses.push(`ne.estado = $${params.length}`);
    }

    if (emisor) {
      params.push(`%${String(emisor).toLowerCase()}%`);
      clauses.push(`LOWER(ne.emisor_nombre) LIKE $${params.length}`);
    }

    if (moneda) {
      params.push(moneda);
      clauses.push(`ne.moneda = $${params.length}`);
    }

    if (fechaDesde) {
      params.push(fechaDesde);
      clauses.push(`ne.fecha_emision::date >= $${params.length}::date`);
    }

    if (fechaHasta) {
      params.push(fechaHasta);
      clauses.push(`ne.fecha_emision::date <= $${params.length}::date`);
    }

    if (montoMin !== null && montoMin !== undefined) {
      params.push(montoMin);
      clauses.push(`ne.monto_total >= $${params.length}`);
    }

    if (montoMax !== null && montoMax !== undefined) {
      params.push(montoMax);
      clauses.push(`ne.monto_total <= $${params.length}`);
    }

    return {
      params,
      whereClause: clauses.length > 0
        ? `WHERE ${clauses.join(' AND ')}`
        : '',
    };
  };

  const buildNotasCreditoOrderBy = (sortBy, sortDir) => {
    switch (sortBy) {
      case 'emisor':
        return `LOWER(ne.emisor_nombre) ${sortDir} NULLS LAST, ne.fecha_emision DESC NULLS LAST, ne.id DESC`;
      case 'estado':
        return `
          CASE ne.estado
            WHEN 'disponible' THEN 0
            WHEN 'aplicada' THEN 1
            ELSE 2
          END ${sortDir},
          ne.fecha_emision DESC NULLS LAST,
          ne.id DESC
        `;
      case 'monto':
        return `ne.monto_total ${sortDir} NULLS LAST, ne.fecha_emision DESC NULLS LAST, ne.id DESC`;
      case 'fecha_emision':
      default:
        return `ne.fecha_emision ${sortDir} NULLS LAST, ne.id DESC`;
    }
  };

  const baseCte = buildNotasCreditoBaseCte();
  const { params, whereClause } = buildNotasCreditoListWhere({
    sociedadId,
    proveedorId,
    search,
    estado,
    emisor,
    moneda,
    fechaDesde,
    fechaHasta,
    montoMin,
    montoMax,
  });
  const orderByClause = buildNotasCreditoOrderBy(sortBy, sortDir);
  const offset = (page - 1) * pageSize;

  const itemsSql = `
    ${baseCte}
    SELECT ne.*
    FROM notas_credito_enriquecidas ne
    ${whereClause}
    ORDER BY ${orderByClause}
    LIMIT $${params.length + 1}
    OFFSET $${params.length + 2}
  `;

  const totalsSql = `
    ${baseCte}
    SELECT
      COUNT(*)::int AS total_items,
      COALESCE(SUM(ne.monto_total), 0) AS total_amount,
      COALESCE(SUM(ne.saldo_disponible), 0) AS total_saldo_disponible
    FROM notas_credito_enriquecidas ne
    ${whereClause}
  `;

  const byEstadoSql = `
    ${baseCte}
    SELECT
      ne.estado,
      COUNT(*)::int AS total_items,
      COALESCE(SUM(ne.monto_total), 0) AS total_amount,
      COALESCE(SUM(ne.saldo_disponible), 0) AS total_saldo_disponible
    FROM notas_credito_enriquecidas ne
    ${whereClause}
    GROUP BY ne.estado
    ORDER BY COUNT(*) DESC, ne.estado ASC
  `;

  const byMonedaSql = `
    ${baseCte}
    SELECT
      COALESCE(ne.moneda, 'CRC') AS moneda,
      COUNT(*)::int AS total_items,
      COALESCE(SUM(ne.monto_total), 0) AS total_amount,
      COALESCE(SUM(ne.saldo_disponible), 0) AS total_saldo_disponible
    FROM notas_credito_enriquecidas ne
    ${whereClause}
    GROUP BY COALESCE(ne.moneda, 'CRC')
    ORDER BY COUNT(*) DESC, COALESCE(ne.moneda, 'CRC') ASC
  `;

  const [itemsResult, totalsResult, byEstadoResult, byMonedaResult] = await Promise.all([
    pool.query(itemsSql, [...params, pageSize, offset]),
    pool.query(totalsSql, params),
    pool.query(byEstadoSql, params),
    pool.query(byMonedaSql, params),
  ]);

  const totalItems = Number(totalsResult.rows[0]?.total_items || 0);
  const totalPages = totalItems > 0 ? Math.ceil(totalItems / pageSize) : 0;

  return {
    items: itemsResult.rows,
    meta: {
      page,
      pageSize,
      totalItems,
      totalPages,
      hasNext: totalPages > 0 && page < totalPages,
      hasPrev: page > 1 && totalPages > 0,
      sortBy,
      sortDir,
    },
    summary: {
      totalItems,
      totalAmount: Number(totalsResult.rows[0]?.total_amount || 0),
      totalSaldoDisponible: Number(totalsResult.rows[0]?.total_saldo_disponible || 0),
      byEstado: byEstadoResult.rows.map((row) => ({
        estado: row.estado,
        totalItems: Number(row.total_items || 0),
        totalAmount: Number(row.total_amount || 0),
        totalSaldoDisponible: Number(row.total_saldo_disponible || 0),
      })),
      byMoneda: byMonedaResult.rows.map((row) => ({
        moneda: row.moneda,
        totalItems: Number(row.total_items || 0),
        totalAmount: Number(row.total_amount || 0),
        totalSaldoDisponible: Number(row.total_saldo_disponible || 0),
      })),
    },
  };
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

const listTiquetesElectronicos = async ({
  sociedadId,
  search,
  emisor,
  moneda,
  fechaDesde,
  fechaHasta,
  montoMin,
  montoMax,
  sortBy = 'fecha_emision',
  sortDir = 'desc',
  page = 1,
  pageSize = 50,
} = {}) => {
  const buildTiquetesBaseCte = () => `
    WITH tiquetes_enriquecidos AS (
      SELECT
        t.*,
        ${tiqueteMontoExpression} AS monto_total,
        ${tiqueteMonedaExpression} AS moneda,
        ${tiqueteEmisorNombreExpression} AS emisor_nombre,
        COALESCE(t.consecutivo::text, '') AS numero_documento,
        COALESCE(t.clave::text, '') AS clave_text
      FROM tiquetes_electronicos t
    )
  `;

  const buildTiquetesWhere = ({
    sociedadId: currentSociedadId,
    search: currentSearch,
    emisor: currentEmisor,
    moneda: currentMoneda,
    fechaDesde: currentFechaDesde,
    fechaHasta: currentFechaHasta,
    montoMin: currentMontoMin,
    montoMax: currentMontoMax,
  } = {}) => {
    const params = [];
    const clauses = [];

    if (currentSociedadId) {
      params.push(currentSociedadId);
      clauses.push(`te.sociedad_id = $${params.length}`);
    }

    if (currentSearch) {
      params.push(`%${String(currentSearch).toLowerCase()}%`);
      clauses.push(`
        (
          LOWER(te.emisor_nombre) LIKE $${params.length}
          OR LOWER(te.numero_documento) LIKE $${params.length}
          OR LOWER(te.clave_text) LIKE $${params.length}
        )
      `);
    }

    if (currentEmisor) {
      params.push(`%${String(currentEmisor).toLowerCase()}%`);
      clauses.push(`LOWER(te.emisor_nombre) LIKE $${params.length}`);
    }

    if (currentMoneda) {
      params.push(currentMoneda);
      clauses.push(`te.moneda = $${params.length}`);
    }

    if (currentFechaDesde) {
      params.push(currentFechaDesde);
      clauses.push(`te.fecha_emision::date >= $${params.length}::date`);
    }

    if (currentFechaHasta) {
      params.push(currentFechaHasta);
      clauses.push(`te.fecha_emision::date <= $${params.length}::date`);
    }

    if (currentMontoMin !== null && currentMontoMin !== undefined) {
      params.push(currentMontoMin);
      clauses.push(`te.monto_total >= $${params.length}`);
    }

    if (currentMontoMax !== null && currentMontoMax !== undefined) {
      params.push(currentMontoMax);
      clauses.push(`te.monto_total <= $${params.length}`);
    }

    return {
      params,
      whereClause: clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '',
    };
  };

  const buildTiquetesOrderBy = (currentSortBy, currentSortDir) => {
    switch (currentSortBy) {
      case 'emisor':
        return `LOWER(te.emisor_nombre) ${currentSortDir} NULLS LAST, te.fecha_emision DESC NULLS LAST, te.id DESC`;
      case 'monto':
        return `te.monto_total ${currentSortDir} NULLS LAST, te.fecha_emision DESC NULLS LAST, te.id DESC`;
      case 'fecha_emision':
      default:
        return `te.fecha_emision ${currentSortDir} NULLS LAST, te.id DESC`;
    }
  };

  const baseCte = buildTiquetesBaseCte();
  const { params, whereClause } = buildTiquetesWhere({
    sociedadId,
    search,
    emisor,
    moneda,
    fechaDesde,
    fechaHasta,
    montoMin,
    montoMax,
  });
  const orderByClause = buildTiquetesOrderBy(sortBy, sortDir);
  const offset = (page - 1) * pageSize;

  const itemsSql = `
    ${baseCte}
    SELECT te.*
    FROM tiquetes_enriquecidos te
    ${whereClause}
    ORDER BY ${orderByClause}
    LIMIT $${params.length + 1}
    OFFSET $${params.length + 2}
  `;

  const totalsSql = `
    ${baseCte}
    SELECT
      COUNT(*)::int AS total_items,
      COALESCE(SUM(te.monto_total), 0) AS total_amount
    FROM tiquetes_enriquecidos te
    ${whereClause}
  `;

  const byMonedaSql = `
    ${baseCte}
    SELECT
      COALESCE(te.moneda, 'CRC') AS moneda,
      COUNT(*)::int AS total_items,
      COALESCE(SUM(te.monto_total), 0) AS total_amount
    FROM tiquetes_enriquecidos te
    ${whereClause}
    GROUP BY COALESCE(te.moneda, 'CRC')
    ORDER BY COUNT(*) DESC, COALESCE(te.moneda, 'CRC') ASC
  `;

  const [itemsResult, totalsResult, byMonedaResult] = await Promise.all([
    pool.query(itemsSql, [...params, pageSize, offset]),
    pool.query(totalsSql, params),
    pool.query(byMonedaSql, params),
  ]);

  const totalItems = Number(totalsResult.rows[0]?.total_items || 0);
  const totalPages = totalItems > 0 ? Math.ceil(totalItems / pageSize) : 0;

  return {
    items: itemsResult.rows,
    meta: {
      page,
      pageSize,
      totalItems,
      totalPages,
      hasNext: totalPages > 0 && page < totalPages,
      hasPrev: page > 1 && totalPages > 0,
      sortBy,
      sortDir,
    },
    summary: {
      totalItems,
      totalAmount: Number(totalsResult.rows[0]?.total_amount || 0),
      byMoneda: byMonedaResult.rows.map((row) => ({
        moneda: row.moneda,
        totalItems: Number(row.total_items || 0),
        totalAmount: Number(row.total_amount || 0),
      })),
    },
  };
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
