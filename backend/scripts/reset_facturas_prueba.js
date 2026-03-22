const fs = require('fs');
const path = require('path');
const pool = require('../db');

const RESET_ESTADO_DESTINO = 'no_contabilizado';
const DEFAULT_SAMPLE_LIMIT = 20;
const CONFIRM_FLAG = '--confirm-reset-facturas-prueba';
const NO_BACKUP_FLAG = '--no-backup';

const parsePositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const parseFacturaIdsArg = (argv) => {
  const facturaIdsArg = argv.find((arg) => arg.startsWith('--factura-ids='));
  if (!facturaIdsArg) {
    return null;
  }

  const raw = facturaIdsArg.slice('--factura-ids='.length);
  const facturaIds = raw
    .split(',')
    .map((value) => Number.parseInt(value.trim(), 10))
    .filter((value) => Number.isInteger(value) && value > 0);

  return facturaIds.length > 0 ? [...new Set(facturaIds)] : [];
};

const parseArgs = (argv) => {
  const sampleLimitArg = argv.find((arg) => arg.startsWith('--sample-limit='));
  const sampleLimit = parsePositiveInt(
    sampleLimitArg ? sampleLimitArg.slice('--sample-limit='.length) : '',
    DEFAULT_SAMPLE_LIMIT
  );

  return {
    apply: argv.includes('--apply'),
    confirm: argv.includes(CONFIRM_FLAG),
    noBackup: argv.includes(NO_BACKUP_FLAG),
    sampleLimit,
    facturaIdsFilter: parseFacturaIdsArg(argv)
  };
};

const ensureOutputDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

const buildOutputPath = ({ apply }) => {
  const baseDir = path.join(__dirname, 'salidas');
  ensureOutputDir(baseDir);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  let filename = `reset_facturas_prueba_dry_run_${timestamp}.json`;

  if (apply) {
    filename = `reset_facturas_prueba_apply_${timestamp}.json`;
  }

  return path.join(baseDir, filename);
};

const writeJsonFile = (targetPath, payload) => {
  fs.writeFileSync(targetPath, JSON.stringify(payload, null, 2), 'utf8');
};

const tableExists = async (client, tableName) => {
  const { rows } = await client.query(
    `SELECT to_regclass($1) IS NOT NULL AS exists`,
    [`public.${tableName}`]
  );

  return Boolean(rows[0]?.exists);
};

const countRowsIfTableExists = async (client, tableName, filterColumn = null, values = []) => {
  if (!(await tableExists(client, tableName))) {
    return 0;
  }

  if (!filterColumn) {
    return countRows(client, `SELECT COUNT(*)::int AS total FROM ${tableName}`);
  }

  return countRows(
    client,
    `SELECT COUNT(*)::int AS total FROM ${tableName} WHERE ${filterColumn} = ANY($1::int[])`,
    [values]
  );
};

const selectAllIfTableExists = async (client, tableName, filterColumn, values) => {
  if (!(await tableExists(client, tableName))) {
    return [];
  }

  const { rows } = await client.query(
    `SELECT * FROM ${tableName} WHERE ${filterColumn} = ANY($1::int[]) ORDER BY id ASC`,
    [values]
  );

  return rows;
};

const deleteIfTableExists = async (client, tableName, filterColumn, values) => {
  if (!(await tableExists(client, tableName))) {
    return;
  }

  await client.query(
    `DELETE FROM ${tableName} WHERE ${filterColumn} = ANY($1::int[])`,
    [values]
  );
};

