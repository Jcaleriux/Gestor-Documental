const pool = require('../db');
const { tesoreriaActivaSql, buildTesoreriaResetQuery } = require('../services/tramitesPagoQueries');
const { TESORERIA_ESTADOS, TRAMITE_ESTADOS, DOCUMENTO_ESTADOS } = require('../domain/tramitesPago');
const { FACTURA_ESTADOS } = require('../domain/facturas');
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
const ETAPA_ESTADO_COLUMN_MAP = Object.freeze({
  gerencia: 'estado_gerencia',
  gerencia_contable: 'estado_gerencia_contable',
  financiera: 'estado_financiero'
});

const getDb = (client) => client || pool;

const getClient = () => pool.connect();
const normalizePositiveIntOrNull = (value) => {
  const normalized = Number(value);
  return Number.isInteger(normalized) && normalized > 0 ? normalized : null;
};

const getTramiteEstado = async (tramiteId, client) => {
  const { rows } = await getDb(client).query('SELECT estado FROM tramites_pago WHERE id = $1', [tramiteId]);
  return rows[0] || null;
};

const getTramiteById = async (tramiteId, client) => {
  const { rows } = await getDb(client).query('SELECT * FROM tramites_pago WHERE id = $1', [tramiteId]);
  return rows[0] || null;
};

const getTramiteByIdForUpdate = async (tramiteId, client) => {
  const { rows } = await getDb(client).query(
    'SELECT * FROM tramites_pago WHERE id = $1 FOR UPDATE',
    [tramiteId]
  );
  return rows[0] || null;
};

