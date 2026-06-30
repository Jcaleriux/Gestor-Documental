const pool = require('../db');
const { tesoreriaActivaSql, buildTesoreriaResetQuery } = require('../services/tramitesPagoQueries');
const { TESORERIA_ESTADOS, TRAMITE_ESTADOS, DOCUMENTO_ESTADOS } = require('../domain/tramitesPago');
const { FACTURA_ESTADOS } = require('../domain/facturas');
const {
  createFacturaWorkflowPagoJoin,
  createFacturaEstadoOperativoExpression,
  isFacturaWorkflowPagoEstado
} = require('./sqlFacturaEstado');
const { addSociedadScopeClause } = require('./sociedadScopeSql');
const {
  createTotalFacturaExpression,
  createRebajosAplicadosExpression,
  createRetencionTotalExpression,
  createRetencionPendienteExpression,
  createPagosFacturaExpression,
  createTotalPagoPrincipalExpression,
  createTotalPendienteGlobalExpression
} = require('./sqlMontosFactura');

const totalFacturaExpression = createTotalFacturaExpression({ facturaAlias: 'f' });
const totalRebajosExpression = createRebajosAplicadosExpression({ contaAlias: 'fc' });
const retencionTotalExpression = createRetencionTotalExpression({ contaAlias: 'fc' });
const retencionPendienteExpression = createRetencionPendienteExpression({ contaAlias: 'fc' });
const pagosFacturaExpression = createPagosFacturaExpression({ facturaAlias: 'f' });
const totalPagoPrincipalExpression = createTotalPagoPrincipalExpression({ facturaAlias: 'f', contaAlias: 'fc' });
const totalPendienteGlobalExpression = createTotalPendienteGlobalExpression({ facturaAlias: 'f', contaAlias: 'fc' });
const facturaWorkflowPagoJoin = createFacturaWorkflowPagoJoin({ facturaAlias: 'f', workflowAlias: 'fwp' });
const facturaEstadoOperativoExpression = createFacturaEstadoOperativoExpression({
  facturaAlias: 'f',
  workflowAlias: 'fwp'
});
const ETAPA_ESTADO_COLUMN_MAP = Object.freeze({
  gerencia: 'estado_gerencia',
  gerencia_contable: 'estado_gerencia_contable',
  financiera: 'estado_financiero'
});

const getDb = (client) => client || pool;

const getClient = () => pool.connect();
const pickValue = (primary, fallback = null) => (
  primary !== undefined ? primary : fallback
);

const normalizePositiveIntOrNull = (value) => {
  const normalized = Number(value);
  return Number.isInteger(normalized) && normalized > 0 ? normalized : null;
};

const getTramiteEstado = async (tramiteId, client) => {
  const { rows } = await getDb(client).query(
    'SELECT estado, sociedad_id FROM tramites_pago WHERE id = $1',
    [tramiteId]
  );
  return rows[0] || null;
};

const getTramiteById = async (tramiteId, client) => {
  const { rows } = await getDb(client).query('SELECT * FROM tramites_pago WHERE id = $1', [tramiteId]);
  return rows[0] || null;
};

const getSociedadById = async (sociedadId, client) => {
  const { rows } = await getDb(client).query(
    `
    SELECT id, codigo, nombre_proyecto, razon_social, cedula_juridica, activo
    FROM sociedades
    WHERE id = $1
    `,
    [sociedadId]
  );
  return rows[0] || null;
};

const getTramiteByIdForUpdate = async (tramiteId, client) => {
  const { rows } = await getDb(client).query(
    'SELECT * FROM tramites_pago WHERE id = $1 FOR UPDATE',
    [tramiteId]
  );
  return rows[0] || null;
};

const getTramiteCaratulaByTramiteId = async (tramiteId, client) => {
  const { rows } = await getDb(client).query(
    `
    SELECT *
    FROM tramites_pago_caratulas
    WHERE tramite_id = $1
    `,
    [tramiteId]
  );
  return rows[0] || null;
};

const upsertTramiteCaratula = async ({
  tramiteId,
  nombreArchivo,
  rutaArchivo,
  estado,
  fechaEjecucion,
  sociedadNombreRaw,
  sociedadIdentificacionRaw,
  moneda,
  totalPaginas,
  warnings,
  parsedPayload,
  cargadoPor,
  procesadoEn
}, client) => {
  const { rows } = await getDb(client).query(
    `
    INSERT INTO tramites_pago_caratulas (
      tramite_id,
      nombre_archivo,
      ruta_archivo,
      estado,
      fecha_ejecucion,
      sociedad_nombre_raw,
      sociedad_identificacion_raw,
      moneda,
      total_paginas,
      warnings,
      parsed_payload,
      cargado_por,
      procesado_en
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11::jsonb, $12, $13)
    ON CONFLICT (tramite_id)
    DO UPDATE SET
      nombre_archivo = EXCLUDED.nombre_archivo,
      ruta_archivo = EXCLUDED.ruta_archivo,
      estado = EXCLUDED.estado,
      fecha_ejecucion = EXCLUDED.fecha_ejecucion,
      sociedad_nombre_raw = EXCLUDED.sociedad_nombre_raw,
      sociedad_identificacion_raw = EXCLUDED.sociedad_identificacion_raw,
      moneda = EXCLUDED.moneda,
      total_paginas = EXCLUDED.total_paginas,
      warnings = EXCLUDED.warnings,
      parsed_payload = EXCLUDED.parsed_payload,
      cargado_por = EXCLUDED.cargado_por,
      procesado_en = EXCLUDED.procesado_en,
      actualizado_en = CURRENT_TIMESTAMP
    RETURNING *
    `,
    [
      tramiteId,
      nombreArchivo,
      rutaArchivo,
      estado,
      fechaEjecucion || null,
      sociedadNombreRaw || null,
      sociedadIdentificacionRaw || null,
      moneda || null,
      Number(totalPaginas || 0),
      JSON.stringify(Array.isArray(warnings) ? warnings : []),
      JSON.stringify(parsedPayload && typeof parsedPayload === 'object' ? parsedPayload : {}),
      cargadoPor || null,
      procesadoEn || null
    ]
  );
  return rows[0] || null;
};

const listTramiteCaratulaProvidersByTramiteId = async (tramiteId, client) => {
  const { rows } = await getDb(client).query(
    `
    SELECT *
    FROM tramites_pago_caratulas_proveedor
    WHERE tramite_id = $1
    ORDER BY proveedor_nombre ASC, id ASC
    `,
    [tramiteId]
  );
  return rows;
};

const listTramiteCaratulaProviderFacturasByTramiteId = async (tramiteId, client) => {
  const { rows } = await getDb(client).query(
    `
    SELECT
      pcf.*,
      tcp.provider_key,
      tcp.tramite_id
    FROM tramites_pago_caratulas_proveedor_facturas pcf
    JOIN tramites_pago_caratulas_proveedor tcp
      ON tcp.id = pcf.provider_caratula_id
    WHERE tcp.tramite_id = $1
    ORDER BY pcf.provider_caratula_id ASC, pcf.sort_index ASC
    `,
    [tramiteId]
  );
  return rows;
};

const listTramiteCaratulaOrphansByTramiteId = async (tramiteId, client) => {
  const { rows } = await getDb(client).query(
    `
    SELECT *
    FROM tramites_pago_caratulas_huerfanas
    WHERE tramite_id = $1
    ORDER BY id ASC
    `,
    [tramiteId]
  );
  return rows;
};

const getTramiteCaratulaProviderByKeyForUpdate = async ({ tramiteId, providerKey }, client) => {
  const { rows } = await getDb(client).query(
    `
    SELECT *
    FROM tramites_pago_caratulas_proveedor
    WHERE tramite_id = $1
      AND provider_key = $2
    FOR UPDATE
    `,
    [tramiteId, providerKey]
  );
  return rows[0] || null;
};

const getTramiteCaratulaOrphanByIdForUpdate = async ({ tramiteId, orphanId }, client) => {
  const { rows } = await getDb(client).query(
    `
    SELECT *
    FROM tramites_pago_caratulas_huerfanas
    WHERE tramite_id = $1
      AND id = $2
    FOR UPDATE
    `,
    [tramiteId, orphanId]
  );
  return rows[0] || null;
};