const getCandidateFacturaIds = async (client, facturaIdsFilter) => {
  if (Array.isArray(facturaIdsFilter)) {
    return facturaIdsFilter;
  }

  const { rows } = await client.query(
    `
    WITH candidate_facturas AS (
      SELECT f.id AS factura_id
      FROM facturas f
      WHERE f.estado <> $1

      UNION

      SELECT factura_id
      FROM facturas_workflow_pago_estado

      UNION

      SELECT factura_id
      FROM facturas_contabilizacion

      UNION

      SELECT factura_id
      FROM facturas_pagos

      UNION

      SELECT factura_id
      FROM facturas_retenciones_pagos

      UNION

      SELECT factura_id
      FROM facturas_estado_documental_historial

      UNION

      SELECT factura_id
      FROM facturas_workflow_pago_historial

      UNION

      SELECT factura_id
      FROM facturas_estado_mixto_historial

      UNION

      SELECT factura_id
      FROM tramites_pago_documentos

      UNION

      SELECT factura_id
      FROM tramites_pago_retenciones

      UNION

      SELECT factura_id
      FROM tramites_pago_documentos_aprobadores
    )
    SELECT factura_id::int
    FROM candidate_facturas
    ORDER BY factura_id ASC
    `,
    [RESET_ESTADO_DESTINO]
  );

  return rows.map((row) => row.factura_id);
};

const getLinkedTramiteIds = async (client, facturaIds) => {
  if (!Array.isArray(facturaIds) || facturaIds.length === 0) {
    return [];
  }

  const { rows } = await client.query(
    `
    WITH linked_tramites AS (
      SELECT td.tramite_id
      FROM tramites_pago_documentos td
      WHERE td.factura_id = ANY($1::int[])

      UNION

      SELECT tr.tramite_id
      FROM tramites_pago_retenciones tr
      WHERE tr.factura_id = ANY($1::int[])

      UNION

      SELECT h.tramite_id
      FROM tramites_pago_historial h
      WHERE h.factura_id = ANY($1::int[])
        AND h.tramite_id IS NOT NULL

      UNION

      SELECT tda.tramite_id
      FROM tramites_pago_documentos_aprobadores tda
      WHERE tda.factura_id = ANY($1::int[])
    )
    SELECT tramite_id::int
    FROM linked_tramites
    ORDER BY tramite_id ASC
    `,
    [facturaIds]
  );

  return rows.map((row) => row.tramite_id);
};

const getOrdenCompraIds = async (client, facturaIds) => {
  if (!Array.isArray(facturaIds) || facturaIds.length === 0) {
    return [];
  }

  const { rows } = await client.query(
    `
    SELECT DISTINCT orden_compra_id::int AS orden_compra_id
    FROM facturas_contabilizacion
    WHERE factura_id = ANY($1::int[])
      AND orden_compra_id IS NOT NULL
    ORDER BY orden_compra_id ASC
    `,
    [facturaIds]
  );

  return rows.map((row) => row.orden_compra_id);
};

const countRows = async (client, sql, params = []) => {
  const { rows } = await client.query(sql, params);
  return Number(rows[0]?.total || 0);
};

