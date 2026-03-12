const pool = require('../db');

const getDb = (client) => client || pool;

const TOTAL_FACTURA_EXPRESSION = `
  CASE
    WHEN COALESCE(f.resumen->>'TotalComprobante', '') ~ '^-?[0-9]+(\\.[0-9]+)?$'
      THEN (f.resumen->>'TotalComprobante')::numeric
    ELSE 0
  END
`;

const ORDEN_COMPRA_SELECT = `
  oc.id,
  oc.sociedad_id,
  oc.proveedor_id,
  oc.nombre,
  oc.monto,
  oc.moneda,
  oc.estado,
  oc.fecha,
  oc.ruta_pdf,
  oc.creado_por,
  oc.metadata,
  oc.creado_en,
  oc.actualizado_en,
  COALESCE(consumo.total_consumido, 0) AS monto_consumido,
  GREATEST(oc.monto - COALESCE(consumo.total_consumido, 0), 0) AS monto_disponible,
  COALESCE(consumo.facturas_asociadas, 0) AS facturas_asociadas
`;

const CONSUMO_LATERAL_JOIN = `
  LEFT JOIN LATERAL (
    SELECT
      COALESCE(SUM(${TOTAL_FACTURA_EXPRESSION}), 0) AS total_consumido,
      COUNT(fc.factura_id)::int AS facturas_asociadas
    FROM facturas_contabilizacion fc
    JOIN facturas f ON f.id = fc.factura_id
    WHERE fc.orden_compra_id = oc.id
  ) consumo ON TRUE
`;

const listOrdenesCompra = async ({ sociedadId, proveedorId, estado }, client) => {
  const params = [sociedadId];
  const whereClauses = ['oc.sociedad_id = $1'];

  if (proveedorId) {
    params.push(proveedorId);
    whereClauses.push(`oc.proveedor_id = $${params.length}`);
  }

  if (estado) {
    params.push(estado);
    whereClauses.push(`oc.estado = $${params.length}`);
  }

  const { rows } = await getDb(client).query(
    `
    SELECT ${ORDEN_COMPRA_SELECT}
    FROM ordenes_compra oc
    ${CONSUMO_LATERAL_JOIN}
    WHERE ${whereClauses.join(' AND ')}
    ORDER BY oc.fecha DESC NULLS LAST, oc.creado_en DESC
    `,
    params
  );

  return rows;
};

const getOrdenCompraById = async (id, client) => {
  const { rows } = await getDb(client).query(
    `
    SELECT ${ORDEN_COMPRA_SELECT}
    FROM ordenes_compra oc
    ${CONSUMO_LATERAL_JOIN}
    WHERE oc.id = $1
    `,
    [id]
  );

  return rows[0] || null;
};

const getOrdenCompraByIdAndSociedad = async ({ id, sociedadId }, client) => {
  const { rows } = await getDb(client).query(
    `
    SELECT ${ORDEN_COMPRA_SELECT}
    FROM ordenes_compra oc
    ${CONSUMO_LATERAL_JOIN}
    WHERE oc.id = $1
      AND oc.sociedad_id = $2
    `,
    [id, sociedadId]
  );

  return rows[0] || null;
};

const createOrdenCompra = async ({
  sociedadId,
  proveedorId,
  nombre,
  monto,
  moneda,
  fecha,
  rutaPdf,
  creadoPor,
  metadata
}, client) => {
  const { rows } = await getDb(client).query(
    `
    INSERT INTO ordenes_compra (
      sociedad_id,
      proveedor_id,
      nombre,
      monto,
      moneda,
      estado,
      fecha,
      ruta_pdf,
      creado_por,
      metadata
    )
    VALUES ($1,$2,$3,$4,$5,'abierta',$6,$7,$8,$9)
    RETURNING id
    `,
    [
      sociedadId,
      proveedorId,
      nombre,
      monto,
      moneda,
      fecha,
      rutaPdf,
      creadoPor,
      metadata || null
    ]
  );

  if (!rows[0]) {
    return null;
  }

  return getOrdenCompraById(rows[0].id, client);
};

const updateOrdenCompraEstado = async ({ id, estado }, client) => {
  const { rows } = await getDb(client).query(
    `
    UPDATE ordenes_compra oc
    SET
      estado = $2,
      actualizado_en = CURRENT_TIMESTAMP
    WHERE oc.id = $1
    RETURNING oc.id
    `,
    [id, estado]
  );

  if (!rows[0]) {
    return null;
  }

  return getOrdenCompraById(rows[0].id, client);
};

const countFacturasAsociadas = async (ordenCompraId, client) => {
  const { rows } = await getDb(client).query(
    `
    SELECT COUNT(*)::int AS total
    FROM facturas_contabilizacion
    WHERE orden_compra_id = $1
    `,
    [ordenCompraId]
  );

  return rows[0]?.total || 0;
};

const deleteOrdenCompraById = async (id, client) => {
  const { rows } = await getDb(client).query(
    `
    DELETE FROM ordenes_compra oc
    WHERE oc.id = $1
    RETURNING
      oc.id,
      oc.sociedad_id,
      oc.proveedor_id,
      oc.nombre,
      oc.monto,
      oc.moneda,
      oc.estado,
      oc.fecha,
      oc.ruta_pdf,
      oc.creado_por,
      oc.metadata,
      oc.creado_en,
      oc.actualizado_en
    `,
    [id]
  );

  return rows[0] || null;
};

const refreshEstadoByConsumo = async (ordenCompraId, client) => {
  const { rows } = await getDb(client).query(
    `
    UPDATE ordenes_compra oc
    SET
      estado = CASE
        WHEN COALESCE(consumo.total_consumido, 0) >= COALESCE(oc.monto, 0)
          THEN 'cerrada'
        ELSE 'abierta'
      END,
      actualizado_en = CURRENT_TIMESTAMP
    FROM (
      SELECT COALESCE(SUM(${TOTAL_FACTURA_EXPRESSION}), 0) AS total_consumido
      FROM facturas_contabilizacion fc
      JOIN facturas f ON f.id = fc.factura_id
      WHERE fc.orden_compra_id = $1
    ) consumo
    WHERE oc.id = $1
    RETURNING oc.id
    `,
    [ordenCompraId]
  );

  if (!rows[0]) {
    return null;
  }

  return getOrdenCompraById(rows[0].id, client);
};

module.exports = {
  listOrdenesCompra,
  getOrdenCompraById,
  getOrdenCompraByIdAndSociedad,
  createOrdenCompra,
  updateOrdenCompraEstado,
  countFacturasAsociadas,
  deleteOrdenCompraById,
  refreshEstadoByConsumo
};