const upsertTramiteCaratulaProvider = async (payload, client) => {
  const {
    tramiteId,
    providerKey,
    proveedorId,
    proveedorNombre,
    proveedorIdentificacion,
    providerRawName,
    providerRawIdentification,
    providerCode,
    nombreArchivo,
    rutaArchivo,
    attachmentStatus,
    attachmentOrigin,
    orderStatus,
    executionDate,
    currency,
    pageStart,
    pageEnd,
    pageNumbers,
    warnings,
    groupPayload,
    orderConfirmedBy,
    orderConfirmedAt,
    attachmentConfirmedBy,
    attachmentConfirmedAt
  } = payload || {};
  const normalizedProviderKey = pickValue(providerKey, payload?.provider_key);
  const normalizedProveedorId = pickValue(proveedorId, payload?.proveedor_id);
  const normalizedProveedorNombre = pickValue(proveedorNombre, payload?.proveedor_nombre);
  const normalizedProveedorIdentificacion = pickValue(proveedorIdentificacion, payload?.proveedor_identificacion);
  const normalizedProviderRawName = pickValue(providerRawName, payload?.provider_raw_name);
  const normalizedProviderRawIdentification = pickValue(providerRawIdentification, payload?.provider_raw_identification);
  const normalizedProviderCode = pickValue(providerCode, payload?.provider_code);
  const normalizedNombreArchivo = pickValue(nombreArchivo, payload?.nombre_archivo);
  const normalizedRutaArchivo = pickValue(rutaArchivo, payload?.ruta_archivo);
  const normalizedAttachmentStatus = pickValue(attachmentStatus, payload?.attachment_status);
  const normalizedAttachmentOrigin = pickValue(attachmentOrigin, payload?.attachment_origin);
  const normalizedOrderStatus = pickValue(orderStatus, payload?.order_status);
  const normalizedExecutionDate = pickValue(executionDate, payload?.execution_date);
  const normalizedCurrency = pickValue(currency, payload?.currency);
  const normalizedPageStart = pickValue(pageStart, payload?.page_start);
  const normalizedPageEnd = pickValue(pageEnd, payload?.page_end);
  const normalizedPageNumbers = pickValue(pageNumbers, payload?.page_numbers);
  const normalizedWarnings = pickValue(warnings, payload?.warnings);
  const normalizedGroupPayload = pickValue(groupPayload, payload?.group_payload);
  const normalizedOrderConfirmedBy = pickValue(orderConfirmedBy, payload?.order_confirmed_by);
  const normalizedOrderConfirmedAt = pickValue(orderConfirmedAt, payload?.order_confirmed_at);
  const normalizedAttachmentConfirmedBy = pickValue(attachmentConfirmedBy, payload?.attachment_confirmed_by);
  const normalizedAttachmentConfirmedAt = pickValue(attachmentConfirmedAt, payload?.attachment_confirmed_at);

  const { rows } = await getDb(client).query(
    `
    INSERT INTO tramites_pago_caratulas_proveedor (
      tramite_id,
      provider_key,
      proveedor_id,
      proveedor_nombre,
      proveedor_identificacion,
      provider_raw_name,
      provider_raw_identification,
      provider_code,
      nombre_archivo,
      ruta_archivo,
      attachment_status,
      attachment_origin,
      order_status,
      execution_date,
      currency,
      page_start,
      page_end,
      page_numbers,
      warnings,
      group_payload,
      order_confirmed_by,
      order_confirmed_at,
      attachment_confirmed_by,
      attachment_confirmed_at
    )
    VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8,
      $9, $10, $11, $12, $13, $14, $15, $16,
      $17, $18::jsonb, $19::jsonb, $20::jsonb, $21, $22, $23, $24
    )
    ON CONFLICT (tramite_id, provider_key)
    DO UPDATE SET
      proveedor_id = EXCLUDED.proveedor_id,
      proveedor_nombre = EXCLUDED.proveedor_nombre,
      proveedor_identificacion = EXCLUDED.proveedor_identificacion,
      provider_raw_name = EXCLUDED.provider_raw_name,
      provider_raw_identification = EXCLUDED.provider_raw_identification,
      provider_code = EXCLUDED.provider_code,
      nombre_archivo = EXCLUDED.nombre_archivo,
      ruta_archivo = EXCLUDED.ruta_archivo,
      attachment_status = EXCLUDED.attachment_status,
      attachment_origin = EXCLUDED.attachment_origin,
      order_status = EXCLUDED.order_status,
      execution_date = EXCLUDED.execution_date,
      currency = EXCLUDED.currency,
      page_start = EXCLUDED.page_start,
      page_end = EXCLUDED.page_end,
      page_numbers = EXCLUDED.page_numbers,
      warnings = EXCLUDED.warnings,
      group_payload = EXCLUDED.group_payload,
      order_confirmed_by = EXCLUDED.order_confirmed_by,
      order_confirmed_at = EXCLUDED.order_confirmed_at,
      attachment_confirmed_by = EXCLUDED.attachment_confirmed_by,
      attachment_confirmed_at = EXCLUDED.attachment_confirmed_at,
      actualizado_en = CURRENT_TIMESTAMP
    RETURNING *
    `,
    [
      tramiteId,
      normalizedProviderKey,
      normalizedProveedorId || null,
      normalizedProveedorNombre,
      normalizedProveedorIdentificacion || null,
      normalizedProviderRawName || null,
      normalizedProviderRawIdentification || null,
      normalizedProviderCode || null,
      normalizedNombreArchivo || null,
      normalizedRutaArchivo || null,
      normalizedAttachmentStatus,
      normalizedAttachmentOrigin || null,
      normalizedOrderStatus,
      normalizedExecutionDate || null,
      normalizedCurrency || null,
      normalizedPageStart || null,
      normalizedPageEnd || null,
      JSON.stringify(Array.isArray(normalizedPageNumbers) ? normalizedPageNumbers : []),
      JSON.stringify(Array.isArray(normalizedWarnings) ? normalizedWarnings : []),
      JSON.stringify(normalizedGroupPayload && typeof normalizedGroupPayload === 'object' ? normalizedGroupPayload : {}),
      normalizedOrderConfirmedBy || null,
      normalizedOrderConfirmedAt || null,
      normalizedAttachmentConfirmedBy || null,
      normalizedAttachmentConfirmedAt || null
    ]
  );
  return rows[0] || null;
};

const replaceTramiteCaratulaProviderFacturas = async ({
  providerCaratulaId,
  rows = []
}, client) => {
  await getDb(client).query(
    `
    DELETE FROM tramites_pago_caratulas_proveedor_facturas
    WHERE provider_caratula_id = $1
    `,
    [providerCaratulaId]
  );

  for (const row of rows) {
    await getDb(client).query(
      `
      INSERT INTO tramites_pago_caratulas_proveedor_facturas (
        provider_caratula_id,
        factura_id,
        sort_index,
        order_source
      )
      VALUES ($1, $2, $3, $4)
      `,
      [
        providerCaratulaId,
        Number(row.factura_id),
        Number(row.sort_index),
        row.order_source || 'manual'
      ]
    );
  }
};

const insertTramiteCaratulaOrphan = async (payload, client) => {
  const {
    tramiteId,
    providerRawName,
    providerRawIdentification,
    providerCode,
    nombreArchivo,
    rutaArchivo,
    executionDate,
    currency,
    pageStart,
    pageEnd,
    pageNumbers,
    warnings,
    groupPayload,
    status = 'pendiente',
    assignedProviderCaratulaId = null,
    assignedBy = null,
    assignedAt = null,
    discardedBy = null,
    discardedAt = null
  } = payload || {};
  const normalizedProviderRawName = pickValue(providerRawName, payload?.provider_raw_name);
  const normalizedProviderRawIdentification = pickValue(providerRawIdentification, payload?.provider_raw_identification);
  const normalizedProviderCode = pickValue(providerCode, payload?.provider_code);
  const normalizedNombreArchivo = pickValue(nombreArchivo, payload?.nombre_archivo);
  const normalizedRutaArchivo = pickValue(rutaArchivo, payload?.ruta_archivo);
  const normalizedExecutionDate = pickValue(executionDate, payload?.execution_date);
  const normalizedCurrency = pickValue(currency, payload?.currency);
  const normalizedPageStart = pickValue(pageStart, payload?.page_start);
  const normalizedPageEnd = pickValue(pageEnd, payload?.page_end);
  const normalizedPageNumbers = pickValue(pageNumbers, payload?.page_numbers);
  const normalizedWarnings = pickValue(warnings, payload?.warnings);
  const normalizedGroupPayload = pickValue(groupPayload, payload?.group_payload);

  const { rows } = await getDb(client).query(
    `
    INSERT INTO tramites_pago_caratulas_huerfanas (
      tramite_id,
      provider_raw_name,
      provider_raw_identification,
      provider_code,
      nombre_archivo,
      ruta_archivo,
      execution_date,
      currency,
      page_start,
      page_end,
      page_numbers,
      warnings,
      group_payload,
      status,
      assigned_provider_caratula_id,
      assigned_by,
      assigned_at,
      discarded_by,
      discarded_at
    )
    VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
      $11::jsonb, $12::jsonb, $13::jsonb, $14, $15, $16, $17, $18, $19
    )
    RETURNING *
    `,
    [
      tramiteId,
      normalizedProviderRawName || null,
      normalizedProviderRawIdentification || null,
      normalizedProviderCode || null,
      normalizedNombreArchivo,
      normalizedRutaArchivo,
      normalizedExecutionDate || null,
      normalizedCurrency || null,
      normalizedPageStart || null,
      normalizedPageEnd || null,
      JSON.stringify(Array.isArray(normalizedPageNumbers) ? normalizedPageNumbers : []),
      JSON.stringify(Array.isArray(normalizedWarnings) ? normalizedWarnings : []),
      JSON.stringify(normalizedGroupPayload && typeof normalizedGroupPayload === 'object' ? normalizedGroupPayload : {}),
      status,
      assignedProviderCaratulaId,
      assignedBy,
      assignedAt,
      discardedBy,
      discardedAt
    ]
  );
  return rows[0] || null;
};