const buildCountMap = async (client, facturaIds, tramiteIds) => {
  const hasFacturas = Array.isArray(facturaIds) && facturaIds.length > 0;
  const hasTramites = Array.isArray(tramiteIds) && tramiteIds.length > 0;

  const counts = {
    facturas: hasFacturas ? facturaIds.length : 0,
    facturas_workflow_pago_estado: 0,
    facturas_contabilizacion: 0,
    facturas_pagos: 0,
    facturas_retenciones_pagos: 0,
    facturas_estado_documental_historial: 0,
    facturas_workflow_pago_historial: 0,
    facturas_estado_mixto_historial: 0,
    auditoria: 0,
    comentarios_documento: 0,
    versiones_documento: 0,
    tramites_pago: hasTramites ? tramiteIds.length : 0,
    tramites_pago_documentos: 0,
    tramites_pago_documentos_aprobadores: 0,
    tramites_pago_retenciones: 0,
    tramites_pago_historial: 0
  };

  if (!hasFacturas) {
    return counts;
  }

  const [
    facturasWorkflowPagoEstado,
    facturasContabilizacion,
    facturasPagos,
    facturasRetencionesPagos,
    facturasEstadoDocumentalHistorial,
    facturasWorkflowPagoHistorial,
    facturasEstadoMixtoHistorial,
    auditoria,
    comentariosDocumento,
    versionesDocumento
  ] = await Promise.all([
    countRowsIfTableExists(client, 'facturas_workflow_pago_estado', 'factura_id', facturaIds),
    countRowsIfTableExists(client, 'facturas_contabilizacion', 'factura_id', facturaIds),
    countRowsIfTableExists(client, 'facturas_pagos', 'factura_id', facturaIds),
    countRowsIfTableExists(client, 'facturas_retenciones_pagos', 'factura_id', facturaIds),
    countRowsIfTableExists(client, 'facturas_estado_documental_historial', 'factura_id', facturaIds),
    countRowsIfTableExists(client, 'facturas_workflow_pago_historial', 'factura_id', facturaIds),
    countRowsIfTableExists(client, 'facturas_estado_mixto_historial', 'factura_id', facturaIds),
    countRowsIfTableExists(client, 'auditoria', 'factura_id', facturaIds),
    countRowsIfTableExists(client, 'comentarios_documento', 'factura_id', facturaIds),
    countRowsIfTableExists(client, 'versiones_documento', 'factura_id', facturaIds)
  ]);

  counts.facturas_workflow_pago_estado = facturasWorkflowPagoEstado;
  counts.facturas_contabilizacion = facturasContabilizacion;
  counts.facturas_pagos = facturasPagos;
  counts.facturas_retenciones_pagos = facturasRetencionesPagos;
  counts.facturas_estado_documental_historial = facturasEstadoDocumentalHistorial;
  counts.facturas_workflow_pago_historial = facturasWorkflowPagoHistorial;
  counts.facturas_estado_mixto_historial = facturasEstadoMixtoHistorial;
  counts.auditoria = auditoria;
  counts.comentarios_documento = comentariosDocumento;
  counts.versiones_documento = versionesDocumento;

  if (!hasTramites) {
    return counts;
  }

  const [
    tramitesPagoDocumentos,
    tramitesPagoDocumentosAprobadores,
    tramitesPagoRetenciones,
    tramitesPagoHistorial
  ] = await Promise.all([
    countRows(client, 'SELECT COUNT(*)::int AS total FROM tramites_pago_documentos WHERE tramite_id = ANY($1::int[])', [tramiteIds]),
    countRows(client, 'SELECT COUNT(*)::int AS total FROM tramites_pago_documentos_aprobadores WHERE tramite_id = ANY($1::int[])', [tramiteIds]),
    countRows(client, 'SELECT COUNT(*)::int AS total FROM tramites_pago_retenciones WHERE tramite_id = ANY($1::int[])', [tramiteIds]),
    countRows(client, 'SELECT COUNT(*)::int AS total FROM tramites_pago_historial WHERE tramite_id = ANY($1::int[])', [tramiteIds])
  ]);

  counts.tramites_pago_documentos = tramitesPagoDocumentos;
  counts.tramites_pago_documentos_aprobadores = tramitesPagoDocumentosAprobadores;
  counts.tramites_pago_retenciones = tramitesPagoRetenciones;
  counts.tramites_pago_historial = tramitesPagoHistorial;

  return counts;
};

const getFacturasEstadoResumen = async (client, facturaIds) => {
  if (!Array.isArray(facturaIds) || facturaIds.length === 0) {
    return [];
  }

  const { rows } = await client.query(
    `
    SELECT
      f.estado AS estado_documental,
      COALESCE(fwp.estado, 'sin_workflow') AS estado_workflow_pago,
      COUNT(*)::int AS total
    FROM facturas f
    LEFT JOIN facturas_workflow_pago_estado fwp ON fwp.factura_id = f.id
    WHERE f.id = ANY($1::int[])
    GROUP BY f.estado, COALESCE(fwp.estado, 'sin_workflow')
    ORDER BY total DESC, estado_documental ASC, estado_workflow_pago ASC
    `,
    [facturaIds]
  );

  return rows;
};

