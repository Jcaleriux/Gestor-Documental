const fs = require('fs');
const path = require('path');
const { PDFDocument } = require('pdf-lib');
const { createError } = require('../utils/errors');
const {
  DOCUMENTS_DIR_NAME,
  TRAMITES_DIR_NAME
} = require('../utils/documentPaths');
const {
  buildDocumentsCatalog,
  buildDocumentOptionLabel,
  resolveSocietyMatch,
  resolveBestProviderMatch,
  applyAutomaticLineMatches,
  resolveTramiteCaratulaFilePath,
  deleteTramiteCaratulaFileIfExists,
  isCaratulaRequiredForEstado,
  summarizeStoredTramiteCaratula: summarizeLegacyStoredTramiteCaratula
} = require('./tramitesPagoCaratulasSupport');

const ATTACHMENT_STATUS = Object.freeze({
  SIN_CARATULA: 'sin_caratula',
  PENDIENTE_CONFIRMACION: 'pendiente_confirmacion',
  CONFIRMADA: 'confirmada'
});

const ATTACHMENT_ORIGIN = Object.freeze({
  AUTO: 'auto',
  MANUAL: 'manual',
  HUERFANA: 'huerfana'
});

const ORDER_STATUS = Object.freeze({
  NO_REQUERIDO: 'no_requerido',
  PENDIENTE_CONFIRMACION: 'pendiente_confirmacion',
  CONFIRMADO: 'confirmado'
});

const ORPHAN_STATUS = Object.freeze({
  PENDIENTE: 'pendiente',
  ASIGNADA: 'asignada',
  DESCARTADA: 'descartada'
});

const normalizeWhitespace = (value) => String(value || '')
  .replace(/\s+/g, ' ')
  .trim();