const updateTramiteCaratulaOrphanStatus = async ({
  orphanId,
  status,
  assignedProviderCaratulaId = null,
  assignedBy = null,
  assignedAt = null,
  discardedBy = null,
  discardedAt = null
}, client) => {
  const { rows } = await getDb(client).query(
    `
    UPDATE tramites_pago_caratulas_huerfanas
    SET status = $1,
        assigned_provider_caratula_id = $2,
        assigned_by = $3,
        assigned_at = $4,
        discarded_by = $5,
        discarded_at = $6,
        actualizado_en = CURRENT_TIMESTAMP
    WHERE id = $7
    RETURNING *
    `,
    [
      status,
      assignedProviderCaratulaId,
      assignedBy,
      assignedAt,
      discardedBy,
      discardedAt,
      orphanId
    ]
  );
  return rows[0] || null;
};

const deleteTramiteCaratulaProvidersByTramiteId = async (tramiteId, client) => {
  const { rows } = await getDb(client).query(
    `
    DELETE FROM tramites_pago_caratulas_proveedor
    WHERE tramite_id = $1
    RETURNING *
    `,
    [tramiteId]
  );
  return rows;
};

const deleteTramiteCaratulaOrphansByTramiteId = async (tramiteId, client) => {
  const { rows } = await getDb(client).query(
    `
    DELETE FROM tramites_pago_caratulas_huerfanas
    WHERE tramite_id = $1
    RETURNING *
    `,
    [tramiteId]
  );
  return rows;
};

