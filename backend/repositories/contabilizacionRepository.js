const pool = require('../db');
const { resolveFacturaEstadoTransitionDomain } = require('../domain/facturas');
const { createFacturaEstadoHistorial } = require('./facturaEstadoHistorialStore');

const getDb = (client) => client || pool;

const getClient = () => pool.connect();

const getContabilizacionByFacturaId = async (facturaId, client) => {
  const { rows } = await getDb(client).query(
    `
    SELECT
      fc.*,
      tp.nombre AS tabla_pago_nombre,
      tp.ruta_pdf AS tabla_pago_ruta_pdf,
      oc.nombre AS orden_compra_nombre,
      oc.ruta_pdf AS orden_compra_ruta_pdf,
      oc.monto AS orden_compra_monto,
      oc.moneda AS orden_compra_moneda,
      oc.estado AS orden_compra_estado,
      nc.clave AS nota_credito_clave,
      nc.ruta_pdf AS nota_credito_ruta_pdf,
      nc.ruta_xml AS nota_credito_ruta_xml,
      COALESCE(
        NULLIF(nc.xml_completo #>> '{ResumenFactura,TotalComprobante}', ''),
        NULLIF(nc.xml_completo #>> '{ResumenNotaCredito,TotalComprobante}', ''),
        '0'
      ) AS nota_credito_total_comprobante,
      GREATEST(COALESCE(fc.retencion, 0) - COALESCE(fc.retencion_pagada, 0), 0) AS retencion_pendiente
    FROM facturas_contabilizacion fc
    LEFT JOIN tablas_pago tp ON tp.id = fc.tabla_pago_id
    LEFT JOIN ordenes_compra oc ON oc.id = fc.orden_compra_id
    LEFT JOIN notas_credito nc ON nc.id = fc.nota_credito_id
    WHERE fc.factura_id = $1
    `,
    [facturaId]
  );

  return rows[0] || null;
};

const listDocumentosRespaldoByFacturaId = async (facturaId, client) => {
  const { rows } = await getDb(client).query(
    `
    SELECT
      dr.id,
      dr.factura_id,
      dr.nombre_archivo,
      dr.ruta_pdf,
      dr.metadata,
      dr.creado_por,
      dr.creado_en,
      dr.actualizado_en
    FROM facturas_contabilizacion_documentos_respaldo dr
    WHERE dr.factura_id = $1
    ORDER BY dr.creado_en ASC, dr.id ASC
    `,
    [facturaId]
  );

  return rows;
};

const listRetencionPagosByFacturaId = async (facturaId, client) => {
  const { rows } = await getDb(client).query(
    `
    SELECT
      rp.id,
      rp.factura_id,
      rp.contabilizacion_id,
      rp.monto,
      rp.fecha_pago,
      rp.usuario,
      rp.notas,
      rp.creado_en
    FROM facturas_retenciones_pagos rp
    WHERE rp.factura_id = $1
    ORDER BY rp.fecha_pago DESC, rp.id DESC
    `,
    [facturaId]
  );

  return rows;
};

const getFacturaById = async (facturaId, client) => {
  const { rows } = await getDb(client).query(
    'SELECT id, estado, sociedad_id, emisor, resumen FROM facturas WHERE id = $1',
    [facturaId]
  );

  return rows[0] || null;
};

const getProveedorById = async (proveedorId, client) => {
  const { rows } = await getDb(client).query(
    `SELECT id, sociedad_id, identificacion_numero
     FROM proveedores
     WHERE id = $1`,
    [proveedorId]
  );

  return rows[0] || null;
};

const getProveedorBySociedadAndIdentificacion = async ({
  sociedadId,
  identificacionNumeroNormalizado
}, client) => {
  const { rows } = await getDb(client).query(
    `SELECT id, sociedad_id, identificacion_numero
     FROM proveedores
     WHERE sociedad_id = $1
       AND identificacion_numero_normalizado = $2`,
    [sociedadId, identificacionNumeroNormalizado]
  );

  return rows[0] || null;
};