const stripDiacritics = (value) => String(value || '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '');

const normalizeIdentification = (value) => String(value || '')
  .replace(/[^0-9A-Za-z]/g, '')
  .toUpperCase();

const normalizeName = (value) => stripDiacritics(value)
  .toUpperCase()
  .replace(/[^0-9A-Z ]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const normalizeSafeFileName = (value) => String(value || '')
  .replace(/\.{2,}/g, '.')
  .replace(/^[._-]+/, '')
  .replace(/[._-]+$/, '');

const sanitizeFileName = (value) => {
  const raw = String(value || '').trim();
  const cleaned = normalizeSafeFileName(raw.replace(/[^0-9A-Za-z._-]/g, '_'));
  return cleaned || 'caratula.pdf';
};

const sanitizePdfBaseName = (value) => (
  normalizeSafeFileName(sanitizeFileName(value).replace(/\.pdf$/i, '')) || 'caratula'
);

const unique = (values) => Array.from(new Set((Array.isArray(values) ? values : []).filter(Boolean)));

const resolveCaratulaStorageRelativeDir = ({ sociedadId, tramiteId, bucket }) => (
  path.join(
    DOCUMENTS_DIR_NAME,
    TRAMITES_DIR_NAME,
    'caratulas',
    String(sociedadId),
    String(tramiteId),
    bucket
  )
);

const savePdfBuffer = ({
  baseDir,
  relativeDir,
  filenameBase,
  pdfBuffer
}) => {
  const fullDir = path.join(path.resolve(baseDir), relativeDir);
  fs.mkdirSync(fullDir, { recursive: true });

  let candidateBaseName = sanitizePdfBaseName(filenameBase);
  let attempt = 2;
  let fullPath = path.join(fullDir, `${candidateBaseName}.pdf`);
  while (fs.existsSync(fullPath)) {
    candidateBaseName = `${sanitizePdfBaseName(filenameBase)}_${attempt}`;
    attempt += 1;
    fullPath = path.join(fullDir, `${candidateBaseName}.pdf`);
  }

  fs.writeFileSync(fullPath, pdfBuffer);
  return path.join(relativeDir, `${candidateBaseName}.pdf`).replace(/\\/g, '/');
};

const extractPdfPages = async ({ sourcePdf, pageNumbers }) => {
  const normalizedPageNumbers = unique(
    (Array.isArray(pageNumbers) ? pageNumbers : [])
      .map((pageNumber) => Number(pageNumber))
      .filter((pageNumber) => Number.isInteger(pageNumber) && pageNumber > 0)
      .sort((left, right) => left - right)
  );

  if (normalizedPageNumbers.length === 0) {
    throw createError(400, 'No hay paginas validas para generar la caratula');
  }

  const nextPdf = await PDFDocument.create();
  const copiedPages = await nextPdf.copyPages(
    sourcePdf,
    normalizedPageNumbers.map((pageNumber) => pageNumber - 1)
  );
  copiedPages.forEach((page) => nextPdf.addPage(page));
  return Buffer.from(await nextPdf.save());
};

const buildPersistedGroupPayload = (group = {}, providerEntry = null) => ({
  version: 2,
  provider_key: providerEntry?.provider_key || group?.matched_provider?.provider_key || null,
  page_start: group.page_start || null,
  page_end: group.page_end || null,
  page_numbers: Array.isArray(group.page_numbers) ? [...group.page_numbers] : [],
  execution_date: group.execution_date || null,
  currency: group.currency || null,
  provider_raw_name: group.provider_raw_name || null,
  provider_raw_identification: group.provider_raw_identification || null,
  provider_code: group.provider_code || null,
  matched_provider: group.matched_provider || (
    providerEntry
      ? {
        provider_key: providerEntry.provider_key,
        provider_id: providerEntry.provider_id,
        provider_name: providerEntry.provider_name,
        provider_identification: providerEntry.provider_identification,
        strategy: 'provider_key'
      }
      : null
  ),
  warnings: Array.isArray(group.warnings) ? [...group.warnings] : [],
  lines: Array.isArray(group.lines) ? group.lines.map((line) => ({ ...line })) : []
});

const mergeParsedGroups = (groups = []) => {
  const normalizedGroups = (Array.isArray(groups) ? groups : []).filter(Boolean);
  if (normalizedGroups.length === 0) {
    return null;
  }

  const sortedGroups = [...normalizedGroups].sort((left, right) => {
    const leftPage = Number(left.page_start || left.page_numbers?.[0] || 0);
    const rightPage = Number(right.page_start || right.page_numbers?.[0] || 0);
    return leftPage - rightPage;
  });

  const merged = {
    ...sortedGroups[0],
    warnings: unique(sortedGroups.flatMap((group) => group.warnings || [])),
    page_numbers: unique(sortedGroups.flatMap((group) => group.page_numbers || [])).sort((left, right) => left - right),
    lines: sortedGroups.flatMap((group) => group.lines || []).map((line, index) => ({
      ...line,
      orden: index + 1
    }))
  };

  merged.page_start = merged.page_numbers[0] || merged.page_start || null;
  merged.page_end = merged.page_numbers[merged.page_numbers.length - 1] || merged.page_end || null;
  return merged;
};

const buildProviderOrderIds = ({
  providerEntry,
  groupPayload,
  storedOrderRows = []
}) => {
  const docs = Array.isArray(providerEntry?.documents) ? providerEntry.documents : [];
  const defaultOrderIds = docs.map((doc) => Number(doc.factura_id));
  const storedOrderIds = (Array.isArray(storedOrderRows) ? storedOrderRows : [])
    .map((row) => Number(row.factura_id))
    .filter((facturaId) => defaultOrderIds.includes(facturaId));

  const matchedOrderIds = unique(
    (groupPayload?.lines || [])
      .map((line) => Number(line.matched_factura_id))
      .filter((facturaId) => defaultOrderIds.includes(facturaId))
  );

  const remainderBase = storedOrderIds.length === defaultOrderIds.length
    ? storedOrderIds
    : defaultOrderIds;

  if (matchedOrderIds.length === 0) {
    return remainderBase;
  }

  return [
    ...matchedOrderIds,
    ...remainderBase.filter((facturaId) => !matchedOrderIds.includes(facturaId))
  ];
};

const compareOrderedIds = (left = [], right = []) => {
  if (left.length !== right.length) {
    return false;
  }

  return left.every((value, index) => Number(value) === Number(right[index]));
};

const buildOrderRows = ({ providerCaratulaId = null, facturaIds = [], orderSource = 'manual' }) => (
  (Array.isArray(facturaIds) ? facturaIds : []).map((facturaId, index) => ({
    provider_caratula_id: providerCaratulaId,
    factura_id: Number(facturaId),
    sort_index: index + 1,
    order_source: orderSource
  }))
);

const getProviderSortLabel = (providerEntry) => normalizeName(providerEntry?.provider_name || '');

const buildProviderRowsMap = (providerRows = []) => new Map(
  (Array.isArray(providerRows) ? providerRows : []).map((row) => [String(row.provider_key), row])
);

const buildProviderOrderRowsMap = (orderRows = []) => {
  const map = new Map();

  (Array.isArray(orderRows) ? orderRows : []).forEach((row) => {
    const providerCaratulaId = Number(row.provider_caratula_id);
    if (!Number.isInteger(providerCaratulaId) || providerCaratulaId <= 0) {
      return;
    }

    if (!map.has(providerCaratulaId)) {
      map.set(providerCaratulaId, []);
    }
    map.get(providerCaratulaId).push(row);
  });

  map.forEach((rows) => rows.sort((left, right) => Number(left.sort_index) - Number(right.sort_index)));
  return map;
};

const buildOrphanWarnings = (orphan) => unique([
  ...(Array.isArray(orphan?.warnings) ? orphan.warnings : []),
  ...((orphan?.group_payload?.lines || [])
    .map((line) => line.warning)
    .filter(Boolean))
]);

const createSyntheticProviderRow = ({ providerEntry }) => ({
  id: 0,
  tramite_id: 0,
  provider_key: providerEntry.provider_key,
  proveedor_id: providerEntry.provider_id,
  proveedor_nombre: providerEntry.provider_name,
  proveedor_identificacion: providerEntry.provider_identification,
  provider_raw_name: providerEntry.provider_name,
  provider_raw_identification: providerEntry.provider_identification,
  provider_code: null,
  nombre_archivo: null,
  ruta_archivo: null,
  attachment_status: ATTACHMENT_STATUS.SIN_CARATULA,
  attachment_origin: null,
  order_status: providerEntry.documents.length > 1 ? ORDER_STATUS.PENDIENTE_CONFIRMACION : ORDER_STATUS.NO_REQUERIDO,
  execution_date: null,
  currency: null,
  page_start: null,
  page_end: null,
  page_numbers: [],
  warnings: providerEntry.documents.length > 0 ? ['Proveedor del tramite sin caratula asignada.'] : [],
  group_payload: buildPersistedGroupPayload({
    lines: [],
    page_numbers: [],
    warnings: [],
    matched_provider: {
      provider_key: providerEntry.provider_key,
      provider_id: providerEntry.provider_id,
      provider_name: providerEntry.provider_name,
      provider_identification: providerEntry.provider_identification,
      strategy: 'synthetic'
    }
  }, providerEntry),
  order_confirmed_by: null,
  order_confirmed_at: null,
  attachment_confirmed_by: null,
  attachment_confirmed_at: null
});

const buildProviderGroupView = ({
  providerEntry,
  providerRow,
  orderRows,
  tramiteEstado
}) => {
  const row = providerRow || createSyntheticProviderRow({ providerEntry });
  const groupPayload = row.group_payload && typeof row.group_payload === 'object'
    ? row.group_payload
    : buildPersistedGroupPayload({}, providerEntry);

  const docsById = new Map(providerEntry.documents.map((doc) => [Number(doc.factura_id), doc]));
  const lines = (groupPayload.lines || []).map((line) => {
    const matchedDocument = line.matched_factura_id
      ? docsById.get(Number(line.matched_factura_id))
      : null;

    return {
      ...line,
      matched_factura_id: matchedDocument?.factura_id || null,
      matched_document_label: matchedDocument ? buildDocumentOptionLabel(matchedDocument) : '',
      match_status: matchedDocument ? (line.match_status || 'matched') : (line.match_status || 'unmatched'),
      warning: matchedDocument ? line.warning : (line.warning || (line.document_raw ? `Linea sin resolver: ${line.document_raw}` : null))
    };
  });

  const orderIds = buildProviderOrderIds({
    providerEntry,
    groupPayload,
    storedOrderRows: orderRows
  });
  const orderedDocs = orderIds
    .map((facturaId) => docsById.get(Number(facturaId)))
    .filter(Boolean);
  const unresolvedLinesCount = lines.filter((line) => line.match_status !== 'matched').length;
  const requiresCaratula = isCaratulaRequiredForEstado(tramiteEstado);
  const requiresOrder = providerEntry.documents.length > 1;
  const effectiveOrderStatus = requiresOrder
    ? (row.order_status || ORDER_STATUS.PENDIENTE_CONFIRMACION)
    : ORDER_STATUS.NO_REQUERIDO;
  const hasAttachment = Boolean(row.ruta_archivo);
  const attachmentStatus = hasAttachment
    ? (row.attachment_status || ATTACHMENT_STATUS.PENDIENTE_CONFIRMACION)
    : ATTACHMENT_STATUS.SIN_CARATULA;
  const warnings = unique([
    ...(Array.isArray(row.warnings) ? row.warnings : []),
    ...(Array.isArray(groupPayload.warnings) ? groupPayload.warnings : []),
    ...lines.map((line) => line.warning).filter(Boolean),
    ...(!hasAttachment ? ['Proveedor del tramite sin caratula asignada.'] : [])
  ]);

  const isBlocking = requiresCaratula && (
    !hasAttachment
    || attachmentStatus !== ATTACHMENT_STATUS.CONFIRMADA
    || unresolvedLinesCount > 0
    || (requiresOrder && effectiveOrderStatus !== ORDER_STATUS.CONFIRMADO)
  );

  const groupStatus = !hasAttachment
    ? (requiresCaratula ? 'requires_review' : 'pending_caratula')
    : isBlocking
      ? 'pending_confirmation'
      : 'resolved';

  return {
    group_key: row.provider_key || providerEntry.provider_key,
    provider_key: providerEntry.provider_key,
    provider_caratula_id: Number(row.id || 0) || null,
    page_start: row.page_start || groupPayload.page_start || null,
    page_end: row.page_end || groupPayload.page_end || null,
    page_numbers: Array.isArray(row.page_numbers) && row.page_numbers.length > 0
      ? row.page_numbers
      : (groupPayload.page_numbers || []),
    execution_date: row.execution_date || groupPayload.execution_date || null,
    currency: row.currency || groupPayload.currency || null,
    provider_raw_name: row.provider_raw_name || groupPayload.provider_raw_name || providerEntry.provider_name,
    provider_raw_identification: row.provider_raw_identification || groupPayload.provider_raw_identification || providerEntry.provider_identification,
    provider_code: row.provider_code || groupPayload.provider_code || null,
    proveedor_id: providerEntry.provider_id,
    proveedor_nombre: providerEntry.provider_name,
    proveedor_identificacion: providerEntry.provider_identification,
    provider_match_strategy: groupPayload?.matched_provider?.strategy || null,
    lines,
    warnings: requiresCaratula ? warnings : warnings.filter((warning) => !/^Proveedor del tramite sin caratula asignada/i.test(warning)),
    documents: orderedDocs,
    available_documents: providerEntry.documents.map((doc) => ({
      factura_id: doc.factura_id,
      label: buildDocumentOptionLabel(doc),
      provider_key: doc.provider_key
    })),
    pdf_path: row.ruta_archivo || '',
    pdf_page_start: null,
    group_status: groupStatus,
    is_blocking: isBlocking,
    attachment_status: attachmentStatus,
    attachment_origin: row.attachment_origin || null,
    order_status: effectiveOrderStatus,
    invoice_order: orderIds,
    can_confirm_order: requiresOrder,
    can_confirm_attachment: hasAttachment
      && unresolvedLinesCount === 0
      && (!requiresOrder || effectiveOrderStatus === ORDER_STATUS.CONFIRMADO),
    unresolved_lines_count: unresolvedLinesCount,
    attachment_confirmed_at: row.attachment_confirmed_at || null,
    attachment_confirmed_by: row.attachment_confirmed_by || null,
    order_confirmed_at: row.order_confirmed_at || null,
    order_confirmed_by: row.order_confirmed_by || null
  };
};

const mapLegacyGroupToProviderLike = (group, tramiteEstado) => {
  const requiresOrder = Number(group?.documents?.length || 0) > 1;
  const attachmentStatus = group?.pdf_path
    ? (group?.is_blocking ? ATTACHMENT_STATUS.PENDIENTE_CONFIRMACION : ATTACHMENT_STATUS.CONFIRMADA)
    : ATTACHMENT_STATUS.SIN_CARATULA;

  return {
    ...group,
    provider_key: group.proveedor_id ? `id:${group.proveedor_id}` : String(group.group_key || ''),
    provider_caratula_id: null,
    attachment_status: attachmentStatus,
    attachment_origin: group?.pdf_path ? ATTACHMENT_ORIGIN.AUTO : null,
    order_status: requiresOrder ? ORDER_STATUS.PENDIENTE_CONFIRMACION : ORDER_STATUS.NO_REQUERIDO,
    invoice_order: (group?.documents || []).map((doc) => Number(doc.factura_id)),
    can_confirm_order: requiresOrder,
    can_confirm_attachment: Boolean(group?.pdf_path) && !group?.is_blocking,
    unresolved_lines_count: (group?.lines || []).filter((line) => line.match_status !== 'matched').length,
    attachment_confirmed_at: null,
    attachment_confirmed_by: null,
    order_confirmed_at: null,
    order_confirmed_by: null,
    warnings: isCaratulaRequiredForEstado(tramiteEstado)
      ? (group.warnings || [])
      : (group.warnings || []).filter((warning) => !/^Proveedor del tramite sin caratula asignada/i.test(warning))
  };
};

const summarizeStoredTramiteCaratulasV2 = ({
  row,
  providerRows = [],
  providerOrderRows = [],
  orphanRows = [],
  documents = [],
  tramiteEstado
}) => {
  const hasStoredProviderState = Array.isArray(providerRows) && providerRows.length > 0;
  const hasStoredOrphans = Array.isArray(orphanRows) && orphanRows.length > 0;
  const payloadVersion = Number(row?.parsed_payload?.version || 0);

  if (!hasStoredProviderState && !hasStoredOrphans && row && payloadVersion !== 2) {
    const legacySummary = summarizeLegacyStoredTramiteCaratula({
      row,
      documents,
      tramiteEstado
    });

    return {
      ...legacySummary,
      provider_groups: (legacySummary.provider_groups || []).map((group) => mapLegacyGroupToProviderLike(group, tramiteEstado)),
      orphan_groups: []
    };
  }

  const catalog = buildDocumentsCatalog(documents);
  const providerRowsMap = buildProviderRowsMap(providerRows);
  const providerOrderRowsMap = buildProviderOrderRowsMap(providerOrderRows);
  const providerGroups = catalog.providerEntries
    .sort((left, right) => getProviderSortLabel(left).localeCompare(getProviderSortLabel(right)))
    .map((entry) => buildProviderGroupView({
      providerEntry: entry,
      providerRow: providerRowsMap.get(entry.provider_key) || null,
      orderRows: providerOrderRowsMap.get(Number(providerRowsMap.get(entry.provider_key)?.id || 0)) || [],
      tramiteEstado
    }));

  const orphanGroups = (Array.isArray(orphanRows) ? orphanRows : []).map((orphan) => ({
    orphan_id: Number(orphan.id),
    provider_raw_name: orphan.provider_raw_name || orphan.group_payload?.provider_raw_name || 'Proveedor sin resolver',
    provider_raw_identification: orphan.provider_raw_identification || orphan.group_payload?.provider_raw_identification || null,
    provider_code: orphan.provider_code || orphan.group_payload?.provider_code || null,
    execution_date: orphan.execution_date || orphan.group_payload?.execution_date || null,
    currency: orphan.currency || orphan.group_payload?.currency || null,
    page_start: orphan.page_start || orphan.group_payload?.page_start || null,
    page_end: orphan.page_end || orphan.group_payload?.page_end || null,
    page_numbers: Array.isArray(orphan.page_numbers) ? orphan.page_numbers : (orphan.group_payload?.page_numbers || []),
    pdf_path: orphan.ruta_archivo || '',
    status: orphan.status || ORPHAN_STATUS.PENDIENTE,
    warnings: buildOrphanWarnings(orphan),
    lines: Array.isArray(orphan.group_payload?.lines) ? orphan.group_payload.lines.map((line) => ({ ...line })) : [],
    assigned_provider_caratula_id: orphan.assigned_provider_caratula_id ? Number(orphan.assigned_provider_caratula_id) : null
  }));

  const pendingOrphans = orphanGroups.filter((group) => group.status === ORPHAN_STATUS.PENDIENTE);
  const unresolvedGroups = providerGroups.filter((group) => group.is_blocking);
  const unresolvedLines = providerGroups.reduce((acc, group) => acc + Number(group.unresolved_lines_count || 0), 0);
  const warnings = unique([
    ...(Array.isArray(row?.warnings) ? row.warnings : []),
    ...(Array.isArray(row?.parsed_payload?.warnings) ? row.parsed_payload.warnings : []),
    ...providerGroups.flatMap((group) => group.warnings || []),
    ...(pendingOrphans.length > 0 ? [`Hay ${pendingOrphans.length} caratulas huerfanas pendientes de asignar o descarte.`] : [])
  ]);

  const summaryState = row?.parsed_payload?.society?.matched === false
    ? 'sociedad_invalida'
    : (unresolvedGroups.length > 0 || pendingOrphans.length > 0)
      ? 'requiere_revision'
      : (row || hasStoredProviderState || hasStoredOrphans)
        ? 'procesada'
        : 'pendiente';

  const showVirtualSummary = Boolean(row || hasStoredProviderState || hasStoredOrphans);

  return {
    caratula: showVirtualSummary
      ? {
        id: Number(row?.id || 0),
        tramite_id: Number(row?.tramite_id || 0),
        nombre_archivo: row?.nombre_archivo || null,
        ruta_archivo: row?.ruta_archivo || '',
        estado: summaryState,
        fecha_ejecucion: row?.fecha_ejecucion || row?.parsed_payload?.execution_date || null,
        sociedad_nombre_raw: row?.sociedad_nombre_raw || row?.parsed_payload?.society?.raw_name || null,
        sociedad_identificacion_raw: row?.sociedad_identificacion_raw || row?.parsed_payload?.society?.raw_identification || null,
        moneda: row?.moneda || row?.parsed_payload?.currency || null,
        total_paginas: Number(row?.total_paginas || row?.parsed_payload?.total_pages || 0),
        warnings,
        unresolved_groups_count: unresolvedGroups.length + pendingOrphans.length,
        unresolved_lines_count: unresolvedLines,
        provider_groups_count: providerGroups.length,
        orphan_groups_count: pendingOrphans.length,
        cargado_por: row?.cargado_por || null,
        procesado_en: row?.procesado_en || null,
        actualizado_en: row?.actualizado_en || null,
        is_virtual: !row
      }
      : null,
    provider_groups: providerGroups,
    orphan_groups: orphanGroups,
    warnings
  };
};

const buildMergedProviderDrafts = ({ parsedPayload, documents, society }) => {
  const catalog = buildDocumentsCatalog(documents);
  const payload = {
    ...parsedPayload,
    warnings: [],
    provider_groups: Array.isArray(parsedPayload?.provider_groups)
      ? parsedPayload.provider_groups.map((group) => ({ ...group }))
      : []
  };

  const societyMatch = resolveSocietyMatch({ payload, society });
  payload.society = {
    ...payload.society,
    matched: societyMatch.matched,
    match_strategy: societyMatch.strategy,
    warning: societyMatch.warning
  };
  if (societyMatch.warning) {
    payload.warnings.push(societyMatch.warning);
  }

  const providerGroupsByKey = new Map();
  const orphanGroups = [];

  payload.provider_groups.forEach((group) => {
    const providerMatch = resolveBestProviderMatch({ group, catalog });

    if (!societyMatch.matched || !providerMatch.matched_provider?.provider_key) {
      orphanGroups.push({
        ...group,
        matched_provider: null,
        warnings: unique([
          ...(Array.isArray(group.warnings) ? group.warnings : []),
          ...(providerMatch.warning ? [providerMatch.warning] : []),
          ...(societyMatch.warning ? [societyMatch.warning] : [])
        ])
      });
      return;
    }

    const providerKey = providerMatch.matched_provider.provider_key;
    if (!providerGroupsByKey.has(providerKey)) {
      providerGroupsByKey.set(providerKey, []);
    }

    providerGroupsByKey.get(providerKey).push({
      ...group,
      matched_provider: providerMatch.matched_provider,
      warnings: unique([
        ...(Array.isArray(group.warnings) ? group.warnings : []),
        ...(providerMatch.warning ? [providerMatch.warning] : [])
      ])
    });
  });

  const matchedProviderGroups = new Map();
  providerGroupsByKey.forEach((groups, providerKey) => {
    const mergedGroup = mergeParsedGroups(groups);
    const matchedGroup = applyAutomaticLineMatches({ group: mergedGroup, catalog });
    matchedProviderGroups.set(providerKey, matchedGroup);
  });

  return {
    catalog,
    payload,
    matchedProviderGroups,
    orphanGroups
  };
};

const buildProviderFileName = ({ providerEntry, sourceFilename, suffix = '' }) => {
  const providerLabel = sanitizePdfBaseName(
    providerEntry?.provider_name
      || providerEntry?.provider_identification
      || providerEntry?.provider_key
      || 'proveedor'
  );
  const sourceBase = sanitizePdfBaseName(sourceFilename || 'caratula');
  return `${sourceBase}_${providerLabel}${suffix ? `_${suffix}` : ''}.pdf`;
};

const buildOrphanFileName = ({ orphanGroup, sourceFilename, index }) => {
  const orphanLabel = sanitizePdfBaseName(
    orphanGroup?.provider_raw_name
      || orphanGroup?.provider_code
      || `huerfana_${index + 1}`
  );
  return `${sanitizePdfBaseName(sourceFilename || 'caratula')}_${orphanLabel}.pdf`;
};

const buildImportManifestPayload = ({ payload, providerRows, orphanRows }) => ({
  version: 2,
  source_mode: 'split_by_provider',
  total_pages: Number(payload?.total_pages || 0),
  execution_date: payload?.execution_date || null,
  currency: payload?.currency || null,
  society: payload?.society || null,
  warnings: unique([
    ...(Array.isArray(payload?.warnings) ? payload.warnings : []),
    ...providerRows.flatMap((item) => item.warnings || []),
    ...orphanRows.flatMap((item) => item.warnings || [])
  ]),
  provider_groups_count: providerRows.length,
  orphan_groups_count: orphanRows.length
});

const splitBulkCaratulasPdf = async ({
  parsedPayload,
  documents,
  society,
  pdfBuffer,
  baseDir,
  sociedadId,
  tramiteId,
  sourceFilename
}) => {
  const { catalog, payload, matchedProviderGroups, orphanGroups } = buildMergedProviderDrafts({
    parsedPayload,
    documents,
    society
  });

  const sourcePdf = await PDFDocument.load(pdfBuffer);
  const providerRows = [];
  const providerOrderRows = [];
  const orphanRows = [];
  const savedPaths = [];

  for (const providerEntry of catalog.providerEntries) {
    const matchedGroup = matchedProviderGroups.get(providerEntry.provider_key) || null;
    let rutaArchivo = null;
    let nombreArchivo = null;

    if (matchedGroup?.page_numbers?.length) {
      const pdfSlice = await extractPdfPages({ sourcePdf, pageNumbers: matchedGroup.page_numbers });
      const relativeDir = resolveCaratulaStorageRelativeDir({ sociedadId, tramiteId, bucket: 'providers' });
      nombreArchivo = buildProviderFileName({ providerEntry, sourceFilename });
      rutaArchivo = savePdfBuffer({
        baseDir,
        relativeDir,
        filenameBase: nombreArchivo,
        pdfBuffer: pdfSlice
      });
      savedPaths.push(rutaArchivo);
    }

    const groupPayload = matchedGroup
      ? buildPersistedGroupPayload(matchedGroup, providerEntry)
      : buildPersistedGroupPayload({
        lines: [],
        page_numbers: [],
        warnings: [],
        matched_provider: {
          provider_key: providerEntry.provider_key,
          provider_id: providerEntry.provider_id,
          provider_name: providerEntry.provider_name,
          provider_identification: providerEntry.provider_identification,
          strategy: 'synthetic'
        }
      }, providerEntry);

    const orderIds = buildProviderOrderIds({
      providerEntry,
      groupPayload,
      storedOrderRows: []
    });
    const hasAutomaticOrder = (groupPayload.lines || []).some((line) => Number(line.matched_factura_id) > 0);

    providerRows.push({
      provider_key: providerEntry.provider_key,
      proveedor_id: providerEntry.provider_id,
      proveedor_nombre: providerEntry.provider_name,
      proveedor_identificacion: providerEntry.provider_identification,
      provider_raw_name: groupPayload.provider_raw_name || providerEntry.provider_name,
      provider_raw_identification: groupPayload.provider_raw_identification || providerEntry.provider_identification,
      provider_code: groupPayload.provider_code || null,
      nombre_archivo: nombreArchivo,
      ruta_archivo: rutaArchivo,
      attachment_status: rutaArchivo ? ATTACHMENT_STATUS.PENDIENTE_CONFIRMACION : ATTACHMENT_STATUS.SIN_CARATULA,
      attachment_origin: rutaArchivo ? ATTACHMENT_ORIGIN.AUTO : null,
      order_status: providerEntry.documents.length > 1 ? ORDER_STATUS.PENDIENTE_CONFIRMACION : ORDER_STATUS.NO_REQUERIDO,
      execution_date: groupPayload.execution_date || payload.execution_date || null,
      currency: groupPayload.currency || payload.currency || null,
      page_start: groupPayload.page_start || null,
      page_end: groupPayload.page_end || null,
      page_numbers: groupPayload.page_numbers || [],
      warnings: unique([
        ...(groupPayload.warnings || []),
        ...((groupPayload.lines || []).map((line) => line.warning).filter(Boolean)),
        ...(!rutaArchivo ? ['Proveedor del tramite sin caratula asignada.'] : [])
      ]),
      group_payload: groupPayload,
      order_confirmed_by: null,
      order_confirmed_at: null,
      attachment_confirmed_by: null,
      attachment_confirmed_at: null
    });

    providerOrderRows.push({
      provider_key: providerEntry.provider_key,
      order_source: hasAutomaticOrder ? 'auto' : 'manual',
      rows: buildOrderRows({
        facturaIds: orderIds,
        orderSource: hasAutomaticOrder ? 'auto' : 'manual'
      })
    });
  }

  for (const [index, orphanGroup] of orphanGroups.entries()) {
    if (!Array.isArray(orphanGroup.page_numbers) || orphanGroup.page_numbers.length === 0) {
      continue;
    }

    const orphanPdf = await extractPdfPages({
      sourcePdf,
      pageNumbers: orphanGroup.page_numbers
    });
    const relativeDir = resolveCaratulaStorageRelativeDir({ sociedadId, tramiteId, bucket: 'orphans' });
    const nombreArchivo = buildOrphanFileName({ orphanGroup, sourceFilename, index });
    const rutaArchivo = savePdfBuffer({
      baseDir,
      relativeDir,
      filenameBase: nombreArchivo,
      pdfBuffer: orphanPdf
    });
    savedPaths.push(rutaArchivo);

    orphanRows.push({
      provider_raw_name: orphanGroup.provider_raw_name || null,
      provider_raw_identification: orphanGroup.provider_raw_identification || null,
      provider_code: orphanGroup.provider_code || null,
      nombre_archivo: nombreArchivo,
      ruta_archivo: rutaArchivo,
      execution_date: orphanGroup.execution_date || payload.execution_date || null,
      currency: orphanGroup.currency || payload.currency || null,
      page_start: orphanGroup.page_start || null,
      page_end: orphanGroup.page_end || null,
      page_numbers: orphanGroup.page_numbers || [],
      warnings: unique([
        ...(orphanGroup.warnings || []),
        ...((orphanGroup.lines || []).map((line) => line.warning).filter(Boolean))
      ]),
      group_payload: buildPersistedGroupPayload(orphanGroup, null),
      status: ORPHAN_STATUS.PENDIENTE
    });
  }

  return {
    manifestPayload: buildImportManifestPayload({ payload, providerRows, orphanRows }),
    providerRows,
    providerOrderRows,
    orphanRows,
    savedPaths
  };
};

const ensureProviderBelongsToCatalog = ({ catalog, providerKey }) => {
  const providerEntry = catalog.providerEntryByKey.get(providerKey);
  if (!providerEntry) {
    throw createError(404, 'Proveedor del tramite no encontrado');
  }
  return providerEntry;
};

const buildManualProviderGroupPayload = ({ providerEntry, parsedPayload }) => {
  const rawGroups = Array.isArray(parsedPayload?.provider_groups) ? parsedPayload.provider_groups : [];
  if (rawGroups.length === 0) {
    return buildPersistedGroupPayload({
      page_start: 1,
      page_end: Number(parsedPayload?.total_pages || 0) || 1,
      page_numbers: Array.from({ length: Number(parsedPayload?.total_pages || 1) }, (_, index) => index + 1),
      execution_date: parsedPayload?.execution_date || null,
      currency: parsedPayload?.currency || null,
      provider_raw_name: providerEntry.provider_name,
      provider_raw_identification: providerEntry.provider_identification,
      provider_code: null,
      matched_provider: {
        provider_key: providerEntry.provider_key,
        provider_id: providerEntry.provider_id,
        provider_name: providerEntry.provider_name,
        provider_identification: providerEntry.provider_identification,
        strategy: 'provider_key'
      },
      warnings: [],
      lines: []
    }, providerEntry);
  }

  const mergedGroup = mergeParsedGroups(rawGroups);
  mergedGroup.matched_provider = {
    provider_key: providerEntry.provider_key,
    provider_id: providerEntry.provider_id,
    provider_name: providerEntry.provider_name,
    provider_identification: providerEntry.provider_identification,
    strategy: 'provider_key'
  };

  const providerOnlyCatalog = {
    ...buildDocumentsCatalog(providerEntry.documents),
    providerEntries: [providerEntry],
    providerEntryByKey: new Map([[providerEntry.provider_key, providerEntry]])
  };

  const matchedGroup = applyAutomaticLineMatches({
    group: mergedGroup,
    catalog: providerOnlyCatalog
  });

  return buildPersistedGroupPayload(matchedGroup, providerEntry);
};

const buildProviderUploadDraft = async ({
  providerEntry,
  parsedPayload,
  pdfBuffer,
  baseDir,
  sociedadId,
  tramiteId,
  filename,
  existingOrderRows = []
}) => {
  const groupPayload = buildManualProviderGroupPayload({ providerEntry, parsedPayload });
  const relativeDir = resolveCaratulaStorageRelativeDir({ sociedadId, tramiteId, bucket: 'providers' });
  const nombreArchivo = buildProviderFileName({ providerEntry, sourceFilename: filename, suffix: 'manual' });
  const rutaArchivo = savePdfBuffer({
    baseDir,
    relativeDir,
    filenameBase: nombreArchivo,
    pdfBuffer
  });

  const orderIds = buildProviderOrderIds({
    providerEntry,
    groupPayload,
    storedOrderRows: existingOrderRows
  });
  const hasAutomaticOrder = (groupPayload.lines || []).some((line) => Number(line.matched_factura_id) > 0);

  return {
    providerRow: {
      provider_key: providerEntry.provider_key,
      proveedor_id: providerEntry.provider_id,
      proveedor_nombre: providerEntry.provider_name,
      proveedor_identificacion: providerEntry.provider_identification,
      provider_raw_name: groupPayload.provider_raw_name || providerEntry.provider_name,
      provider_raw_identification: groupPayload.provider_raw_identification || providerEntry.provider_identification,
      provider_code: groupPayload.provider_code || null,
      nombre_archivo: nombreArchivo,
      ruta_archivo: rutaArchivo,
      attachment_status: ATTACHMENT_STATUS.PENDIENTE_CONFIRMACION,
      attachment_origin: ATTACHMENT_ORIGIN.MANUAL,
      order_status: providerEntry.documents.length > 1 ? ORDER_STATUS.PENDIENTE_CONFIRMACION : ORDER_STATUS.NO_REQUERIDO,
      execution_date: groupPayload.execution_date || parsedPayload?.execution_date || null,
      currency: groupPayload.currency || parsedPayload?.currency || null,
      page_start: groupPayload.page_start || null,
      page_end: groupPayload.page_end || null,
      page_numbers: groupPayload.page_numbers || [],
      warnings: unique([
        ...(groupPayload.warnings || []),
        ...((groupPayload.lines || []).map((line) => line.warning).filter(Boolean))
      ]),
      group_payload: groupPayload,
      order_confirmed_by: null,
      order_confirmed_at: null,
      attachment_confirmed_by: null,
      attachment_confirmed_at: null
    },
    orderRows: buildOrderRows({
      facturaIds: orderIds,
      orderSource: hasAutomaticOrder ? 'auto' : 'manual'
    }),
    rutaArchivo
  };
};

const buildProviderDraftFromAssignedOrphan = ({
  providerEntry,
  orphan,
  existingOrderRows = []
}) => {
  const groupPayload = buildPersistedGroupPayload(orphan.group_payload || {}, providerEntry);
  groupPayload.matched_provider = {
    provider_key: providerEntry.provider_key,
    provider_id: providerEntry.provider_id,
    provider_name: providerEntry.provider_name,
    provider_identification: providerEntry.provider_identification,
    strategy: 'manual'
  };

  const orderIds = buildProviderOrderIds({
    providerEntry,
    groupPayload,
    storedOrderRows: existingOrderRows
  });
  const hasAutomaticOrder = (groupPayload.lines || []).some((line) => Number(line.matched_factura_id) > 0);

  return {
    providerRow: {
      provider_key: providerEntry.provider_key,
      proveedor_id: providerEntry.provider_id,
      proveedor_nombre: providerEntry.provider_name,
      proveedor_identificacion: providerEntry.provider_identification,
      provider_raw_name: orphan.provider_raw_name || groupPayload.provider_raw_name || providerEntry.provider_name,
      provider_raw_identification: orphan.provider_raw_identification || groupPayload.provider_raw_identification || providerEntry.provider_identification,
      provider_code: orphan.provider_code || groupPayload.provider_code || null,
      nombre_archivo: orphan.nombre_archivo,
      ruta_archivo: null,
      attachment_status: ATTACHMENT_STATUS.PENDIENTE_CONFIRMACION,
      attachment_origin: ATTACHMENT_ORIGIN.HUERFANA,
      order_status: providerEntry.documents.length > 1 ? ORDER_STATUS.PENDIENTE_CONFIRMACION : ORDER_STATUS.NO_REQUERIDO,
      execution_date: orphan.execution_date || groupPayload.execution_date || null,
      currency: orphan.currency || groupPayload.currency || null,
      page_start: orphan.page_start || groupPayload.page_start || null,
      page_end: orphan.page_end || groupPayload.page_end || null,
      page_numbers: orphan.page_numbers || groupPayload.page_numbers || [],
      warnings: unique([
        ...(Array.isArray(orphan.warnings) ? orphan.warnings : []),
        ...(groupPayload.warnings || []),
        ...((groupPayload.lines || []).map((line) => line.warning).filter(Boolean))
      ]),
      group_payload: groupPayload,
      order_confirmed_by: null,
      order_confirmed_at: null,
      attachment_confirmed_by: null,
      attachment_confirmed_at: null
    },
    orderRows: buildOrderRows({
      facturaIds: orderIds,
      orderSource: hasAutomaticOrder ? 'auto' : 'manual'
    })
  };
};

const copyStoredCaratulaFile = ({
  baseDir,
  sourceRutaArchivo,
  targetRelativeDir,
  filenameBase
}) => {
  const sourcePath = resolveTramiteCaratulaFilePath({
    baseDir,
    rutaArchivo: sourceRutaArchivo
  });
  if (!sourcePath || !fs.existsSync(sourcePath)) {
    throw createError(404, 'Archivo de caratula huerfana no encontrado');
  }

  const pdfBuffer = fs.readFileSync(sourcePath);
  return savePdfBuffer({
    baseDir,
    relativeDir: targetRelativeDir,
    filenameBase,
    pdfBuffer
  });
};

const applyManualResolutionToStoredGroup = ({
  providerRow,
  providerEntry,
  lineMatches = []
}) => {
  const groupPayload = providerRow?.group_payload && typeof providerRow.group_payload === 'object'
    ? buildPersistedGroupPayload(providerRow.group_payload, providerEntry)
    : buildPersistedGroupPayload({}, providerEntry);
  const docsById = new Map(providerEntry.documents.map((doc) => [Number(doc.factura_id), doc]));
  const allowedFacturaIds = new Set(providerEntry.documents.map((doc) => Number(doc.factura_id)));
  const lineMatchesMap = new Map(
    (Array.isArray(lineMatches) ? lineMatches : [])
      .map((item) => [String(item.line_key || ''), Number(item.factura_id)])
      .filter((item) => item[0] && allowedFacturaIds.has(item[1]))
  );

  groupPayload.lines = (groupPayload.lines || []).map((line) => {
    const facturaId = lineMatchesMap.get(String(line.line_key || ''));
    if (!facturaId) {
      return line;
    }

    const matchedDocument = docsById.get(facturaId);
    if (!matchedDocument) {
      throw createError(400, `La factura ${facturaId} no pertenece al proveedor del tramite`);
    }

    return {
      ...line,
      matched_factura_id: matchedDocument.factura_id,
      match_strategy: 'manual',
      match_status: 'matched',
      warning: null
    };
  });

  return groupPayload;
};

const deleteStoredFiles = ({ baseDir, rutas = [] }) => {
  unique(rutas).forEach((rutaArchivo) => {
    deleteTramiteCaratulaFileIfExists({
      baseDir,
      rutaArchivo
    });
  });
};

module.exports = {
  ATTACHMENT_STATUS,
  ATTACHMENT_ORIGIN,
  ORDER_STATUS,
  ORPHAN_STATUS,
  summarizeStoredTramiteCaratulasV2,
  splitBulkCaratulasPdf,
  buildProviderUploadDraft,
  buildProviderDraftFromAssignedOrphan,
  buildOrderRows,
  buildProviderOrderIds,
  compareOrderedIds,
  ensureProviderBelongsToCatalog,
  applyManualResolutionToStoredGroup,
  copyStoredCaratulaFile,
  deleteStoredFiles,
  __test__: {
    sanitizeFileName,
    sanitizePdfBaseName,
    buildProviderFileName,
    buildOrphanFileName
  }
};