const getFacturaEstado = async (facturaId, client) => {
  const { rows } = await getDb(client).query(
    `
    SELECT
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

const getDocumentoTesoreriaEstado = async (tramiteId, facturaId, client) => {
  const { rows } = await getDb(client).query(
    `
    SELECT estado_tesoreria
    FROM tramites_pago_documentos
    WHERE tramite_id = $1 AND factura_id = $2
    `,
    [tramiteId, facturaId]
  );
  return rows[0] || null;
};

const getTramiteDocumentoByFacturaIdForUpdate = async ({ tramiteId, facturaId }, client) => {
  const { rows } = await getDb(client).query(
    `
    SELECT *
    FROM tramites_pago_documentos
    WHERE tramite_id = $1
      AND factura_id = $2
    FOR UPDATE
    `,
    [tramiteId, facturaId]
  );
  return rows[0] || null;
};

const updateDocumentoTesoreriaExcluido = async ({
  tramiteId,
  facturaId,
  motivo,
  estadoTesoreria = TESORERIA_ESTADOS.EXCLUIDO
}, client) => {
  const { rows } = await getDb(client).query(
    `
    UPDATE tramites_pago_documentos
    SET estado_tesoreria = $1,
        motivo_tesoreria = $2,
        actualizado_en = CURRENT_TIMESTAMP
    WHERE tramite_id = $3 AND factura_id = $4
    RETURNING *
    `,
    [estadoTesoreria, motivo || null, tramiteId, facturaId]
  );
  return rows[0] || null;
};

const updateDocumentoTesoreriaReset = async ({ destino, estadoTesoreria, motivo, tramiteId, facturaId }, client) => {
  const updateQuery = buildTesoreriaResetQuery(destino);
  const { rows } = await getDb(client).query(updateQuery, [estadoTesoreria, motivo || null, tramiteId, facturaId]);
  return rows[0] || null;
};

const updateDocumentoTesoreriaPendiente = async ({ tramiteId, facturaId }, client) => {
  await getDb(client).query(
    `
    UPDATE tramites_pago_documentos
    SET estado_tesoreria = '${TESORERIA_ESTADOS.PENDIENTE}',
        motivo_tesoreria = NULL,
        actualizado_en = CURRENT_TIMESTAMP
    WHERE tramite_id = $1 AND factura_id = $2
    `,
    [tramiteId, facturaId]
  );
};

const updateDocumentosTesoreriaEstadoByTramite = async ({ tramiteId, estadoTesoreria }, client) => {
  await getDb(client).query(
    `
    UPDATE tramites_pago_documentos
    SET estado_tesoreria = $1,
        actualizado_en = CURRENT_TIMESTAMP
    WHERE tramite_id = $2
      AND ${tesoreriaActivaSql('estado_tesoreria')}
    `,
    [estadoTesoreria, tramiteId]
  );
};

const updateRetencionesTesoreriaEstadoByTramite = async ({ tramiteId, estadoTesoreria }, client) => {
  await getDb(client).query(
    `
    UPDATE tramites_pago_retenciones
    SET estado_tesoreria = $1,
        actualizado_en = CURRENT_TIMESTAMP
    WHERE tramite_id = $2
      AND ${tesoreriaActivaSql('estado_tesoreria')}
    `,
    [estadoTesoreria, tramiteId]
  );
};

const updateFacturaEstado = async ({ facturaId, estado }, client) => {
  if (isFacturaWorkflowPagoEstado(estado)) {
    await getDb(client).query(
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
    return;
  }

  await getDb(client).query(
    `
    DELETE FROM facturas_workflow_pago_estado
    WHERE factura_id = $1
    `,
    [facturaId]
  );

  await getDb(client).query(
    `
    UPDATE facturas
    SET estado = $1
    WHERE id = $2
    `,
    [estado, facturaId]
  );
};

const updateFacturasEstadoByIds = async ({ facturaIds, estado }, client) => {
  if (!Array.isArray(facturaIds) || facturaIds.length === 0) {
    return;
  }

  if (isFacturaWorkflowPagoEstado(estado)) {
    await getDb(client).query(
      `
      INSERT INTO facturas_workflow_pago_estado (factura_id, estado)
      SELECT factura_id, $2
      FROM UNNEST($1::int[]) AS x(factura_id)
      ON CONFLICT (factura_id)
      DO UPDATE SET
        estado = EXCLUDED.estado,
        actualizado_en = CURRENT_TIMESTAMP
      `,
      [facturaIds, estado]
    );
    return;
  }

  await getDb(client).query(
    `
    DELETE FROM facturas_workflow_pago_estado
    WHERE factura_id = ANY($1::int[])
    `,
    [facturaIds]
  );

  await getDb(client).query(
    `
    UPDATE facturas
    SET estado = $1
    WHERE id = ANY($2::int[])
    `,
    [estado, facturaIds]
  );
};

const insertHistorialDocumentoConEstados = async ({
  tramiteId,
  facturaId,
  accion,
  estadoAnterior,
  estadoNuevo,
  usuario,
  motivo
}, client) => {
  await getDb(client).query(
    `
    INSERT INTO tramites_pago_historial (tramite_id, factura_id, accion, estado_anterior, estado_nuevo, usuario, motivo)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    `,
    [tramiteId, facturaId, accion, estadoAnterior, estadoNuevo, usuario || null, motivo || null]
  );
};

const insertHistorialConEstados = async ({
  tramiteId,
  accion,
  estadoAnterior,
  estadoNuevo,
  usuario,
  motivo
}, client) => {
  await getDb(client).query(
    `
    INSERT INTO tramites_pago_historial (tramite_id, accion, estado_anterior, estado_nuevo, usuario, motivo)
    VALUES ($1, $2, $3, $4, $5, $6)
    `,
    [tramiteId, accion, estadoAnterior, estadoNuevo, usuario || null, motivo || null]
  );
};

const insertHistorialDocumento = async ({ tramiteId, facturaId, accion, usuario, motivo }, client) => {
  await getDb(client).query(
    `
    INSERT INTO tramites_pago_historial (tramite_id, factura_id, accion, usuario, motivo)
    VALUES ($1, $2, $3, $4, $5)
    `,
    [tramiteId, facturaId, accion, usuario || null, motivo || null]
  );
};

const insertHistorialTramite = async ({ tramiteId, accion, estadoNuevo, usuario, motivo }, client) => {
  await getDb(client).query(
    `
    INSERT INTO tramites_pago_historial (tramite_id, accion, estado_nuevo, usuario, motivo)
    VALUES ($1, $2, $3, $4, $5)
    `,
    [tramiteId, accion, estadoNuevo, usuario || null, motivo || null]
  );
};

const touchTramite = async (tramiteId, client) => {
  await getDb(client).query(
    `
    UPDATE tramites_pago
    SET actualizado_en = CURRENT_TIMESTAMP
    WHERE id = $1
    `,
    [tramiteId]
  );
};

const updateTramiteEstado = async ({ tramiteId, estado }, client) => {
  const { rows } = await getDb(client).query(
    `
    UPDATE tramites_pago
    SET estado = $1, actualizado_en = CURRENT_TIMESTAMP
    WHERE id = $2
    RETURNING *
    `,
    [estado, tramiteId]
  );
  return rows[0] || null;
};

const listTramites = async ({ sociedadId, sociedadIds, estado } = {}, client) => {
  const params = [];
  const where = [];

  addSociedadScopeClause({
    params,
    clauses: where,
    column: 't.sociedad_id',
    sociedadId,
    sociedadIds
  });
  if (estado) {
    params.push(estado);
    where.push(`t.estado = $${params.length}`);
  }

  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const { rows } = await getDb(client).query(
    `
    SELECT
      t.*,
      SUM(CASE WHEN td.id IS NOT NULL AND ${tesoreriaActivaSql('td.estado_tesoreria')} THEN 1 ELSE 0 END)::int AS total_documentos,
      SUM(CASE WHEN td.id IS NOT NULL AND ${tesoreriaActivaSql('td.estado_tesoreria')} AND td.estado_gerencia = '${DOCUMENTO_ESTADOS.APROBADO}' THEN 1 ELSE 0 END)::int AS aprobados_gerencia,
      SUM(CASE WHEN td.id IS NOT NULL AND ${tesoreriaActivaSql('td.estado_tesoreria')} AND td.estado_gerencia = '${DOCUMENTO_ESTADOS.RECHAZADO}' THEN 1 ELSE 0 END)::int AS rechazados_gerencia,
      SUM(CASE WHEN td.id IS NOT NULL AND ${tesoreriaActivaSql('td.estado_tesoreria')} AND td.estado_gerencia_contable = '${DOCUMENTO_ESTADOS.APROBADO}' THEN 1 ELSE 0 END)::int AS aprobados_gerencia_contable,
      SUM(CASE WHEN td.id IS NOT NULL AND ${tesoreriaActivaSql('td.estado_tesoreria')} AND td.estado_gerencia_contable = '${DOCUMENTO_ESTADOS.RECHAZADO}' THEN 1 ELSE 0 END)::int AS rechazados_gerencia_contable,
      SUM(CASE WHEN td.id IS NOT NULL AND ${tesoreriaActivaSql('td.estado_tesoreria')} AND td.estado_financiero = '${DOCUMENTO_ESTADOS.APROBADO}' THEN 1 ELSE 0 END)::int AS aprobados_financiero,
      SUM(CASE WHEN td.id IS NOT NULL AND ${tesoreriaActivaSql('td.estado_tesoreria')} AND td.estado_financiero = '${DOCUMENTO_ESTADOS.RECHAZADO}' THEN 1 ELSE 0 END)::int AS rechazados_financiero,
      SUM(
        CASE
          WHEN td.id IS NOT NULL AND ${tesoreriaActivaSql('td.estado_tesoreria')}
            THEN ${totalPagoPrincipalExpression}
          ELSE 0
        END
      ) AS total_monto_a_pagar,
      SUM(
        CASE
          WHEN td.id IS NOT NULL AND ${tesoreriaActivaSql('td.estado_tesoreria')}
            THEN ${retencionPendienteExpression}
          ELSE 0
        END
      ) AS total_monto_retencion_pendiente,
      COALESCE((
        SELECT COUNT(*)::int
        FROM tramites_pago_retenciones tr
        WHERE tr.tramite_id = t.id
          AND ${tesoreriaActivaSql('tr.estado_tesoreria')}
      ), 0) AS total_retenciones,
      COALESCE((
        SELECT SUM(tr.monto_retencion)
        FROM tramites_pago_retenciones tr
        WHERE tr.tramite_id = t.id
          AND ${tesoreriaActivaSql('tr.estado_tesoreria')}
      ), 0) AS total_monto_retenciones,
      (
        COALESCE(SUM(
          CASE
            WHEN td.id IS NOT NULL AND ${tesoreriaActivaSql('td.estado_tesoreria')}
              THEN ${totalPagoPrincipalExpression}
            ELSE 0
          END
        ), 0)
        + COALESCE((
          SELECT SUM(tr.monto_retencion)
          FROM tramites_pago_retenciones tr
          WHERE tr.tramite_id = t.id
            AND ${tesoreriaActivaSql('tr.estado_tesoreria')}
        ), 0)
      ) AS total_monto_pendiente_global
    FROM tramites_pago t
    LEFT JOIN tramites_pago_documentos td ON td.tramite_id = t.id
    LEFT JOIN facturas f ON f.id = td.factura_id
    LEFT JOIN facturas_contabilizacion fc ON fc.factura_id = f.id
    ${whereClause}
    GROUP BY t.id
    ORDER BY t.creado_en DESC
    `,
    params
  );

  return rows;
};

const getRetencionesDisponibles = async ({ sociedadId }, client) => {
  const { rows } = await getDb(client).query(
    `
    SELECT
      f.id AS factura_id,
      f.clave,
      f.consecutivo,
      f.fecha_emision,
      ${facturaEstadoOperativoExpression} AS estado,
      f.estado AS estado_documental,
      fwp.estado AS estado_workflow_pago,
      COALESCE(f.resumen->'CodigoTipoMoneda'->>'CodigoMoneda', f.resumen->>'CodigoMoneda', f.resumen->>'codigoMoneda', 'CRC') AS moneda,
      p.id AS proveedor_id,
      p.nombre AS proveedor_nombre,
      p.identificacion_numero AS proveedor_identificacion,
      ${retencionPendienteExpression} AS monto_retencion_pendiente
    FROM facturas f
    ${facturaWorkflowPagoJoin}
    JOIN facturas_contabilizacion fc ON fc.factura_id = f.id
    LEFT JOIN proveedores p ON p.id = fc.proveedor_id
    WHERE f.sociedad_id = $1
      AND ${facturaEstadoOperativoExpression} = '${FACTURA_ESTADOS.PAGADO}'
      AND ${retencionPendienteExpression} > 0
      AND NOT EXISTS (
        SELECT 1
        FROM tramites_pago_retenciones tr
        JOIN tramites_pago t ON t.id = tr.tramite_id
        WHERE tr.factura_id = f.id
          AND t.estado NOT IN ('${TRAMITE_ESTADOS.PAGADO}', '${TRAMITE_ESTADOS.CANCELADO}')
          AND ${tesoreriaActivaSql('tr.estado_tesoreria')}
      )
    ORDER BY p.nombre ASC NULLS LAST, f.fecha_emision DESC NULLS LAST, f.id DESC
    `,
    [sociedadId]
  );

  return rows;
};

const listDocumentosByTramite = async (tramiteId, client, options = {}) => {
  const currentUserId = normalizePositiveIntOrNull(options.currentUserId);
  const currentUserRoleId = normalizePositiveIntOrNull(options.currentUserRoleId);
  const { rows } = await getDb(client).query(
    `
    SELECT
      td.*,
      f.clave,
      f.consecutivo,
      f.fecha_emision,
      f.emisor,
      f.resumen,
      ${facturaEstadoOperativoExpression} AS estado,
      f.estado AS estado_documental,
      fwp.estado AS estado_workflow_pago,
      f.ruta_pdf,
      fc.proveedor_id AS proveedor_id,
      p.nombre AS proveedor_nombre,
      p.identificacion_numero AS proveedor_identificacion,
      fc.tabla_pago_id AS conta_tabla_pago_id,
      tp.nombre AS conta_tabla_pago_nombre,
      tp.ruta_pdf AS conta_tabla_pago_ruta_pdf,
      fc.orden_compra_id AS conta_orden_compra_id,
      oc.nombre AS conta_orden_compra_nombre,
      oc.ruta_pdf AS conta_orden_compra_ruta_pdf,
      fc.nota_credito_id AS conta_nota_credito_id,
      nc.clave AS conta_nota_credito_clave,
      nc.ruta_pdf AS conta_nota_credito_ruta_pdf,
      nc.ruta_xml AS conta_nota_credito_ruta_xml,
      COALESCE(respaldos.documentos_respaldo, '[]'::jsonb) AS conta_documentos_respaldo,
      fc.fecha_documento AS conta_fecha_documento,
      fc.fecha_vencimiento AS conta_fecha_vencimiento,
      fc.fecha_contabilizacion AS conta_fecha_contabilizacion,
      fc.plazo_credito AS conta_plazo_credito,
      fc.retencion AS conta_retencion,
      fc.descuento AS conta_descuento,
      fc.anticipo_aplicado AS conta_anticipo_aplicado,
      fc.monto_nota_credito AS conta_monto_nota_credito,
      ${retencionTotalExpression} AS conta_retencion_total,
      COALESCE(fc.retencion_pagada, 0) AS conta_retencion_pagada,
      ${retencionPendienteExpression} AS conta_retencion_pendiente,
      fc.estado_retencion AS conta_estado_retencion,
      fc.asiento AS conta_asiento,
      fc.centro_costo AS conta_centro_costo,
      fc.metadata AS conta_metadata,
      COALESCE(u_conta.nombre, fc.creado_por) AS conta_creado_por,
      fc.cuenta_contable AS conta_cuenta_contable,
      fc.proyecto AS conta_proyecto,
      fc.orden_compra AS conta_orden_compra,
      fc.numero_proveedor AS conta_numero_proveedor,
      fc.notas AS conta_notas,
      COALESCE(gerencia.gerencia_aprobadores_total, 0) AS gerencia_aprobadores_total,
      COALESCE(gerencia.gerencia_aprobadores_aprobados, 0) AS gerencia_aprobadores_aprobados,
      COALESCE(gerencia.gerencia_aprobadores_pendientes, 0) AS gerencia_aprobadores_pendientes,
      COALESCE(gerencia.gerencia_aprobadores_rechazados, 0) AS gerencia_aprobadores_rechazados,
      COALESCE(gerencia.gerencia_puede_aprobar_usuario_actual, false) AS gerencia_puede_aprobar_usuario_actual,
      COALESCE(gerencia.gerencia_ya_aprobo_usuario_actual, false) AS gerencia_ya_aprobo_usuario_actual,
      COALESCE(gerencia.gerencia_aprobadores, '[]'::jsonb) AS gerencia_aprobadores,
      ${totalFacturaExpression} AS total_factura,
      ${totalRebajosExpression} AS total_rebajos,
      ${pagosFacturaExpression} AS total_pagado_principal,
      ${totalPagoPrincipalExpression} AS total_a_pagar,
      ${totalPendienteGlobalExpression} AS total_pendiente_global
    FROM tramites_pago_documentos td
    JOIN facturas f ON f.id = td.factura_id
    ${facturaWorkflowPagoJoin}
    LEFT JOIN facturas_contabilizacion fc ON fc.factura_id = f.id
    LEFT JOIN proveedores p ON p.id = fc.proveedor_id
    LEFT JOIN tablas_pago tp ON tp.id = fc.tabla_pago_id
    LEFT JOIN ordenes_compra oc ON oc.id = fc.orden_compra_id
    LEFT JOIN notas_credito nc ON nc.id = fc.nota_credito_id
    LEFT JOIN usuarios u_conta ON (
      LOWER(u_conta.email) = LOWER(fc.creado_por)
      OR LOWER(split_part(u_conta.email, '@', 1)) = LOWER(fc.creado_por)
    )
    LEFT JOIN LATERAL (
      SELECT COALESCE(
        jsonb_agg(
          jsonb_build_object(
            'id', dr.id,
            'factura_id', dr.factura_id,
            'nombre_archivo', dr.nombre_archivo,
            'ruta_pdf', dr.ruta_pdf,
            'metadata', dr.metadata,
            'creado_por', dr.creado_por,
            'creado_en', dr.creado_en,
            'actualizado_en', dr.actualizado_en
          )
          ORDER BY dr.creado_en ASC, dr.id ASC
        ),
        '[]'::jsonb
      ) AS documentos_respaldo
      FROM facturas_contabilizacion_documentos_respaldo dr
      WHERE dr.factura_id = f.id
    ) respaldos ON true
    LEFT JOIN LATERAL (
      WITH existing_approvers AS (
        SELECT
          tda.usuario_aprobador_id,
          tda.usuario_aprobador_nombre,
          tda.usuario_aprobador_email,
          tda.rol_aprobador_id,
          tda.rol_aprobador_codigo,
          tda.rol_aprobador_nombre,
          tda.estado_gerencia AS estado_aprobacion,
          tda.motivo_gerencia AS motivo_aprobacion,
          tda.decision_usuario_id,
          tda.decision_usuario_nombre,
          tda.decision_usuario_email,
          tda.decision_en
        FROM tramites_pago_documentos_aprobadores tda
        WHERE tda.tramite_id = td.tramite_id
          AND tda.factura_id = td.factura_id
      ),
      fallback_user_approvers AS (
        SELECT DISTINCT
          NULLIF(linea->>'usuario_aprobador_id', '')::int AS usuario_aprobador_id,
          NULLIF(BTRIM(COALESCE(linea->>'usuario_aprobador_nombre', '')), '') AS usuario_aprobador_nombre,
          NULLIF(BTRIM(COALESCE(linea->>'usuario_aprobador_email', '')), '') AS usuario_aprobador_email,
          NULL::int AS rol_aprobador_id,
          NULL::text AS rol_aprobador_codigo,
          NULL::text AS rol_aprobador_nombre,
          '${DOCUMENTO_ESTADOS.PENDIENTE}'::character varying AS estado_aprobacion,
          NULL::text AS motivo_aprobacion,
          NULL::int AS decision_usuario_id,
          NULL::text AS decision_usuario_nombre,
          NULL::text AS decision_usuario_email,
          NULL::timestamp without time zone AS decision_en
        FROM jsonb_array_elements(COALESCE(fc.metadata->'centros_costo_lineas', '[]'::jsonb)) AS linea
        WHERE NOT EXISTS (SELECT 1 FROM existing_approvers)
          AND NULLIF(linea->>'usuario_aprobador_id', '') ~ '^[0-9]+$'
      ),
      fallback_role_approvers AS (
        SELECT DISTINCT
          NULL::int AS usuario_aprobador_id,
          NULL::text AS usuario_aprobador_nombre,
          NULL::text AS usuario_aprobador_email,
          NULLIF(linea->>'rol_aprobador_id', '')::int AS rol_aprobador_id,
          NULLIF(BTRIM(COALESCE(linea->>'rol_aprobador_codigo', '')), '') AS rol_aprobador_codigo,
          NULLIF(BTRIM(COALESCE(linea->>'rol_aprobador_nombre', '')), '') AS rol_aprobador_nombre,
          '${DOCUMENTO_ESTADOS.PENDIENTE}'::character varying AS estado_aprobacion,
          NULL::text AS motivo_aprobacion,
          NULL::int AS decision_usuario_id,
          NULL::text AS decision_usuario_nombre,
          NULL::text AS decision_usuario_email,
          NULL::timestamp without time zone AS decision_en
        FROM jsonb_array_elements(COALESCE(fc.metadata->'centros_costo_lineas', '[]'::jsonb)) AS linea
        WHERE NOT EXISTS (SELECT 1 FROM existing_approvers)
          AND NULLIF(linea->>'rol_aprobador_id', '') ~ '^[0-9]+$'
      ),
      approvers AS (
        SELECT * FROM existing_approvers
        UNION ALL
        SELECT * FROM fallback_user_approvers
        UNION ALL
        SELECT * FROM fallback_role_approvers
      )
      SELECT
        COUNT(*)::int AS gerencia_aprobadores_total,
        COUNT(*) FILTER (WHERE estado_aprobacion = '${DOCUMENTO_ESTADOS.APROBADO}')::int AS gerencia_aprobadores_aprobados,
        COUNT(*) FILTER (WHERE estado_aprobacion = '${DOCUMENTO_ESTADOS.PENDIENTE}')::int AS gerencia_aprobadores_pendientes,
        COUNT(*) FILTER (WHERE estado_aprobacion = '${DOCUMENTO_ESTADOS.RECHAZADO}')::int AS gerencia_aprobadores_rechazados,
        COALESCE(BOOL_OR((
          (($2::int IS NOT NULL) AND usuario_aprobador_id = $2::int)
          OR (($3::int IS NOT NULL) AND rol_aprobador_id = $3::int)
        ) AND estado_aprobacion = '${DOCUMENTO_ESTADOS.PENDIENTE}'), false) AS gerencia_puede_aprobar_usuario_actual,
        COALESCE(BOOL_OR((
          (($2::int IS NOT NULL) AND usuario_aprobador_id = $2::int)
          OR (($3::int IS NOT NULL) AND rol_aprobador_id = $3::int)
        ) AND estado_aprobacion = '${DOCUMENTO_ESTADOS.APROBADO}'), false) AS gerencia_ya_aprobo_usuario_actual,
        COALESCE(
          jsonb_agg(
            jsonb_build_object(
              'usuario_aprobador_id', usuario_aprobador_id,
              'usuario_aprobador_nombre', usuario_aprobador_nombre,
              'usuario_aprobador_email', usuario_aprobador_email,
              'rol_aprobador_id', rol_aprobador_id,
              'rol_aprobador_codigo', rol_aprobador_codigo,
              'rol_aprobador_nombre', rol_aprobador_nombre,
              'aprobador_label', COALESCE(
                rol_aprobador_nombre,
                rol_aprobador_codigo,
                usuario_aprobador_nombre,
                usuario_aprobador_email,
                usuario_aprobador_id::text,
                rol_aprobador_id::text
              ),
              'estado', estado_aprobacion,
              'motivo', motivo_aprobacion,
              'decision_usuario_id', decision_usuario_id,
              'decision_usuario_nombre', decision_usuario_nombre,
              'decision_usuario_email', decision_usuario_email,
              'decision_usuario_label', COALESCE(
                decision_usuario_nombre,
                decision_usuario_email,
                decision_usuario_id::text
              ),
              'decision_en', decision_en
            )
            ORDER BY COALESCE(
              rol_aprobador_nombre,
              rol_aprobador_codigo,
              usuario_aprobador_nombre,
              usuario_aprobador_email,
              usuario_aprobador_id::text,
              rol_aprobador_id::text
            )
          ) FILTER (WHERE usuario_aprobador_id IS NOT NULL OR rol_aprobador_id IS NOT NULL),
          '[]'::jsonb
        ) AS gerencia_aprobadores
      FROM approvers
    ) gerencia ON true
    WHERE td.tramite_id = $1
    ORDER BY f.fecha_emision DESC NULLS LAST, f.id DESC
    `,
    [tramiteId, currentUserId, currentUserRoleId]
  );

  return rows;
};

const listSaldosPagoPrincipalByTramite = async (tramiteId, client) => {
  const { rows } = await getDb(client).query(
    `
    SELECT
      td.factura_id,
      td.monto_pago_programado,
      ${totalPagoPrincipalExpression} AS saldo_pago_principal
    FROM tramites_pago_documentos td
    JOIN facturas f ON f.id = td.factura_id
    LEFT JOIN facturas_contabilizacion fc ON fc.factura_id = f.id
    WHERE td.tramite_id = $1
      AND ${tesoreriaActivaSql('td.estado_tesoreria')}
    `,
    [tramiteId]
  );

  return rows;
};

const updateMontosPagoProgramadoByTramite = async ({
  tramiteId,
  pagosDocumentos = []
}, client) => {
  await getDb(client).query(
    `
    UPDATE tramites_pago_documentos
    SET monto_pago_programado = NULL,
        actualizado_en = CURRENT_TIMESTAMP
    WHERE tramite_id = $1
    `,
    [tramiteId]
  );

  if (!Array.isArray(pagosDocumentos) || pagosDocumentos.length === 0) {
    return [];
  }

  const facturaIds = [];
  const montos = [];
  pagosDocumentos.forEach((item) => {
    const facturaId = Number(item?.facturaId ?? item?.factura_id);
    const montoPago = Number(item?.montoPago ?? item?.monto_pago);
    if (!Number.isInteger(facturaId) || facturaId <= 0) {
      return;
    }
    if (!Number.isFinite(montoPago) || montoPago <= 0) {
      return;
    }
    facturaIds.push(facturaId);
    montos.push(montoPago);
  });

  if (facturaIds.length === 0) {
    return [];
  }

  const { rows } = await getDb(client).query(
    `
    UPDATE tramites_pago_documentos td
    SET monto_pago_programado = x.monto_pago_programado,
        actualizado_en = CURRENT_TIMESTAMP
    FROM UNNEST($2::int[], $3::numeric[]) AS x(factura_id, monto_pago_programado)
    WHERE td.tramite_id = $1
      AND td.factura_id = x.factura_id
    RETURNING td.*
    `,
    [tramiteId, facturaIds, montos]
  );

  return rows;
};

const listRetencionesByTramite = async (tramiteId, client) => {
  const { rows } = await getDb(client).query(
    `
    SELECT
      tr.id,
      tr.tramite_id,
      tr.factura_id,
      tr.proveedor_id,
      tr.monto_retencion,
      tr.estado_tesoreria,
      tr.motivo_tesoreria,
      tr.actualizado_en,
      tr.creado_en,
      f.clave,
      f.consecutivo,
      f.fecha_emision,
      ${facturaEstadoOperativoExpression} AS estado,
      f.estado AS estado_documental,
      fwp.estado AS estado_workflow_pago,
      f.emisor,
      COALESCE(f.resumen->'CodigoTipoMoneda'->>'CodigoMoneda', f.resumen->>'CodigoMoneda', f.resumen->>'codigoMoneda', 'CRC') AS moneda,
      p.nombre AS proveedor_nombre,
      p.identificacion_numero AS proveedor_identificacion
    FROM tramites_pago_retenciones tr
    JOIN facturas f ON f.id = tr.factura_id
    ${facturaWorkflowPagoJoin}
    LEFT JOIN proveedores p ON p.id = tr.proveedor_id
    WHERE tr.tramite_id = $1
    ORDER BY p.nombre ASC NULLS LAST, f.fecha_emision DESC NULLS LAST, tr.id DESC
    `,
    [tramiteId]
  );

  return rows;
};

const listHistorialByTramite = async (tramiteId, client) => {
  const { rows } = await getDb(client).query(
    `
    SELECT
      h.*,
      f.consecutivo,
      f.clave
    FROM tramites_pago_historial h
    LEFT JOIN facturas f ON f.id = h.factura_id
    WHERE h.tramite_id = $1
    ORDER BY h.creado_en DESC, h.id DESC
    `,
    [tramiteId]
  );
  return rows;
};

const getFacturasByIds = async (facturaIds, client) => {
  const { rows } = await getDb(client).query(
    `
    SELECT
      f.id,
      f.sociedad_id,
      ${facturaEstadoOperativoExpression} AS estado,
      f.estado AS estado_documental,
      fwp.estado AS estado_workflow_pago
    FROM facturas f
    ${facturaWorkflowPagoJoin}
    WHERE f.id = ANY($1::int[])
    `,
    [facturaIds]
  );
  return rows;
};

const getRetencionesPendientesByFacturaIds = async (facturaIds, client) => {
  const { rows } = await getDb(client).query(
    `
    SELECT
      f.id,
      f.sociedad_id,
      ${facturaEstadoOperativoExpression} AS estado,
      f.estado AS estado_documental,
      fwp.estado AS estado_workflow_pago,
      fc.proveedor_id,
      ${retencionPendienteExpression} AS monto_retencion_pendiente
    FROM facturas f
    ${facturaWorkflowPagoJoin}
    JOIN facturas_contabilizacion fc ON fc.factura_id = f.id
    WHERE f.id = ANY($1::int[])
      AND ${facturaEstadoOperativoExpression} = '${FACTURA_ESTADOS.PAGADO}'
      AND ${retencionPendienteExpression} > 0
    `,
    [facturaIds]
  );

  return rows;
};

const findDuplicadosActivos = async (facturaIds, client) => {
  const { rows } = await getDb(client).query(
    `
    SELECT td.factura_id
    FROM tramites_pago_documentos td
    JOIN tramites_pago t ON t.id = td.tramite_id
    WHERE td.factura_id = ANY($1::int[])
      AND t.estado NOT IN ('${TRAMITE_ESTADOS.PAGADO}', '${TRAMITE_ESTADOS.CANCELADO}')
      AND ${tesoreriaActivaSql('td.estado_tesoreria')}
    `,
    [facturaIds]
  );
  return rows;
};

const findRetencionesDuplicadasActivas = async (facturaIds, client) => {
  const { rows } = await getDb(client).query(
    `
    SELECT tr.factura_id
    FROM tramites_pago_retenciones tr
    JOIN tramites_pago t ON t.id = tr.tramite_id
    WHERE tr.factura_id = ANY($1::int[])
      AND t.estado NOT IN ('${TRAMITE_ESTADOS.PAGADO}', '${TRAMITE_ESTADOS.CANCELADO}')
      AND ${tesoreriaActivaSql('tr.estado_tesoreria')}
    `,
    [facturaIds]
  );
  return rows;
};

const insertTramite = async ({ sociedadId, estado, creadoPor }, client) => {
  const { rows } = await getDb(client).query(
    `
    INSERT INTO tramites_pago (sociedad_id, estado, creado_por)
    VALUES ($1, $2, $3)
    RETURNING *
    `,
    [sociedadId, estado, creadoPor || null]
  );
  return rows[0];
};

const insertTramiteDocumentos = async ({
  tramiteId,
  facturaIds,
  facturaEntries
}, client) => {
  const normalizedEntries = Array.isArray(facturaEntries) && facturaEntries.length > 0
    ? facturaEntries
      .map((entry) => ({
        facturaId: Number(entry?.facturaId ?? entry?.factura_id),
        estadoFacturaOrigen: entry?.estadoFacturaOrigen || entry?.estado_factura_origen || null
      }))
      .filter((entry) => Number.isInteger(entry.facturaId) && entry.facturaId > 0)
    : Array.isArray(facturaIds) && facturaIds.length > 0
      ? facturaIds
        .map((facturaId) => ({
          facturaId: Number(facturaId),
          estadoFacturaOrigen: null
        }))
        .filter((entry) => Number.isInteger(entry.facturaId) && entry.facturaId > 0)
      : [];

  if (normalizedEntries.length === 0) {
    return;
  }

  await getDb(client).query(
    `
    INSERT INTO tramites_pago_documentos (tramite_id, factura_id, estado_factura_origen)
    SELECT $1, x.factura_id, x.estado_factura_origen
    FROM UNNEST($2::int[], $3::text[]) AS x(factura_id, estado_factura_origen)
    `,
    [
      tramiteId,
      normalizedEntries.map((entry) => entry.facturaId),
      normalizedEntries.map((entry) => entry.estadoFacturaOrigen || null)
    ]
  );
};

const listCentroCostoAprobadoresByFacturaIds = async (facturaIds, client) => {
  if (!Array.isArray(facturaIds) || facturaIds.length === 0) {
    return [];
  }

  const { rows } = await getDb(client).query(
    `
    WITH raw AS (
      SELECT
        fc.factura_id,
        NULLIF(linea->>'usuario_aprobador_id', '') AS usuario_aprobador_id_raw,
        NULLIF(BTRIM(COALESCE(linea->>'usuario_aprobador_nombre', '')), '') AS usuario_aprobador_nombre,
        NULLIF(BTRIM(COALESCE(linea->>'usuario_aprobador_email', '')), '') AS usuario_aprobador_email,
        NULLIF(linea->>'rol_aprobador_id', '') AS rol_aprobador_id_raw,
        NULLIF(BTRIM(COALESCE(linea->>'rol_aprobador_codigo', '')), '') AS rol_aprobador_codigo,
        NULLIF(BTRIM(COALESCE(linea->>'rol_aprobador_nombre', '')), '') AS rol_aprobador_nombre
      FROM facturas_contabilizacion fc
      CROSS JOIN LATERAL jsonb_array_elements(COALESCE(fc.metadata->'centros_costo_lineas', '[]'::jsonb)) AS linea
      WHERE fc.factura_id = ANY($1::int[])
    ),
    user_approvers AS (
      SELECT DISTINCT ON (factura_id, usuario_aprobador_id_raw::int)
        factura_id,
        usuario_aprobador_id_raw::int AS usuario_aprobador_id,
        usuario_aprobador_nombre,
        usuario_aprobador_email,
        NULL::int AS rol_aprobador_id,
        NULL::text AS rol_aprobador_codigo,
        NULL::text AS rol_aprobador_nombre
      FROM raw
      WHERE usuario_aprobador_id_raw ~ '^[0-9]+$'
      ORDER BY factura_id, usuario_aprobador_id_raw::int, usuario_aprobador_nombre NULLS LAST, usuario_aprobador_email NULLS LAST
    ),
    role_approvers AS (
      SELECT DISTINCT ON (factura_id, rol_aprobador_id_raw::int)
        factura_id,
        NULL::int AS usuario_aprobador_id,
        NULL::text AS usuario_aprobador_nombre,
        NULL::text AS usuario_aprobador_email,
        rol_aprobador_id_raw::int AS rol_aprobador_id,
        rol_aprobador_codigo,
        rol_aprobador_nombre
      FROM raw
      WHERE rol_aprobador_id_raw ~ '^[0-9]+$'
      ORDER BY factura_id, rol_aprobador_id_raw::int, rol_aprobador_nombre NULLS LAST, rol_aprobador_codigo NULLS LAST
    )
    SELECT *
    FROM (
      SELECT * FROM user_approvers
      UNION ALL
      SELECT * FROM role_approvers
    ) approvers
    ORDER BY factura_id ASC, COALESCE(
      rol_aprobador_nombre,
      rol_aprobador_codigo,
      usuario_aprobador_nombre,
      usuario_aprobador_email,
      usuario_aprobador_id::text,
      rol_aprobador_id::text
    ) ASC
    `,
    [facturaIds]
  );

  return rows;
};

const insertTramiteDocumentoAprobadores = async ({ tramiteId, aprobadores }, client) => {
  if (!Array.isArray(aprobadores) || aprobadores.length === 0) {
    return;
  }

  for (const item of aprobadores) {
    const facturaId = Number(item?.factura_id);
    const usuarioAprobadorId = normalizePositiveIntOrNull(item?.usuario_aprobador_id);
    const rolAprobadorId = normalizePositiveIntOrNull(item?.rol_aprobador_id);

    if (!Number.isInteger(facturaId) || facturaId <= 0) {
      continue;
    }
    if (!usuarioAprobadorId && !rolAprobadorId) {
      continue;
    }

    await getDb(client).query(
      `
      INSERT INTO tramites_pago_documentos_aprobadores (
        tramite_id,
        factura_id,
        usuario_aprobador_id,
        usuario_aprobador_nombre,
        usuario_aprobador_email,
        rol_aprobador_id,
        rol_aprobador_codigo,
        rol_aprobador_nombre
      )
      SELECT
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8
      WHERE NOT EXISTS (
        SELECT 1
        FROM tramites_pago_documentos_aprobadores tda
        WHERE tda.tramite_id = $1
          AND tda.factura_id = $2
          AND tda.usuario_aprobador_id IS NOT DISTINCT FROM $3
          AND tda.rol_aprobador_id IS NOT DISTINCT FROM $6
      )
      `,
      [
        tramiteId,
        facturaId,
        usuarioAprobadorId,
        item?.usuario_aprobador_nombre || null,
        item?.usuario_aprobador_email || null,
        rolAprobadorId,
        item?.rol_aprobador_codigo || null,
        item?.rol_aprobador_nombre || null
      ]
    );
  }
};

const listTramiteDocumentoAprobadores = async ({ tramiteId, facturaIds }, client) => {
  const normalizedFacturaIds = Array.isArray(facturaIds) && facturaIds.length > 0
    ? facturaIds.map((value) => Number(value)).filter((value) => Number.isInteger(value) && value > 0)
    : [];

  const params = [tramiteId];
  const where = ['tramite_id = $1'];
  if (normalizedFacturaIds.length > 0) {
    params.push(normalizedFacturaIds);
    where.push(`factura_id = ANY($${params.length}::int[])`);
  }

  const { rows } = await getDb(client).query(
    `
    SELECT
      id,
      tramite_id,
      factura_id,
      usuario_aprobador_id,
      usuario_aprobador_nombre,
      usuario_aprobador_email,
      rol_aprobador_id,
      rol_aprobador_codigo,
      rol_aprobador_nombre,
      estado_gerencia,
      motivo_gerencia,
      decision_usuario_id,
      decision_usuario_nombre,
      decision_usuario_email,
      decision_en,
      creado_en,
      actualizado_en
    FROM tramites_pago_documentos_aprobadores
    WHERE ${where.join(' AND ')}
    ORDER BY factura_id ASC, COALESCE(
      rol_aprobador_nombre,
      rol_aprobador_codigo,
      usuario_aprobador_nombre,
      usuario_aprobador_email,
      usuario_aprobador_id::text,
      rol_aprobador_id::text
    ) ASC
    `,
    params
  );

  return rows;
};

const listTramiteDocumentoAprobadoresForUpdate = async ({ tramiteId, facturaId }, client) => {
  const { rows } = await getDb(client).query(
    `
    SELECT
      id,
      tramite_id,
      factura_id,
      usuario_aprobador_id,
      usuario_aprobador_nombre,
      usuario_aprobador_email,
      rol_aprobador_id,
      rol_aprobador_codigo,
      rol_aprobador_nombre,
      estado_gerencia,
      motivo_gerencia,
      decision_usuario_id,
      decision_usuario_nombre,
      decision_usuario_email,
      decision_en,
      creado_en,
      actualizado_en
    FROM tramites_pago_documentos_aprobadores
    WHERE tramite_id = $1
      AND factura_id = $2
    ORDER BY COALESCE(
      rol_aprobador_nombre,
      rol_aprobador_codigo,
      usuario_aprobador_nombre,
      usuario_aprobador_email,
      usuario_aprobador_id::text,
      rol_aprobador_id::text
    ) ASC
    FOR UPDATE
    `,
    [tramiteId, facturaId]
  );

  return rows;
};

const updateTramiteDocumentoAprobadorEstado = async ({
  tramiteId,
  facturaId,
  usuarioAprobadorId,
  rolAprobadorId,
  estado,
  motivo,
  decisionUsuarioId,
  decisionUsuarioNombre,
  decisionUsuarioEmail
}, client) => {
  const normalizedUsuarioAprobadorId = normalizePositiveIntOrNull(usuarioAprobadorId);
  const normalizedRolAprobadorId = normalizePositiveIntOrNull(rolAprobadorId);
  const params = [
    estado,
    motivo || null,
    normalizePositiveIntOrNull(decisionUsuarioId),
    decisionUsuarioNombre || null,
    decisionUsuarioEmail || null,
    tramiteId,
    facturaId
  ];
  let approverClause = '';

  if (normalizedUsuarioAprobadorId) {
    params.push(normalizedUsuarioAprobadorId);
    approverClause = `usuario_aprobador_id = $${params.length}`;
  } else if (normalizedRolAprobadorId) {
    params.push(normalizedRolAprobadorId);
    approverClause = `usuario_aprobador_id IS NULL AND rol_aprobador_id = $${params.length}`;
  } else {
    return null;
  }

  const { rows } = await getDb(client).query(
    `
    UPDATE tramites_pago_documentos_aprobadores
    SET
      estado_gerencia = $1,
      motivo_gerencia = $2,
      decision_usuario_id = $3,
      decision_usuario_nombre = $4,
      decision_usuario_email = $5,
      decision_en = CURRENT_TIMESTAMP,
      actualizado_en = CURRENT_TIMESTAMP
    WHERE tramite_id = $6
      AND factura_id = $7
      AND ${approverClause}
    RETURNING *
    `,
    params
  );

  return rows[0] || null;
};

const resetTramiteDocumentoAprobadores = async ({ tramiteId, facturaId }, client) => {
  await getDb(client).query(
    `
    UPDATE tramites_pago_documentos_aprobadores
    SET
      estado_gerencia = '${DOCUMENTO_ESTADOS.PENDIENTE}',
      motivo_gerencia = NULL,
      decision_usuario_id = NULL,
      decision_usuario_nombre = NULL,
      decision_usuario_email = NULL,
      decision_en = NULL,
      actualizado_en = CURRENT_TIMESTAMP
    WHERE tramite_id = $1
      AND factura_id = $2
    `,
    [tramiteId, facturaId]
  );
};

const insertTramiteRetenciones = async ({ tramiteId, retenciones }, client) => {
  if (!Array.isArray(retenciones) || retenciones.length === 0) {
    return;
  }

  const facturaIds = retenciones.map((item) => item.facturaId);
  const proveedorIds = retenciones.map((item) => item.proveedorId || null);
  const montos = retenciones.map((item) => item.montoRetencion);

  await getDb(client).query(
    `
    INSERT INTO tramites_pago_retenciones (tramite_id, factura_id, proveedor_id, monto_retencion)
    SELECT $1, x.factura_id, x.proveedor_id, x.monto_retencion
    FROM UNNEST($2::int[], $3::int[], $4::numeric[]) AS x(factura_id, proveedor_id, monto_retencion)
    `,
    [tramiteId, facturaIds, proveedorIds, montos]
  );
};

const countRechazadosActivos = async (tramiteId, client) => {
  const { rows } = await getDb(client).query(
    `
    SELECT COUNT(*)::int AS total
    FROM tramites_pago_documentos
    WHERE tramite_id = $1
      AND ${tesoreriaActivaSql('estado_tesoreria')}
      AND (
        estado_gerencia = '${DOCUMENTO_ESTADOS.RECHAZADO}'
        OR estado_gerencia_contable = '${DOCUMENTO_ESTADOS.RECHAZADO}'
        OR estado_financiero = '${DOCUMENTO_ESTADOS.RECHAZADO}'
      )
    `,
    [tramiteId]
  );
  return rows[0]?.total || 0;
};

const getResumenEtapaDocumentos = async ({ tramiteId, etapa }, client) => {
  const stageColumn = ETAPA_ESTADO_COLUMN_MAP[etapa];
  if (!stageColumn) {
    throw new Error(`Etapa de resumen no soportada: ${etapa}`);
  }

  const { rows } = await getDb(client).query(
    `
    SELECT
      COUNT(*) FILTER (WHERE ${tesoreriaActivaSql('estado_tesoreria')})::int AS total_activos,
      COUNT(*) FILTER (WHERE ${tesoreriaActivaSql('estado_tesoreria')} AND ${stageColumn} = '${DOCUMENTO_ESTADOS.APROBADO}')::int AS aprobados,
      COUNT(*) FILTER (WHERE ${tesoreriaActivaSql('estado_tesoreria')} AND ${stageColumn} = '${DOCUMENTO_ESTADOS.PENDIENTE}')::int AS pendientes,
      COUNT(*) FILTER (WHERE ${tesoreriaActivaSql('estado_tesoreria')} AND ${stageColumn} = '${DOCUMENTO_ESTADOS.RECHAZADO}')::int AS rechazados
    FROM tramites_pago_documentos
    WHERE tramite_id = $1
    `,
    [tramiteId]
  );

  return rows[0] || {
    total_activos: 0,
    aprobados: 0,
    pendientes: 0,
    rechazados: 0
  };
};

const insertPagoFactura = async ({
  facturaId,
  tramiteId,
  monto,
  fechaPago,
  usuario,
  notas
}, client) => {
  const { rows } = await getDb(client).query(
    `
    INSERT INTO facturas_pagos (
      factura_id,
      tramite_id,
      monto,
      fecha_pago,
      usuario,
      notas
    )
    VALUES ($1, $2, $3, COALESCE($4, CURRENT_DATE), $5, $6)
    RETURNING *
    `,
    [
      facturaId,
      tramiteId || null,
      monto,
      fechaPago || null,
      usuario || null,
      notas || null
    ]
  );

  return rows[0] || null;
};

const updateFacturasEstadoPorSaldoByTramite = async (tramiteId, client) => {
  const { rows } = await getDb(client).query(
    `
    WITH saldos AS (
      SELECT
        td.factura_id,
        ${facturaEstadoOperativoExpression} AS estado_anterior,
        ${totalPagoPrincipalExpression} AS saldo_pago_principal
      FROM tramites_pago_documentos td
      JOIN facturas f ON f.id = td.factura_id
      ${facturaWorkflowPagoJoin}
      LEFT JOIN facturas_contabilizacion fc ON fc.factura_id = f.id
      WHERE td.tramite_id = $1
        AND ${tesoreriaActivaSql('td.estado_tesoreria')}
    ),
    upsert AS (
      INSERT INTO facturas_workflow_pago_estado (factura_id, estado)
      SELECT
        s.factura_id,
        CASE
          WHEN s.saldo_pago_principal > 0 THEN '${FACTURA_ESTADOS.PAGADO_PARCIALMENTE}'
          ELSE '${FACTURA_ESTADOS.PAGADO}'
        END
      FROM saldos s
      ON CONFLICT (factura_id)
      DO UPDATE SET
        estado = EXCLUDED.estado,
        actualizado_en = CURRENT_TIMESTAMP
      RETURNING factura_id, estado
    )
    SELECT
      u.factura_id AS id,
      s.estado_anterior,
      u.estado AS estado_nuevo
    FROM upsert u
    JOIN saldos s ON s.factura_id = u.factura_id
    `,
    [tramiteId]
  );

  return rows;
};

const applyRetencionesPagadasByTramite = async ({ tramiteId, usuario }, client) => {
  const { rows } = await getDb(client).query(
    `
    WITH seleccion AS (
      SELECT tr.factura_id
      FROM tramites_pago_retenciones tr
      WHERE tr.tramite_id = $1
        AND ${tesoreriaActivaSql('tr.estado_tesoreria')}
    ),
    pendientes AS (
      SELECT
        s.factura_id,
        fc.id AS contabilizacion_id,
        GREATEST(COALESCE(fc.retencion, 0) - COALESCE(fc.retencion_pagada, 0), 0) AS monto
      FROM seleccion s
      JOIN facturas_contabilizacion fc ON fc.factura_id = s.factura_id
      WHERE GREATEST(COALESCE(fc.retencion, 0) - COALESCE(fc.retencion_pagada, 0), 0) > 0
    ),
    pagos AS (
      INSERT INTO facturas_retenciones_pagos (
        factura_id,
        contabilizacion_id,
        monto,
        fecha_pago,
        usuario,
        notas
      )
      SELECT
        p.factura_id,
        p.contabilizacion_id,
        p.monto,
        CURRENT_DATE,
        $2,
        CONCAT('Pago de retencion en tramite #', $1)
      FROM pendientes p
      RETURNING monto
    ),
    actualizacion AS (
      UPDATE facturas_contabilizacion fc
      SET
        retencion_pagada = GREATEST(COALESCE(fc.retencion, 0), 0),
        estado_retencion = 'pagada',
        fecha_ultimo_pago_retencion = CURRENT_DATE,
        actualizado_en = CURRENT_TIMESTAMP
      FROM pendientes p
      WHERE fc.id = p.contabilizacion_id
      RETURNING fc.factura_id
    )
    SELECT
      (SELECT COUNT(*)::int FROM pagos) AS pagos_registrados,
      COALESCE((SELECT SUM(monto) FROM pagos), 0) AS monto_total
    `,
    [tramiteId, usuario || null]
  );

  return rows[0] || { pagos_registrados: 0, monto_total: 0 };
};

const updateDocumentoDecision = async ({ tramiteId, facturaId, columnas, decision, motivo }, client) => {
  const { rows } = await getDb(client).query(
    `
    UPDATE tramites_pago_documentos
    SET ${columnas.estado} = $1,
        ${columnas.motivo} = $2,
        actualizado_en = CURRENT_TIMESTAMP
    WHERE tramite_id = $3 AND factura_id = $4
    RETURNING *
    `,
    [decision, motivo || null, tramiteId, facturaId]
  );
  return rows[0] || null;
};

module.exports = {
  getClient,
  getTramiteEstado,
  getTramiteById,
  getSociedadById,
  getTramiteByIdForUpdate,
  getTramiteCaratulaByTramiteId,
  upsertTramiteCaratula,
  listTramiteCaratulaProvidersByTramiteId,
  listTramiteCaratulaProviderFacturasByTramiteId,
  listTramiteCaratulaOrphansByTramiteId,
  getTramiteCaratulaProviderByKeyForUpdate,
  getTramiteCaratulaOrphanByIdForUpdate,
  upsertTramiteCaratulaProvider,
  replaceTramiteCaratulaProviderFacturas,
  insertTramiteCaratulaOrphan,
  updateTramiteCaratulaOrphanStatus,
  deleteTramiteCaratulaProvidersByTramiteId,
  deleteTramiteCaratulaOrphansByTramiteId,
  getFacturaEstado,
  getDocumentoTesoreriaEstado,
  getTramiteDocumentoByFacturaIdForUpdate,
  updateDocumentoTesoreriaExcluido,
  updateDocumentoTesoreriaReset,
  updateDocumentoTesoreriaPendiente,
  updateDocumentosTesoreriaEstadoByTramite,
  updateRetencionesTesoreriaEstadoByTramite,
  updateFacturaEstado,
  updateFacturasEstadoByIds,
  insertHistorialDocumentoConEstados,
  insertHistorialConEstados,
  insertHistorialDocumento,
  insertHistorialTramite,
  touchTramite,
  updateTramiteEstado,
  listTramites,
  getRetencionesDisponibles,
  listDocumentosByTramite,
  listRetencionesByTramite,
  listHistorialByTramite,
  getFacturasByIds,
  getRetencionesPendientesByFacturaIds,
  findDuplicadosActivos,
  findRetencionesDuplicadasActivas,
  insertTramite,
  insertTramiteDocumentos,
  listCentroCostoAprobadoresByFacturaIds,
  insertTramiteDocumentoAprobadores,
  listTramiteDocumentoAprobadores,
  listTramiteDocumentoAprobadoresForUpdate,
  updateTramiteDocumentoAprobadorEstado,
  resetTramiteDocumentoAprobadores,
  insertTramiteRetenciones,
  listSaldosPagoPrincipalByTramite,
  updateMontosPagoProgramadoByTramite,
  countRechazadosActivos,
  getResumenEtapaDocumentos,
  insertPagoFactura,
  updateFacturasEstadoPorSaldoByTramite,
  applyRetencionesPagadasByTramite,
  updateDocumentoDecision
};