const getFacturasSample = async (client, facturaIds, sampleLimit) => {
  if (!Array.isArray(facturaIds) || facturaIds.length === 0) {
    return [];
  }

  const { rows } = await client.query(
    `
    SELECT
      f.id,
      f.sociedad_id,
      f.consecutivo,
      f.clave,
      f.estado AS estado_documental,
      fwp.estado AS estado_workflow_pago,
      COALESCE(fwp.estado, f.estado) AS estado_operativo,
      (fc.factura_id IS NOT NULL) AS tiene_contabilizacion,
      COALESCE(fp.total_pagos, 0)::int AS total_pagos_principales,
      COALESCE(rp.total_pagos_retencion, 0)::int AS total_pagos_retencion,
      COALESCE(td.total_tramites, 0)::int AS total_tramites_vinculados
    FROM facturas f
    LEFT JOIN facturas_workflow_pago_estado fwp ON fwp.factura_id = f.id
    LEFT JOIN facturas_contabilizacion fc ON fc.factura_id = f.id
    LEFT JOIN LATERAL (
      SELECT COUNT(*)::int AS total_pagos
      FROM facturas_pagos fp
      WHERE fp.factura_id = f.id
    ) fp ON TRUE
    LEFT JOIN LATERAL (
      SELECT COUNT(*)::int AS total_pagos_retencion
      FROM facturas_retenciones_pagos rp
      WHERE rp.factura_id = f.id
    ) rp ON TRUE
    LEFT JOIN LATERAL (
      SELECT COUNT(*)::int AS total_tramites
      FROM (
        SELECT td.tramite_id
        FROM tramites_pago_documentos td
        WHERE td.factura_id = f.id

        UNION

        SELECT tr.tramite_id
        FROM tramites_pago_retenciones tr
        WHERE tr.factura_id = f.id
      ) linked
    ) td ON TRUE
    WHERE f.id = ANY($1::int[])
    ORDER BY f.id DESC
    LIMIT $2
    `,
    [facturaIds, sampleLimit]
  );

  return rows;
};

const getTramitesSample = async (client, tramiteIds, sampleLimit) => {
  if (!Array.isArray(tramiteIds) || tramiteIds.length === 0) {
    return [];
  }

  const { rows } = await client.query(
    `
    SELECT
      t.id,
      t.sociedad_id,
      t.estado,
      t.creado_por,
      t.creado_en,
      COALESCE(td.total_documentos, 0)::int AS total_documentos,
      COALESCE(tr.total_retenciones, 0)::int AS total_retenciones,
      COALESCE(th.total_historial, 0)::int AS total_historial
    FROM tramites_pago t
    LEFT JOIN LATERAL (
      SELECT COUNT(*)::int AS total_documentos
      FROM tramites_pago_documentos td
      WHERE td.tramite_id = t.id
    ) td ON TRUE
    LEFT JOIN LATERAL (
      SELECT COUNT(*)::int AS total_retenciones
      FROM tramites_pago_retenciones tr
      WHERE tr.tramite_id = t.id
    ) tr ON TRUE
    LEFT JOIN LATERAL (
      SELECT COUNT(*)::int AS total_historial
      FROM tramites_pago_historial th
      WHERE th.tramite_id = t.id
    ) th ON TRUE
    WHERE t.id = ANY($1::int[])
    ORDER BY t.id DESC
    LIMIT $2
    `,
    [tramiteIds, sampleLimit]
  );

  return rows;
};

const getTotalTramites = async (client) => (
  countRows(client, 'SELECT COUNT(*)::int AS total FROM tramites_pago')
);