const getTablaPagoById = async (tablaPagoId, client) => {
  const { rows } = await getDb(client).query(
    `SELECT id, sociedad_id, proveedor_id, nombre, ruta_pdf
     FROM tablas_pago
     WHERE id = $1`,
    [tablaPagoId]
  );

  return rows[0] || null;
};

const getOrdenCompraById = async (ordenCompraId, client) => {
  const { rows } = await getDb(client).query(
    `SELECT
       id,
       sociedad_id,
       proveedor_id,
       nombre,
       monto,
       moneda,
       estado,
       ruta_pdf
     FROM ordenes_compra
     WHERE id = $1`,
    [ordenCompraId]
  );

  return rows[0] || null;
};

const getNotaCreditoById = async (notaCreditoId, client) => {
  const { rows } = await getDb(client).query(
    `SELECT
       n.id,
       n.sociedad_id,
       n.clave,
       n.ruta_pdf,
       n.ruta_xml,
       COALESCE(
         NULLIF(n.xml_completo #>> '{ResumenFactura,TotalComprobante}', ''),
         NULLIF(n.xml_completo #>> '{ResumenNotaCredito,TotalComprobante}', ''),
         '0'
       ) AS total_comprobante,
       COALESCE(
         n.xml_completo #>> '{Emisor,Identificacion,Numero}',
         n.xml_completo #>> '{emisor,identificacion,numero}'
       ) AS emisor_identificacion_numero
     FROM notas_credito n
     WHERE n.id = $1`,
    [notaCreditoId]
  );

  return rows[0] || null;
};

const getContabilizacionRetencionByFacturaIdForUpdate = async (facturaId, client) => {
  const { rows } = await getDb(client).query(
    `
    SELECT
      id,
      factura_id,
      COALESCE(retencion, 0) AS retencion,
      COALESCE(retencion_pagada, 0) AS retencion_pagada
    FROM facturas_contabilizacion
    WHERE factura_id = $1
    FOR UPDATE
    `,
    [facturaId]
  );

  return rows[0] || null;
};

const normalizeRetencionStateByFacturaId = async (facturaId, client) => {
  const { rows } = await getDb(client).query(
    `
    UPDATE facturas_contabilizacion
    SET
      retencion_pagada = LEAST(
        GREATEST(COALESCE(retencion_pagada, 0), 0),
        GREATEST(COALESCE(retencion, 0), 0)
      ),
      estado_retencion = CASE
        WHEN GREATEST(COALESCE(retencion, 0), 0) = 0 THEN 'pagada'
        WHEN LEAST(
          GREATEST(COALESCE(retencion_pagada, 0), 0),
          GREATEST(COALESCE(retencion, 0), 0)
        ) = 0 THEN 'pendiente'
        WHEN LEAST(
          GREATEST(COALESCE(retencion_pagada, 0), 0),
          GREATEST(COALESCE(retencion, 0), 0)
        ) >= GREATEST(COALESCE(retencion, 0), 0) THEN 'pagada'
        ELSE 'parcial'
      END,
      fecha_ultimo_pago_retencion = CASE
        WHEN LEAST(
          GREATEST(COALESCE(retencion_pagada, 0), 0),
          GREATEST(COALESCE(retencion, 0), 0)
        ) > 0 THEN fecha_ultimo_pago_retencion
        ELSE NULL
      END,
      actualizado_en = CURRENT_TIMESTAMP
    WHERE factura_id = $1
    RETURNING *
    `,
    [facturaId]
  );

  return rows[0] || null;
};