const getFacturaEstado = async (facturaId, client) => {
  const { rows } = await getDb(client).query('SELECT estado FROM facturas WHERE id = $1', [facturaId]);
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

const listTramites = async ({ sociedadId, estado } = {}, client) => {
  const params = [];
  const where = [];

  if (sociedadId) {
    params.push(sociedadId);
    where.push(`t.sociedad_id = $${params.length}`);
  }
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
      f.estado,
      COALESCE(f.resumen->'CodigoTipoMoneda'->>'CodigoMoneda', f.resumen->>'CodigoMoneda', f.resumen->>'codigoMoneda', 'CRC') AS moneda,
      p.id AS proveedor_id,
      p.nombre AS proveedor_nombre,
      p.identificacion_numero AS proveedor_identificacion,
      ${retencionPendienteExpression} AS monto_retencion_pendiente
    FROM facturas f
    JOIN facturas_contabilizacion fc ON fc.factura_id = f.id
    LEFT JOIN proveedores p ON p.id = fc.proveedor_id
    WHERE f.sociedad_id = $1
      AND f.estado = '${FACTURA_ESTADOS.PAGADO}'
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
  const { rows } = await getDb(client).query(
    `
    SELECT
      td.*,
      f.clave,
      f.consecutivo,
      f.fecha_emision,
      f.emisor,
      f.resumen,
      f.estado,
      f.ruta_pdf,
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
      fc.centro_costo AS conta_centro_costo,
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
    LEFT JOIN facturas_contabilizacion fc ON fc.factura_id = f.id
    LEFT JOIN LATERAL (
      WITH existing_approvers AS (
        SELECT
          tda.usuario_aprobador_id,
          tda.usuario_aprobador_nombre,
          tda.usuario_aprobador_email,
          tda.estado_gerencia AS estado_aprobacion,
          tda.motivo_gerencia AS motivo_aprobacion,
          tda.decision_en
        FROM tramites_pago_documentos_aprobadores tda
        WHERE tda.tramite_id = td.tramite_id
          AND tda.factura_id = td.factura_id
      ),
      fallback_approvers AS (
        SELECT DISTINCT
          NULLIF(linea->>'usuario_aprobador_id', '')::int AS usuario_aprobador_id,
          NULLIF(BTRIM(COALESCE(linea->>'usuario_aprobador_nombre', '')), '') AS usuario_aprobador_nombre,
          NULLIF(BTRIM(COALESCE(linea->>'usuario_aprobador_email', '')), '') AS usuario_aprobador_email,
          '${DOCUMENTO_ESTADOS.PENDIENTE}'::character varying AS estado_aprobacion,
          NULL::text AS motivo_aprobacion,
          NULL::timestamp without time zone AS decision_en
        FROM jsonb_array_elements(COALESCE(fc.metadata->'centros_costo_lineas', '[]'::jsonb)) AS linea
        WHERE NOT EXISTS (SELECT 1 FROM existing_approvers)
          AND NULLIF(linea->>'usuario_aprobador_id', '') ~ '^[0-9]+$'
      ),
      approvers AS (
        SELECT * FROM existing_approvers
        UNION ALL
        SELECT * FROM fallback_approvers
      )
      SELECT
        COUNT(*)::int AS gerencia_aprobadores_total,
        COUNT(*) FILTER (WHERE estado_aprobacion = '${DOCUMENTO_ESTADOS.APROBADO}')::int AS gerencia_aprobadores_aprobados,
        COUNT(*) FILTER (WHERE estado_aprobacion = '${DOCUMENTO_ESTADOS.PENDIENTE}')::int AS gerencia_aprobadores_pendientes,
        COUNT(*) FILTER (WHERE estado_aprobacion = '${DOCUMENTO_ESTADOS.RECHAZADO}')::int AS gerencia_aprobadores_rechazados,
        COALESCE(BOOL_OR(usuario_aprobador_id = $2 AND estado_aprobacion = '${DOCUMENTO_ESTADOS.PENDIENTE}'), false) AS gerencia_puede_aprobar_usuario_actual,
        COALESCE(BOOL_OR(usuario_aprobador_id = $2 AND estado_aprobacion = '${DOCUMENTO_ESTADOS.APROBADO}'), false) AS gerencia_ya_aprobo_usuario_actual,
        COALESCE(
          jsonb_agg(
            jsonb_build_object(
              'usuario_aprobador_id', usuario_aprobador_id,
              'usuario_aprobador_nombre', usuario_aprobador_nombre,
              'usuario_aprobador_email', usuario_aprobador_email,
              'estado', estado_aprobacion,
              'motivo', motivo_aprobacion,
              'decision_en', decision_en
            )
            ORDER BY COALESCE(usuario_aprobador_nombre, usuario_aprobador_email, usuario_aprobador_id::text)
          ) FILTER (WHERE usuario_aprobador_id IS NOT NULL),
          '[]'::jsonb
        ) AS gerencia_aprobadores
      FROM approvers
    ) gerencia ON true
    WHERE td.tramite_id = $1
    ORDER BY f.fecha_emision DESC NULLS LAST, f.id DESC
    `,
    [tramiteId, currentUserId]
  );

  return rows;
};

const listSaldosPagoPrincipalByTramite = async (tramiteId, client) => {
  const { rows } = await getDb(client).query(
    `
    SELECT
      td.factura_id,
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
      f.estado,
      f.emisor,
      COALESCE(f.resumen->'CodigoTipoMoneda'->>'CodigoMoneda', f.resumen->>'CodigoMoneda', f.resumen->>'codigoMoneda', 'CRC') AS moneda,
      p.nombre AS proveedor_nombre,
      p.identificacion_numero AS proveedor_identificacion
    FROM tramites_pago_retenciones tr
    JOIN facturas f ON f.id = tr.factura_id
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
    'SELECT id, sociedad_id, estado FROM facturas WHERE id = ANY($1::int[])',
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
      f.estado,
      fc.proveedor_id,
      ${retencionPendienteExpression} AS monto_retencion_pendiente
    FROM facturas f
    JOIN facturas_contabilizacion fc ON fc.factura_id = f.id
    WHERE f.id = ANY($1::int[])
      AND f.estado = '${FACTURA_ESTADOS.PAGADO}'
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
        NULLIF(BTRIM(COALESCE(linea->>'usuario_aprobador_email', '')), '') AS usuario_aprobador_email
      FROM facturas_contabilizacion fc
      CROSS JOIN LATERAL jsonb_array_elements(COALESCE(fc.metadata->'centros_costo_lineas', '[]'::jsonb)) AS linea
      WHERE fc.factura_id = ANY($1::int[])
    )
    SELECT DISTINCT ON (factura_id, usuario_aprobador_id_raw::int)
      factura_id,
      usuario_aprobador_id_raw::int AS usuario_aprobador_id,
      usuario_aprobador_nombre,
      usuario_aprobador_email
    FROM raw
    WHERE usuario_aprobador_id_raw ~ '^[0-9]+$'
    ORDER BY factura_id, usuario_aprobador_id_raw::int, usuario_aprobador_nombre NULLS LAST, usuario_aprobador_email NULLS LAST
    `,
    [facturaIds]
  );

  return rows;
};

const insertTramiteDocumentoAprobadores = async ({ tramiteId, aprobadores }, client) => {
  if (!Array.isArray(aprobadores) || aprobadores.length === 0) {
    return;
  }

  const facturaIds = aprobadores.map((item) => Number(item.factura_id));
  const usuarioIds = aprobadores.map((item) => Number(item.usuario_aprobador_id));
  const nombres = aprobadores.map((item) => item.usuario_aprobador_nombre || null);
  const emails = aprobadores.map((item) => item.usuario_aprobador_email || null);

  await getDb(client).query(
    `
    INSERT INTO tramites_pago_documentos_aprobadores (
      tramite_id,
      factura_id,
      usuario_aprobador_id,
      usuario_aprobador_nombre,
      usuario_aprobador_email
    )
    SELECT
      $1,
      x.factura_id,
      x.usuario_aprobador_id,
      x.usuario_aprobador_nombre,
      x.usuario_aprobador_email
    FROM UNNEST($2::int[], $3::int[], $4::text[], $5::text[])
      AS x(factura_id, usuario_aprobador_id, usuario_aprobador_nombre, usuario_aprobador_email)
    ON CONFLICT (tramite_id, factura_id, usuario_aprobador_id) DO NOTHING
    `,
    [tramiteId, facturaIds, usuarioIds, nombres, emails]
  );
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
      estado_gerencia,
      motivo_gerencia,
      decision_en,
      creado_en,
      actualizado_en
    FROM tramites_pago_documentos_aprobadores
    WHERE ${where.join(' AND ')}
    ORDER BY factura_id ASC, usuario_aprobador_nombre ASC NULLS LAST, usuario_aprobador_email ASC NULLS LAST, usuario_aprobador_id ASC
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
      estado_gerencia,
      motivo_gerencia,
      decision_en,
      creado_en,
      actualizado_en
    FROM tramites_pago_documentos_aprobadores
    WHERE tramite_id = $1
      AND factura_id = $2
    ORDER BY usuario_aprobador_nombre ASC NULLS LAST, usuario_aprobador_email ASC NULLS LAST, usuario_aprobador_id ASC
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
  estado,
  motivo
}, client) => {
  const { rows } = await getDb(client).query(
    `
    UPDATE tramites_pago_documentos_aprobadores
    SET
      estado_gerencia = $1,
      motivo_gerencia = $2,
      decision_en = CURRENT_TIMESTAMP,
      actualizado_en = CURRENT_TIMESTAMP
    WHERE tramite_id = $3
      AND factura_id = $4
      AND usuario_aprobador_id = $5
    RETURNING *
    `,
    [estado, motivo || null, tramiteId, facturaId, usuarioAprobadorId]
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
        f.estado AS estado_anterior,
        ${totalPagoPrincipalExpression} AS saldo_pago_principal
      FROM tramites_pago_documentos td
      JOIN facturas f ON f.id = td.factura_id
      LEFT JOIN facturas_contabilizacion fc ON fc.factura_id = f.id
      WHERE td.tramite_id = $1
        AND ${tesoreriaActivaSql('td.estado_tesoreria')}
    )
    UPDATE facturas f
    SET estado = CASE
      WHEN s.saldo_pago_principal > 0 THEN '${FACTURA_ESTADOS.PAGADO_PARCIALMENTE}'
      ELSE '${FACTURA_ESTADOS.PAGADO}'
    END
    FROM saldos s
    WHERE f.id = s.factura_id
    RETURNING f.id, s.estado_anterior, f.estado AS estado_nuevo
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
  getTramiteByIdForUpdate,
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
  countRechazadosActivos,
  getResumenEtapaDocumentos,
  insertPagoFactura,
  updateFacturasEstadoPorSaldoByTramite,
  applyRetencionesPagadasByTramite,
  updateDocumentoDecision
};