const getBackupRows = async (client, facturaIds, tramiteIds) => {
  const hasFacturas = Array.isArray(facturaIds) && facturaIds.length > 0;
  const hasTramites = Array.isArray(tramiteIds) && tramiteIds.length > 0;

  const empty = {
    facturas: [],
    facturas_workflow_pago_estado: [],
    facturas_contabilizacion: [],
    facturas_pagos: [],
    facturas_retenciones_pagos: [],
    auditoria: [],
    comentarios_documento: [],
    versiones_documento: [],
    facturas_estado_documental_historial: [],
    facturas_workflow_pago_historial: [],
    facturas_estado_mixto_historial: [],
    tramites_pago: [],
    tramites_pago_documentos: [],
    tramites_pago_documentos_aprobadores: [],
    tramites_pago_retenciones: [],
    tramites_pago_historial: []
  };

  if (!hasFacturas) {
    return empty;
  }

  const [
    facturas,
    facturasWorkflowPagoEstado,
    facturasContabilizacion,
    facturasPagos,
    facturasRetencionesPagos,
    auditoria,
    comentariosDocumento,
    versionesDocumento,
    facturasEstadoDocumentalHistorial,
    facturasWorkflowPagoHistorial,
    facturasEstadoMixtoHistorial,
    tramitesPago,
    tramitesPagoDocumentos,
    tramitesPagoDocumentosAprobadores,
    tramitesPagoRetenciones,
    tramitesPagoHistorial
  ] = await Promise.all([
    client.query('SELECT * FROM facturas WHERE id = ANY($1::int[]) ORDER BY id ASC', [facturaIds]).then((result) => result.rows),
    selectAllIfTableExists(client, 'facturas_workflow_pago_estado', 'factura_id', facturaIds),
    selectAllIfTableExists(client, 'facturas_contabilizacion', 'factura_id', facturaIds),
    selectAllIfTableExists(client, 'facturas_pagos', 'factura_id', facturaIds),
    selectAllIfTableExists(client, 'facturas_retenciones_pagos', 'factura_id', facturaIds),
    selectAllIfTableExists(client, 'auditoria', 'factura_id', facturaIds),
    selectAllIfTableExists(client, 'comentarios_documento', 'factura_id', facturaIds),
    selectAllIfTableExists(client, 'versiones_documento', 'factura_id', facturaIds),
    selectAllIfTableExists(client, 'facturas_estado_documental_historial', 'factura_id', facturaIds),
    selectAllIfTableExists(client, 'facturas_workflow_pago_historial', 'factura_id', facturaIds),
    selectAllIfTableExists(client, 'facturas_estado_mixto_historial', 'factura_id', facturaIds),
    hasTramites
      ? client.query('SELECT * FROM tramites_pago WHERE id = ANY($1::int[]) ORDER BY id ASC', [tramiteIds]).then((result) => result.rows)
      : Promise.resolve([]),
    hasTramites
      ? client.query('SELECT * FROM tramites_pago_documentos WHERE tramite_id = ANY($1::int[]) ORDER BY id ASC', [tramiteIds]).then((result) => result.rows)
      : Promise.resolve([]),
    hasTramites
      ? client.query('SELECT * FROM tramites_pago_documentos_aprobadores WHERE tramite_id = ANY($1::int[]) ORDER BY id ASC', [tramiteIds]).then((result) => result.rows)
      : Promise.resolve([]),
    hasTramites
      ? client.query('SELECT * FROM tramites_pago_retenciones WHERE tramite_id = ANY($1::int[]) ORDER BY id ASC', [tramiteIds]).then((result) => result.rows)
      : Promise.resolve([]),
    hasTramites
      ? client.query('SELECT * FROM tramites_pago_historial WHERE tramite_id = ANY($1::int[]) ORDER BY id ASC', [tramiteIds]).then((result) => result.rows)
      : Promise.resolve([])
  ]);

  return {
    facturas,
    facturas_workflow_pago_estado: facturasWorkflowPagoEstado,
    facturas_contabilizacion: facturasContabilizacion,
    facturas_pagos: facturasPagos,
    facturas_retenciones_pagos: facturasRetencionesPagos,
    auditoria,
    comentarios_documento: comentariosDocumento,
    versiones_documento: versionesDocumento,
    facturas_estado_documental_historial: facturasEstadoDocumentalHistorial,
    facturas_workflow_pago_historial: facturasWorkflowPagoHistorial,
    facturas_estado_mixto_historial: facturasEstadoMixtoHistorial,
    tramites_pago: tramitesPago,
    tramites_pago_documentos: tramitesPagoDocumentos,
    tramites_pago_documentos_aprobadores: tramitesPagoDocumentosAprobadores,
    tramites_pago_retenciones: tramitesPagoRetenciones,
    tramites_pago_historial: tramitesPagoHistorial
  };
};