const upsertContabilizacion = async ({
  facturaId,
  fecha_documento,
  fecha_vencimiento,
  fecha_contabilizacion,
  plazo_credito,
  retencion,
  descuento,
  anticipo_aplicado,
  monto_nota_credito,
  centro_costo,
  cuenta_contable,
  proyecto,
  orden_compra,
  orden_compra_id,
  numero_proveedor,
  proveedor_id,
  tabla_pago_id,
  nota_credito_id,
  notas,
  metadata,
  usuario
}, client) => {
  const toNullable = (value) => (
    value === '' || value === undefined || value === null
      ? null
      : value
  );

  const { rows } = await getDb(client).query(
    `
    INSERT INTO facturas_contabilizacion (
      factura_id,
      fecha_documento,
      fecha_vencimiento,
      fecha_contabilizacion,
      plazo_credito,
      retencion,
      descuento,
      anticipo_aplicado,
      monto_nota_credito,
      centro_costo,
      cuenta_contable,
      proyecto,
      orden_compra,
      orden_compra_id,
      numero_proveedor,
      proveedor_id,
      tabla_pago_id,
      nota_credito_id,
      notas,
      metadata,
      creado_por
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
    ON CONFLICT (factura_id)
    DO UPDATE SET
      fecha_documento = EXCLUDED.fecha_documento,
      fecha_vencimiento = EXCLUDED.fecha_vencimiento,
      fecha_contabilizacion = EXCLUDED.fecha_contabilizacion,
      plazo_credito = EXCLUDED.plazo_credito,
      retencion = EXCLUDED.retencion,
      descuento = EXCLUDED.descuento,
      anticipo_aplicado = EXCLUDED.anticipo_aplicado,
      monto_nota_credito = EXCLUDED.monto_nota_credito,
      centro_costo = EXCLUDED.centro_costo,
      cuenta_contable = EXCLUDED.cuenta_contable,
      proyecto = EXCLUDED.proyecto,
      orden_compra = EXCLUDED.orden_compra,
      orden_compra_id = EXCLUDED.orden_compra_id,
      numero_proveedor = EXCLUDED.numero_proveedor,
      proveedor_id = EXCLUDED.proveedor_id,
      tabla_pago_id = EXCLUDED.tabla_pago_id,
      nota_credito_id = EXCLUDED.nota_credito_id,
      notas = EXCLUDED.notas,
      metadata = EXCLUDED.metadata,
      creado_por = EXCLUDED.creado_por,
      actualizado_en = CURRENT_TIMESTAMP
    RETURNING *
    `,
    [
      facturaId,
      toNullable(fecha_documento),
      toNullable(fecha_vencimiento),
      toNullable(fecha_contabilizacion),
      toNullable(plazo_credito),
      toNullable(retencion),
      toNullable(descuento),
      toNullable(anticipo_aplicado),
      toNullable(monto_nota_credito),
      toNullable(centro_costo),
      toNullable(cuenta_contable),
      toNullable(proyecto),
      toNullable(orden_compra),
      toNullable(orden_compra_id),
      toNullable(numero_proveedor),
      toNullable(proveedor_id),
      toNullable(tabla_pago_id),
      toNullable(nota_credito_id),
      toNullable(notas),
      toNullable(metadata),
      toNullable(usuario)
    ]
  );

  return rows[0] || null;
};

const createDocumentoRespaldo = async ({
  facturaId,
  nombreArchivo,
  rutaPdf,
  metadata,
  creadoPor
}, client) => {
  const { rows } = await getDb(client).query(
    `
    INSERT INTO facturas_contabilizacion_documentos_respaldo (
      factura_id,
      nombre_archivo,
      ruta_pdf,
      metadata,
      creado_por
    )
    VALUES ($1,$2,$3,$4,$5)
    RETURNING *
    `,
    [
      facturaId,
      nombreArchivo,
      rutaPdf,
      metadata || null,
      creadoPor || null
    ]
  );

  return rows[0] || null;
};

const getDocumentoRespaldoById = async ({
  facturaId,
  documentoId
}, client) => {
  const { rows } = await getDb(client).query(
    `
    SELECT *
    FROM facturas_contabilizacion_documentos_respaldo
    WHERE id = $1
      AND factura_id = $2
    `,
    [documentoId, facturaId]
  );

  return rows[0] || null;
};

const deleteDocumentoRespaldoById = async (documentoId, client) => {
  const { rows } = await getDb(client).query(
    `
    DELETE FROM facturas_contabilizacion_documentos_respaldo
    WHERE id = $1
    RETURNING *
    `,
    [documentoId]
  );

  return rows[0] || null;
};

const insertRetencionPago = async ({
  facturaId,
  contabilizacionId,
  monto,
  fecha_pago,
  usuario,
  notas
}, client) => {
  const { rows } = await getDb(client).query(
    `
    INSERT INTO facturas_retenciones_pagos (
      factura_id,
      contabilizacion_id,
      monto,
      fecha_pago,
      usuario,
      notas
    )
    VALUES ($1,$2,$3,$4,$5,$6)
    RETURNING *
    `,
    [
      facturaId,
      contabilizacionId || null,
      monto,
      fecha_pago || null,
      usuario || null,
      notas || null
    ]
  );

  return rows[0] || null;
};

const applyRetencionPago = async ({ facturaId, monto, fecha_pago }, client) => {
  const { rows } = await getDb(client).query(
    `
    UPDATE facturas_contabilizacion
    SET
      retencion_pagada = LEAST(
        GREATEST(COALESCE(retencion_pagada, 0) + $2, 0),
        GREATEST(COALESCE(retencion, 0), 0)
      ),
      estado_retencion = CASE
        WHEN GREATEST(COALESCE(retencion, 0), 0) = 0 THEN 'pagada'
        WHEN LEAST(
          GREATEST(COALESCE(retencion_pagada, 0) + $2, 0),
          GREATEST(COALESCE(retencion, 0), 0)
        ) >= GREATEST(COALESCE(retencion, 0), 0) THEN 'pagada'
        WHEN LEAST(
          GREATEST(COALESCE(retencion_pagada, 0) + $2, 0),
          GREATEST(COALESCE(retencion, 0), 0)
        ) > 0 THEN 'parcial'
        ELSE 'pendiente'
      END,
      fecha_ultimo_pago_retencion = $3,
      actualizado_en = CURRENT_TIMESTAMP
    WHERE factura_id = $1
    RETURNING *
    `,
    [facturaId, monto, fecha_pago || null]
  );

  return rows[0] || null;
};

const updateFacturaEstado = async ({ facturaId, estado }, client) => {
  await getDb(client).query(
    'UPDATE facturas SET estado = $1 WHERE id = $2',
    [estado, facturaId]
  );
};

const insertEstadoDocumento = async ({
  facturaId,
  estadoAnterior,
  estadoNuevo,
  dominio,
  usuario,
  motivo
}, client) => {
  const dominioFinal = dominio || resolveFacturaEstadoTransitionDomain({
    estadoAnterior,
    estadoNuevo
  });

  await createFacturaEstadoHistorial({
    facturaId,
    dominio: dominioFinal,
    estadoAnterior,
    estadoNuevo,
    usuario: usuario || null,
    motivo: motivo || null
  }, client);
};

const refreshEstadoOrdenCompraById = async (ordenCompraId, client) => {
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
      SELECT COALESCE(SUM(
        CASE
          WHEN COALESCE(f.resumen->>'TotalComprobante', '') ~ '^-?[0-9]+(\\.[0-9]+)?$'
            THEN (f.resumen->>'TotalComprobante')::numeric
          ELSE 0
        END
      ), 0) AS total_consumido
      FROM facturas_contabilizacion fc
      JOIN facturas f ON f.id = fc.factura_id
      WHERE fc.orden_compra_id = $1
    ) consumo
    WHERE oc.id = $1
    RETURNING
      oc.id,
      oc.estado,
      oc.monto
    `,
    [ordenCompraId]
  );

  return rows[0] || null;
};

module.exports = {
  getClient,
  getContabilizacionByFacturaId,
  listDocumentosRespaldoByFacturaId,
  listRetencionPagosByFacturaId,
  getFacturaById,
  getProveedorById,
  getProveedorBySociedadAndIdentificacion,
  getTablaPagoById,
  getOrdenCompraById,
  getNotaCreditoById,
  getContabilizacionRetencionByFacturaIdForUpdate,
  normalizeRetencionStateByFacturaId,
  upsertContabilizacion,
  createDocumentoRespaldo,
  getDocumentoRespaldoById,
  deleteDocumentoRespaldoById,
  insertRetencionPago,
  applyRetencionPago,
  updateFacturaEstado,
  insertEstadoDocumento,
  refreshEstadoOrdenCompraById
};