const refreshOrdenesCompra = async (client, ordenCompraIds) => {
  if (!Array.isArray(ordenCompraIds) || ordenCompraIds.length === 0) {
    return;
  }

  await client.query(
    `
    WITH consumo AS (
      SELECT
        oc.id AS orden_compra_id,
        COALESCE(SUM(
          CASE
            WHEN COALESCE(f.resumen->>'TotalComprobante', '') ~ '^-?[0-9]+(\\.[0-9]+)?$'
              THEN (f.resumen->>'TotalComprobante')::numeric
            ELSE 0
          END
        ), 0) AS total_consumido
      FROM ordenes_compra oc
      LEFT JOIN facturas_contabilizacion fc ON fc.orden_compra_id = oc.id
      LEFT JOIN facturas f ON f.id = fc.factura_id
      WHERE oc.id = ANY($1::int[])
      GROUP BY oc.id
    )
    UPDATE ordenes_compra oc
    SET
      estado = CASE
        WHEN COALESCE(consumo.total_consumido, 0) >= COALESCE(oc.monto, 0)
          THEN 'cerrada'
        ELSE 'abierta'
      END,
      actualizado_en = CURRENT_TIMESTAMP
    FROM consumo
    WHERE oc.id = consumo.orden_compra_id
    `,
    [ordenCompraIds]
  );
};

const buildWarnings = ({ totalTramites, linkedTramites, counts }) => {
  const warnings = [];

  if (totalTramites > linkedTramites) {
    warnings.push(
      `Existen ${totalTramites - linkedTramites} tramites de pago fuera del set de facturas candidatas.`
    );
  }

  if (counts.facturas_pagos > 0 || counts.facturas_retenciones_pagos > 0) {
    warnings.push(
      'Se detectaron pagos registrados; un reset aplicado eliminaria tambien esos movimientos de prueba.'
    );
  }

  if (counts.auditoria > 0 || counts.comentarios_documento > 0 || counts.versiones_documento > 0) {
    warnings.push(
      'El reset aplicado tambien limpiaria auditoria, comentarios y versiones ligados a estas facturas.'
    );
  }

  return warnings;
};

const buildReport = async (client, options) => {
  const facturaIds = await getCandidateFacturaIds(client, options.facturaIdsFilter);
  const linkedTramiteIds = await getLinkedTramiteIds(client, facturaIds);
  const ordenCompraIds = await getOrdenCompraIds(client, facturaIds);
  const totalTramites = await getTotalTramites(client);
  const counts = await buildCountMap(client, facturaIds, linkedTramiteIds);
  const [facturasEstadoResumen, facturasSample, tramitesSample] = await Promise.all([
    getFacturasEstadoResumen(client, facturaIds),
    getFacturasSample(client, facturaIds, options.sampleLimit),
    getTramitesSample(client, linkedTramiteIds, options.sampleLimit)
  ]);

  return {
    generado_en: new Date().toISOString(),
    modo: options.apply ? 'apply' : 'dry-run',
    criterio: {
      estado_destino_factura: RESET_ESTADO_DESTINO,
      filtro_factura_ids: Array.isArray(options.facturaIdsFilter) ? options.facturaIdsFilter : null,
      sample_limit: options.sampleLimit
    },
    resumen: {
      facturas_candidatas: facturaIds.length,
      tramites_vinculados: linkedTramiteIds.length,
      tramites_totales_en_bd: totalTramites,
      ordenes_compra_afectadas: ordenCompraIds.length,
      filas_afectadas: counts
    },
    warnings: buildWarnings({
      totalTramites,
      linkedTramites: linkedTramiteIds.length,
      counts
    }),
    ids: {
      factura_ids: facturaIds,
      tramite_ids_vinculados: linkedTramiteIds,
      orden_compra_ids: ordenCompraIds
    },
    distribucion_estados_factura: facturasEstadoResumen,
    muestras: {
      facturas: facturasSample,
      tramites: tramitesSample
    }
  };
};

const printReport = (report, outputPath) => {
  console.log('');
  console.log(`Reporte guardado en: ${outputPath}`);
  console.log(`Modo: ${report.modo}`);
  console.log(`Facturas candidatas: ${report.resumen.facturas_candidatas}`);
  console.log(`Tramites vinculados: ${report.resumen.tramites_vinculados}`);
  console.log(`Tramites totales en BD: ${report.resumen.tramites_totales_en_bd}`);
  console.log(`Ordenes de compra afectadas: ${report.resumen.ordenes_compra_afectadas}`);
  console.log('');
  console.log('Filas afectadas estimadas:');
  Object.entries(report.resumen.filas_afectadas).forEach(([key, value]) => {
    console.log(`- ${key}: ${value}`);
  });

  if (Array.isArray(report.warnings) && report.warnings.length > 0) {
    console.log('');
    console.log('Warnings:');
    report.warnings.forEach((warning) => {
      console.log(`- ${warning}`);
    });
  }
};

const applyReset = async (client, report) => {
  const facturaIds = report.ids.factura_ids;
  const tramiteIds = report.ids.tramite_ids_vinculados;
  const ordenCompraIds = report.ids.orden_compra_ids;

  if (!Array.isArray(facturaIds) || facturaIds.length === 0) {
    return;
  }

  await client.query('BEGIN');

  try {
    if (Array.isArray(tramiteIds) && tramiteIds.length > 0) {
      await client.query('DELETE FROM tramites_pago_documentos_aprobadores WHERE tramite_id = ANY($1::int[])', [tramiteIds]);
      await client.query('DELETE FROM tramites_pago_historial WHERE tramite_id = ANY($1::int[])', [tramiteIds]);
      await client.query('DELETE FROM tramites_pago_documentos WHERE tramite_id = ANY($1::int[])', [tramiteIds]);
      await client.query('DELETE FROM tramites_pago_retenciones WHERE tramite_id = ANY($1::int[])', [tramiteIds]);
      await client.query('DELETE FROM tramites_pago WHERE id = ANY($1::int[])', [tramiteIds]);
    }

    await client.query('DELETE FROM facturas_pagos WHERE factura_id = ANY($1::int[])', [facturaIds]);
    await client.query('DELETE FROM facturas_retenciones_pagos WHERE factura_id = ANY($1::int[])', [facturaIds]);
    await deleteIfTableExists(client, 'auditoria', 'factura_id', facturaIds);
    await deleteIfTableExists(client, 'comentarios_documento', 'factura_id', facturaIds);
    await deleteIfTableExists(client, 'versiones_documento', 'factura_id', facturaIds);
    await deleteIfTableExists(client, 'facturas_workflow_pago_estado', 'factura_id', facturaIds);
    await deleteIfTableExists(client, 'facturas_estado_documental_historial', 'factura_id', facturaIds);
    await deleteIfTableExists(client, 'facturas_workflow_pago_historial', 'factura_id', facturaIds);
    await deleteIfTableExists(client, 'facturas_estado_mixto_historial', 'factura_id', facturaIds);
    await deleteIfTableExists(client, 'facturas_contabilizacion', 'factura_id', facturaIds);
    await client.query(
      `
      UPDATE facturas
      SET estado = $2
      WHERE id = ANY($1::int[])
      `,
      [facturaIds, RESET_ESTADO_DESTINO]
    );

    await refreshOrdenesCompra(client, ordenCompraIds);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
};

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const client = await pool.connect();

  try {
    const report = await buildReport(client, options);
    const outputPath = buildOutputPath(options);
    const outputPayload = {
      ...report,
      backup_rows: options.apply && !options.noBackup
        ? await getBackupRows(client, report.ids.factura_ids, report.ids.tramite_ids_vinculados)
        : undefined
    };

    writeJsonFile(outputPath, outputPayload);

    if (options.apply) {
      if (!options.confirm) {
        throw new Error(
          `Modo apply bloqueado. Reintenta con ${CONFIRM_FLAG} si quieres ejecutar el reset real.`
        );
      }

      await applyReset(client, report);
      console.log('Reset aplicado correctamente sobre facturas y tramites de prueba.');
      console.log(
        options.noBackup
          ? `Reporte de ejecucion guardado en: ${outputPath}`
          : `Backup previo guardado en: ${outputPath}`
      );
      return;
    }

    printReport(report, outputPath);
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error('Error ejecutando el reset controlado de facturas de prueba:', error.message);
    process.exitCode = 1;
  });
}
