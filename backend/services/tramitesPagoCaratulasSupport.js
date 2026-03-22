const fs = require('fs');
const path = require('path');
const { PDFParse } = require('pdf-parse');
const { createError } = require('../utils/errors');
const { runtimeConfig } = require('../config/runtime');
const {
  DOCUMENTS_DIR_NAME,
  TRAMITES_DIR_NAME,
  getRelativePathVariants
} = require('../utils/documentPaths');

const MAX_TRAMITE_CARATULA_MB = runtimeConfig.maxTramitesCaratulaMb;
const MAX_TRAMITE_CARATULA_BYTES = MAX_TRAMITE_CARATULA_MB * 1024 * 1024;
const MATCH_AMOUNT_EPSILON = 0.0001;

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

const sanitizeFileName = (value) => {
  const raw = String(value || '').trim();
  const cleaned = raw.replace(/[^0-9A-Za-z._-]/g, '_');
  return cleaned || 'caratula_tramite.pdf';
};

const sanitizePdfBaseName = (value) => sanitizeFileName(value).replace(/\.pdf$/i, '') || 'caratula_tramite';

const decodeCaratulaPdfBase64 = (rawBase64) => {
  if (!rawBase64 || typeof rawBase64 !== 'string') {
    throw createError(400, 'Archivo PDF requerido');
  }

  const withoutPrefix = rawBase64.replace(/^data:application\/pdf;base64,/i, '');
  let buffer;

  try {
    buffer = Buffer.from(withoutPrefix, 'base64');
  } catch (error) {
    throw createError(400, 'PDF en base64 invalido');
  }

  if (!buffer || buffer.length === 0) {
    throw createError(400, 'PDF vacio');
  }

  if (buffer.length > MAX_TRAMITE_CARATULA_BYTES) {
    throw createError(400, `El archivo excede el tamano maximo permitido (${MAX_TRAMITE_CARATULA_MB} MB).`);
  }

  const signature = buffer.subarray(0, 4).toString('ascii');
  if (signature !== '%PDF') {
    throw createError(400, 'El archivo no es un PDF valido');
  }

  return buffer;
};

const resolveTramiteCaratulaRelativeDir = ({ sociedadId, tramiteId }) => (
  path.join(
    DOCUMENTS_DIR_NAME,
    TRAMITES_DIR_NAME,
    'caratulas',
    String(sociedadId),
    String(tramiteId)
  )
);

const saveTramiteCaratulaPdf = ({
  baseDir,
  sociedadId,
  tramiteId,
  pdfBuffer,
  filename
}) => {
  const safeBaseName = sanitizePdfBaseName(filename);
  const relativeDir = resolveTramiteCaratulaRelativeDir({ sociedadId, tramiteId });
  const fullDir = path.join(path.resolve(baseDir), relativeDir);

  fs.mkdirSync(fullDir, { recursive: true });

  let candidateBaseName = safeBaseName;
  let sequence = 2;
  let fullPath = path.join(fullDir, `${candidateBaseName}.pdf`);
  while (fs.existsSync(fullPath)) {
    candidateBaseName = `${safeBaseName}_${sequence}`;
    sequence += 1;
    fullPath = path.join(fullDir, `${candidateBaseName}.pdf`);
  }

  fs.writeFileSync(fullPath, pdfBuffer);
  return path.join(relativeDir, `${candidateBaseName}.pdf`).replace(/\\/g, '/');
};

const resolveTramiteCaratulaFilePath = ({ baseDir, rutaArchivo }) => {
  if (!rutaArchivo) {
    return null;
  }

  const normalizedBaseDir = path.resolve(baseDir);
  const allowedBase = normalizedBaseDir.endsWith(path.sep)
    ? normalizedBaseDir
    : `${normalizedBaseDir}${path.sep}`;
  const variants = getRelativePathVariants(rutaArchivo);
  let fallbackPath = null;

  for (const variant of variants) {
    if (variant.includes('..')) {
      continue;
    }

    const absolutePath = path.resolve(normalizedBaseDir, variant);
    if (absolutePath !== normalizedBaseDir && !absolutePath.startsWith(allowedBase)) {
      continue;
    }

    if (!fallbackPath) {
      fallbackPath = absolutePath;
    }

    if (fs.existsSync(absolutePath)) {
      return absolutePath;
    }
  }

  return fallbackPath;
};

const deleteTramiteCaratulaFileIfExists = ({ baseDir, rutaArchivo }) => {
  const filePath = resolveTramiteCaratulaFilePath({ baseDir, rutaArchivo });
  if (!filePath || !fs.existsSync(filePath)) {
    return;
  }

  try {
    fs.unlinkSync(filePath);
  } catch (error) {
    console.warn('No se pudo eliminar la caratula previa del tramite:', error.message);
  }
};

const parseNumberToken = (token) => {
  const cleaned = String(token || '').replace(/[^0-9,.-]/g, '');
  if (!cleaned) {
    return null;
  }

  const lastDot = cleaned.lastIndexOf('.');
  const lastComma = cleaned.lastIndexOf(',');
  let normalized = cleaned;

  if (lastDot !== -1 && lastComma !== -1) {
    const decimalSeparator = lastDot > lastComma ? '.' : ',';
    const thousandsSeparator = decimalSeparator === '.' ? ',' : '.';
    normalized = normalized
      .replace(new RegExp(`\\${thousandsSeparator}`, 'g'), '')
      .replace(decimalSeparator, '.');
  } else if (lastComma !== -1) {
    if (/,\d{1,4}$/.test(normalized)) {
      normalized = normalized.replace(/\./g, '').replace(',', '.');
    } else {
      normalized = normalized.replace(/,/g, '');
    }
  } else if (lastDot !== -1) {
    if (!/\.\d{1,4}$/.test(normalized)) {
      normalized = normalized.replace(/\./g, '');
    } else {
      normalized = normalized.replace(/,/g, '');
    }
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const parseDateCandidate = (rawDate) => {
  const parts = String(rawDate || '').split(/[/-]/).map((part) => Number(part));
  if (parts.length !== 3 || parts.some((part) => !Number.isInteger(part) || part <= 0)) {
    return null;
  }

  let year;
  let month;
  let day;

  if (String(parts[0]).length === 4) {
    [year, month, day] = parts;
  } else {
    [day, month, year] = parts;
  }

  if (year < 100) {
    year += 2000;
  }

  if (year < 2000 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }

  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year
    || date.getUTCMonth() !== month - 1
    || date.getUTCDate() !== day
  ) {
    return null;
  }

  return `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
};

const extractLast11Digits = (value) => {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) {
    return '';
  }
  return digits.slice(-11);
};

const matchesAmount = (left, right) => (
  Math.abs(Number(left || 0) - Number(right || 0)) <= MATCH_AMOUNT_EPSILON
);

const scoreNameSimilarity = (candidate, target) => {
  const candidateNorm = normalizeName(candidate);
  const targetNorm = normalizeName(target);

  if (!candidateNorm || !targetNorm) {
    return 0;
  }

  if (candidateNorm === targetNorm) {
    return 1;
  }

  if (candidateNorm.includes(targetNorm) || targetNorm.includes(candidateNorm)) {
    return 0.9;
  }

  const candidateTokens = new Set(candidateNorm.split(' ').filter((token) => token.length >= 3));
  const targetTokens = new Set(targetNorm.split(' ').filter((token) => token.length >= 3));
  if (candidateTokens.size === 0 || targetTokens.size === 0) {
    return 0;
  }

  let intersection = 0;
  candidateTokens.forEach((token) => {
    if (targetTokens.has(token)) {
      intersection += 1;
    }
  });

  return intersection / Math.max(candidateTokens.size, targetTokens.size);
};

const getDocCurrency = (doc) => (
  doc?.resumen?.CodigoTipoMoneda?.CodigoMoneda
  || doc?.resumen?.CodigoMoneda
  || doc?.resumen?.codigoMoneda
  || 'CRC'
);

const getDocTotalFactura = (doc) => {
  const candidates = [doc?.total_factura, doc?.total_a_pagar, doc?.resumen?.TotalComprobante];
  for (const value of candidates) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return 0;
};

const getDocProviderName = (doc) => (
  doc?.proveedor_nombre
  || doc?.emisor?.Nombre
  || doc?.emisor?.nombre
  || '-'
);

const getDocProviderIdentification = (doc) => (
  doc?.proveedor_identificacion
  || doc?.emisor?.Identificacion?.Numero
  || doc?.emisor?.identificacion?.numero
  || ''
);

const getDocProviderKey = (doc) => {
  if (doc?.proveedor_id) {
    return `id:${Number(doc.proveedor_id)}`;
  }

  const normalizedIdentification = normalizeIdentification(getDocProviderIdentification(doc));
  if (normalizedIdentification) {
    return `ident:${normalizedIdentification}`;
  }

  const normalizedName = normalizeName(getDocProviderName(doc));
  if (normalizedName) {
    return `name:${normalizedName}`;
  }

  return `factura:${Number(doc?.factura_id || doc?.id || 0)}`;
};

const buildDocumentOptionLabel = (doc) => (
  `${getDocProviderName(doc)} - ${doc?.consecutivo || doc?.clave || `Factura ${doc?.factura_id}`}`
);

const buildDocumentsCatalog = (documents = []) => {
  const docEntries = (Array.isArray(documents) ? documents : []).map((doc) => ({
    ...doc,
    factura_id: Number(doc.factura_id),
    provider_key: getDocProviderKey(doc),
    provider_name: getDocProviderName(doc),
    provider_identification: getDocProviderIdentification(doc),
    consecutive_last11: extractLast11Digits(doc?.consecutivo || doc?.clave || ''),
    moneda: getDocCurrency(doc),
    total_factura_resuelta: getDocTotalFactura(doc)
  })).filter((doc) => Number.isInteger(doc.factura_id) && doc.factura_id > 0);

  const docsById = new Map(docEntries.map((doc) => [doc.factura_id, doc]));
  const providerGroups = new Map();

  docEntries.forEach((doc) => {
    if (!providerGroups.has(doc.provider_key)) {
      providerGroups.set(doc.provider_key, {
        provider_key: doc.provider_key,
        provider_id: doc.proveedor_id ? Number(doc.proveedor_id) : null,
        provider_name: doc.provider_name,
        provider_identification: doc.provider_identification,
        documents: []
      });
    }
    providerGroups.get(doc.provider_key).documents.push(doc);
  });

  const providerEntries = Array.from(providerGroups.values())
    .map((entry) => ({
      ...entry,
      documents: entry.documents.sort((left, right) => (
        String(left.consecutivo || left.clave || '').localeCompare(String(right.consecutivo || right.clave || ''))
      ))
    }))
    .sort((left, right) => left.provider_name.localeCompare(right.provider_name));

  return {
    documents: docEntries,
    docsById,
    providerEntries,
    providerEntryByKey: new Map(providerEntries.map((entry) => [entry.provider_key, entry]))
  };
};

const PAGE_LINE_IGNORES = new Set([
  'Proveedor:',
  'Cedula:',
  'Cuenta:',
  'Autorizado por',
  'Revisado por'
]);

const parseSocietyHeader = (value) => {
  const raw = normalizeWhitespace(value);
  const identificationMatch = raw.match(/\b[0-9]-[0-9]{3,4}-[0-9]{4,}\b/);
  const identification = identificationMatch ? identificationMatch[0] : '';
  const name = normalizeWhitespace(
    identification
      ? raw.replace(identification, '').replace(/\s*-\s*$/, '')
      : raw
  );

  return {
    raw_line: raw,
    raw_name: name,
    raw_identification: identification
  };
};

const parseCaratulaDocumentLine = ({ line, pageNumber, lineIndex }) => {
  const match = line.match(
    /^\s*([0-9.,]+)\s+([A-Z]{3})\s+([0-9.,]+)\s+([0-9.,]+)\s+([0-9.,]+)\s+(.+?)\s*$/
  );
  if (!match) {
    return null;
  }

  const documentRaw = normalizeWhitespace(match[6]);
  if (!documentRaw || !/(factura|anticipo|subcontrato)/i.test(documentRaw)) {
    return null;
  }

  return {
    line_key: `p${pageNumber}-l${lineIndex + 1}`,
    page_number: pageNumber,
    orden: lineIndex + 1,
    raw_text: normalizeWhitespace(line),
    document_raw: documentRaw,
    document_type: /anticipo/i.test(documentRaw) ? 'anticipo' : (/factura/i.test(documentRaw) ? 'factura' : 'otro'),
    consecutivo_last11: extractLast11Digits(documentRaw),
    monto_pago: parseNumberToken(match[1]),
    moneda: match[2],
    monto_total: parseNumberToken(match[3]),
    monto_ant_aplicado: parseNumberToken(match[4]),
    monto_retencion: parseNumberToken(match[5]),
    matched_factura_id: null,
    match_strategy: null,
    match_status: 'unmatched',
    warning: null
  };
};

const parseCaratulaPageText = ({ pageNumber, text }) => {
  const lines = String(text || '')
    .split(/\r?\n/)
    .map(normalizeWhitespace)
    .filter((line) => line && !/^--\s+\d+\s+of\s+\d+\s+--$/i.test(line));

  const society = parseSocietyHeader(lines[0] || '');
  const executionDateMatch = String(text || '').match(/Fecha de ejecuci[oó]n:\s*([0-9]{1,4}[/-][0-9]{1,2}[/-][0-9]{1,4})/i);
  const executionDate = executionDateMatch ? parseDateCandidate(executionDateMatch[1]) : null;
  const pageMatch = String(text || '').match(/P[aá]gina:\s*(\d+)\s*\/\s*(\d+)/i);
  const providerLineIndex = lines.findIndex((line) => /\(P\d+\)/i.test(line));
  const providerLine = providerLineIndex >= 0 ? lines[providerLineIndex] : '';
  const providerIdentification = providerLineIndex >= 0
    ? (lines.slice(providerLineIndex + 1).find((line) => /\b[0-9]-[0-9]{3,4}-[0-9]{4,}\b/.test(line)) || '')
    : '';
  const providerCodeMatch = providerLine.match(/\((P\d+)\)\s*$/i);
  const providerName = normalizeWhitespace(providerLine.replace(/\((P\d+)\)\s*$/i, ''));
  const currency = lines.find((line) => /^(CRC|USD)$/i.test(line)) || '';
  const parsedLines = lines
    .filter((line) => !PAGE_LINE_IGNORES.has(line))
    .map((line, index) => parseCaratulaDocumentLine({
      line,
      pageNumber,
      lineIndex: index
    }))
    .filter(Boolean);

  return {
    page_number: pageNumber,
    total_pages: pageMatch ? Number(pageMatch[2]) : 0,
    society,
    execution_date: executionDate,
    currency: currency ? currency.toUpperCase() : null,
    provider_raw_name: providerName || null,
    provider_raw_identification: providerIdentification || null,
    provider_code: providerCodeMatch ? providerCodeMatch[1].toUpperCase() : null,
    lines: parsedLines
  };
};

const canMergeProviderGroup = (currentGroup, nextPage) => {
  if (!currentGroup) {
    return false;
  }

  if (Number(nextPage.page_number) !== Number(currentGroup.page_end) + 1) {
    return false;
  }

  return normalizeName(nextPage.provider_raw_name) === normalizeName(currentGroup.provider_raw_name)
    && normalizeIdentification(nextPage.provider_raw_identification) === normalizeIdentification(currentGroup.provider_raw_identification)
    && normalizeIdentification(nextPage.society.raw_identification) === normalizeIdentification(currentGroup.society.raw_identification)
    && normalizeName(nextPage.society.raw_name) === normalizeName(currentGroup.society.raw_name)
    && normalizeWhitespace(nextPage.execution_date || '') === normalizeWhitespace(currentGroup.execution_date || '')
    && normalizeWhitespace(nextPage.currency || '') === normalizeWhitespace(currentGroup.currency || '');
};

const parseTramiteCaratulaPdf = async ({ pdfBuffer }) => {
  const parser = new PDFParse({ data: pdfBuffer });

  try {
    const info = await parser.getInfo();
    const totalPages = Number(info?.total || 0);
    const pages = [];

    for (let pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
      const pageText = await parser.getText({ partial: [pageNumber] });
      pages.push(parseCaratulaPageText({
        pageNumber,
        text: pageText?.text || ''
      }));
    }

    const providerGroups = [];
    pages.forEach((page) => {
      const currentGroup = providerGroups[providerGroups.length - 1];
      if (canMergeProviderGroup(currentGroup, page)) {
        currentGroup.page_end = page.page_number;
        currentGroup.page_numbers.push(page.page_number);
        currentGroup.lines.push(...page.lines);
        return;
      }

      providerGroups.push({
        group_key: `group_${providerGroups.length + 1}_${page.page_number}`,
        page_start: page.page_number,
        page_end: page.page_number,
        page_numbers: [page.page_number],
        society: page.society,
        provider_raw_name: page.provider_raw_name,
        provider_raw_identification: page.provider_raw_identification,
        provider_code: page.provider_code,
        execution_date: page.execution_date,
        currency: page.currency,
        matched_provider: null,
        warnings: [],
        lines: page.lines
      });
    });

    providerGroups.forEach((group, groupIndex) => {
      group.group_key = `group_${groupIndex + 1}_${group.page_start}_${group.page_end}`;
      group.lines = group.lines.map((line, lineIndex) => ({
        ...line,
        line_key: `${group.group_key}_line_${lineIndex + 1}`,
        orden: lineIndex + 1
      }));
    });

    return {
      version: 1,
      total_pages: totalPages,
      execution_date: pages.find((page) => page.execution_date)?.execution_date || null,
      currency: pages.find((page) => page.currency)?.currency || null,
      society: {
        raw_name: pages[0]?.society?.raw_name || null,
        raw_identification: pages[0]?.society?.raw_identification || null,
        match_strategy: null,
        matched: false,
        warning: null
      },
      warnings: [],
      provider_groups: providerGroups
    };
  } finally {
    await parser.destroy();
  }
};

const resolveSocietyMatch = ({ payload, society }) => {
  const societyName = society?.razon_social || society?.nombre_proyecto || '';
  const projectName = society?.nombre_proyecto || '';
  const rawName = payload?.society?.raw_name || '';
  const rawIdentification = payload?.society?.raw_identification || '';
  const normalizedRawIdentification = normalizeIdentification(rawIdentification);
  const normalizedSocietyIdentification = normalizeIdentification(society?.cedula_juridica || '');

  if (
    normalizedRawIdentification
    && normalizedSocietyIdentification
    && normalizedRawIdentification === normalizedSocietyIdentification
  ) {
    return {
      matched: true,
      strategy: 'identificacion',
      warning: null
    };
  }

  const bestNameScore = Math.max(
    scoreNameSimilarity(rawName, societyName),
    scoreNameSimilarity(rawName, projectName)
  );
  if (bestNameScore >= 0.55) {
    return {
      matched: true,
      strategy: 'nombre',
      warning: null
    };
  }

  const selectedSocietyLabel = projectName || societyName || 'sociedad seleccionada';
  return {
    matched: false,
    strategy: null,
    warning: `Caratulas no corresponden a sociedad (${selectedSocietyLabel})`
  };
};

const resolveBestProviderMatch = ({ group, catalog }) => {
  const normalizedGroupIdentification = normalizeIdentification(group.provider_raw_identification);
  if (normalizedGroupIdentification) {
    const matchingByIdentification = catalog.providerEntries.filter((entry) => (
      normalizeIdentification(entry.provider_identification) === normalizedGroupIdentification
    ));
    if (matchingByIdentification.length === 1) {
      const match = matchingByIdentification[0];
      return {
        matched_provider: {
          provider_key: match.provider_key,
          provider_id: match.provider_id,
          provider_name: match.provider_name,
          provider_identification: match.provider_identification,
          strategy: 'identificacion'
        },
        warning: null
      };
    }
  }

  let bestEntry = null;
  let bestScore = 0;
  let secondScore = 0;
  catalog.providerEntries.forEach((entry) => {
    const score = scoreNameSimilarity(group.provider_raw_name, entry.provider_name);
    if (score > bestScore) {
      secondScore = bestScore;
      bestScore = score;
      bestEntry = entry;
      return;
    }

    if (score > secondScore) {
      secondScore = score;
    }
  });

  if (bestEntry && bestScore >= 0.45 && (bestScore - secondScore) >= 0.1) {
    return {
      matched_provider: {
        provider_key: bestEntry.provider_key,
        provider_id: bestEntry.provider_id,
        provider_name: bestEntry.provider_name,
        provider_identification: bestEntry.provider_identification,
        strategy: 'nombre'
      },
      warning: null
    };
  }

  return {
    matched_provider: null,
    warning: group.provider_raw_name
      ? `Proveedor sin coincidencia automatica: ${group.provider_raw_name}`
      : 'Proveedor sin coincidencia automatica'
  };
};

const resetGroupAutomaticMatches = (group) => ({
  ...group,
  warnings: [],
  lines: (group.lines || []).map((line) => ({
    ...line,
    matched_factura_id: null,
    match_strategy: null,
    match_status: 'unmatched',
    warning: null
  }))
});

const applyAutomaticLineMatches = ({ group, catalog }) => {
  const nextGroup = resetGroupAutomaticMatches(group);
  if (!nextGroup.matched_provider?.provider_key) {
    nextGroup.warnings.push(
      group.provider_raw_name
        ? `Proveedor no coincide: ${group.provider_raw_name}`
        : 'Proveedor no coincide con el tramite'
    );
    return nextGroup;
  }

  const providerEntry = catalog.providerEntryByKey.get(nextGroup.matched_provider.provider_key);
  if (!providerEntry) {
    nextGroup.warnings.push('Proveedor resuelto no existe entre los documentos activos del tramite');
    nextGroup.matched_provider = null;
    return nextGroup;
  }

  const availableFacturaIds = new Set(providerEntry.documents.map((doc) => doc.factura_id));
  nextGroup.lines = nextGroup.lines.map((line) => {
    const remainingDocs = providerEntry.documents.filter((doc) => availableFacturaIds.has(doc.factura_id));
    const byConsecutivo = line.consecutivo_last11
      ? remainingDocs.filter((doc) => doc.consecutive_last11 === line.consecutivo_last11)
      : [];

    if (byConsecutivo.length === 1) {
      const match = byConsecutivo[0];
      availableFacturaIds.delete(match.factura_id);
      return {
        ...line,
        matched_factura_id: match.factura_id,
        match_strategy: 'consecutivo',
        match_status: 'matched',
        warning: null
      };
    }

    if (byConsecutivo.length > 1) {
      return {
        ...line,
        match_status: 'ambiguous',
        warning: `Coincidencia ambigua por consecutivo para ${line.document_raw}`
      };
    }

    const byTotal = remainingDocs.filter((doc) => (
      doc.moneda === line.moneda
      && matchesAmount(doc.total_factura_resuelta, line.monto_total)
    ));
    if (byTotal.length === 1) {
      const match = byTotal[0];
      availableFacturaIds.delete(match.factura_id);
      return {
        ...line,
        matched_factura_id: match.factura_id,
        match_strategy: 'monto_total',
        match_status: 'matched',
        warning: null
      };
    }

    if (byTotal.length > 1) {
      return {
        ...line,
        match_status: 'ambiguous',
        warning: `Coincidencia ambigua por monto para ${line.document_raw}`
      };
    }

    return {
      ...line,
      match_status: 'unmatched',
      warning: `No se encontro coincidencia automatica para ${line.document_raw}`
    };
  });

  return nextGroup;
};

const buildPayloadSummary = ({ payload, view }) => {
  const blockingGroups = view.provider_groups.filter((group) => group.is_blocking);
  const unresolvedLines = view.provider_groups.reduce((acc, group) => (
    acc + group.lines.filter((line) => line.match_status !== 'matched').length
  ), 0);
  const state = payload?.society?.matched === false
    ? 'sociedad_invalida'
    : blockingGroups.length > 0
      ? 'requiere_revision'
      : view.provider_groups.length > 0
        ? 'procesada'
        : 'pendiente';

  return {
    state,
    unresolved_groups_count: blockingGroups.length,
    unresolved_lines_count: unresolvedLines,
    provider_groups_count: view.provider_groups.length,
    warnings_count: view.warnings.length
  };
};

const buildProviderGroupsView = ({ payload, documents, rutaArchivo }) => {
  const catalog = buildDocumentsCatalog(documents);
  const matchedProviderKeys = new Set();
  const providerGroups = (payload?.provider_groups || []).map((group) => {
    const providerKey = group?.matched_provider?.provider_key || null;
    if (providerKey) {
      matchedProviderKeys.add(providerKey);
    }

    const providerEntry = providerKey ? catalog.providerEntryByKey.get(providerKey) : null;
    const availableDocuments = providerEntry
      ? providerEntry.documents
      : catalog.documents;
    const matchedFacturaIds = new Set();

    const lines = (group.lines || []).map((line) => {
      const matchedDocument = line.matched_factura_id
        ? catalog.docsById.get(Number(line.matched_factura_id))
        : null;
      if (matchedDocument) {
        matchedFacturaIds.add(matchedDocument.factura_id);
      }

      return {
        ...line,
        matched_factura_id: matchedDocument?.factura_id || null,
        matched_document_label: matchedDocument ? buildDocumentOptionLabel(matchedDocument) : '',
        match_status: matchedDocument ? (line.match_status || 'matched') : 'unmatched',
        warning: matchedDocument ? line.warning : (line.warning || `Linea sin resolver: ${line.document_raw}`)
      };
    });

    const orderedDocuments = [
      ...lines
        .filter((line) => line.matched_factura_id)
        .map((line) => catalog.docsById.get(Number(line.matched_factura_id)))
        .filter(Boolean),
      ...availableDocuments.filter((doc) => !matchedFacturaIds.has(doc.factura_id))
    ];

    const uniqueOrderedDocuments = [];
    const seenDocIds = new Set();
    orderedDocuments.forEach((doc) => {
      if (seenDocIds.has(doc.factura_id)) {
        return;
      }
      seenDocIds.add(doc.factura_id);
      uniqueOrderedDocuments.push(doc);
    });

    const warnings = [
      ...(Array.isArray(group.warnings) ? group.warnings : []),
      ...lines.filter((line) => line.warning).map((line) => line.warning)
    ];
    if (providerEntry && lines.length < providerEntry.documents.length) {
      warnings.push(`Hay ${providerEntry.documents.length - lines.length} facturas del proveedor sin linea en la caratula.`);
    }

    const hasUnmatchedLines = lines.some((line) => line.match_status !== 'matched');
    const hasProviderMismatch = !providerEntry;

    return {
      group_key: group.group_key,
      page_start: group.page_start,
      page_end: group.page_end,
      page_numbers: group.page_numbers || [],
      execution_date: group.execution_date || payload.execution_date || null,
      currency: group.currency || payload.currency || null,
      provider_raw_name: group.provider_raw_name || null,
      provider_raw_identification: group.provider_raw_identification || null,
      provider_code: group.provider_code || null,
      proveedor_id: providerEntry?.provider_id || null,
      proveedor_nombre: providerEntry?.provider_name || null,
      proveedor_identificacion: providerEntry?.provider_identification || null,
      provider_match_strategy: group?.matched_provider?.strategy || null,
      lines,
      warnings: Array.from(new Set(warnings)),
      documents: uniqueOrderedDocuments,
      available_documents: availableDocuments.map((doc) => ({
        factura_id: doc.factura_id,
        label: buildDocumentOptionLabel(doc),
        provider_key: doc.provider_key
      })),
      provider_document_options: catalog.providerEntries.map((entry) => ({
        factura_id: entry.documents[0]?.factura_id || null,
        label: entry.provider_name,
        provider_key: entry.provider_key
      })).filter((item) => item.factura_id),
      pdf_path: rutaArchivo || '',
      pdf_page_start: group.page_start,
      is_blocking: hasProviderMismatch || hasUnmatchedLines
    };
  });

  const syntheticGroups = catalog.providerEntries
    .filter((entry) => !matchedProviderKeys.has(entry.provider_key))
    .map((entry) => ({
      group_key: `missing_${entry.provider_key}`,
      page_start: null,
      page_end: null,
      page_numbers: [],
      execution_date: payload.execution_date || null,
      currency: payload.currency || null,
      provider_raw_name: entry.provider_name,
      provider_raw_identification: entry.provider_identification,
      provider_code: null,
      proveedor_id: entry.provider_id,
      proveedor_nombre: entry.provider_name,
      proveedor_identificacion: entry.provider_identification,
      provider_match_strategy: null,
      lines: [],
      warnings: ['Proveedor del tramite sin caratula asignada.'],
      documents: entry.documents,
      available_documents: entry.documents.map((doc) => ({
        factura_id: doc.factura_id,
        label: buildDocumentOptionLabel(doc),
        provider_key: doc.provider_key
      })),
      provider_document_options: catalog.providerEntries.map((providerEntry) => ({
        factura_id: providerEntry.documents[0]?.factura_id || null,
        label: providerEntry.provider_name,
        provider_key: providerEntry.provider_key
      })).filter((item) => item.factura_id),
      pdf_path: rutaArchivo || '',
      pdf_page_start: null,
      is_blocking: true
    }));

  const allGroups = [...providerGroups, ...syntheticGroups];
  const warnings = [
    ...(Array.isArray(payload?.warnings) ? payload.warnings : []),
    ...allGroups.flatMap((group) => group.warnings)
  ];

  return {
    provider_groups: allGroups,
    warnings: Array.from(new Set(warnings))
  };
};

const summarizeStoredTramiteCaratula = ({ row, documents }) => {
  if (!row) {
    return {
      caratula: null,
      provider_groups: [],
      warnings: []
    };
  }

  const payload = row.parsed_payload && typeof row.parsed_payload === 'object'
    ? row.parsed_payload
    : {};
  const view = buildProviderGroupsView({
    payload,
    documents,
    rutaArchivo: row.ruta_archivo
  });
  const summary = buildPayloadSummary({ payload, view });

  return {
    caratula: {
      id: Number(row.id),
      tramite_id: Number(row.tramite_id),
      nombre_archivo: row.nombre_archivo,
      ruta_archivo: row.ruta_archivo,
      estado: summary.state,
      fecha_ejecucion: row.fecha_ejecucion || payload.execution_date || null,
      sociedad_nombre_raw: row.sociedad_nombre_raw || payload?.society?.raw_name || null,
      sociedad_identificacion_raw: row.sociedad_identificacion_raw || payload?.society?.raw_identification || null,
      moneda: row.moneda || payload.currency || null,
      total_paginas: Number(row.total_paginas || payload.total_pages || 0),
      warnings: view.warnings,
      unresolved_groups_count: summary.unresolved_groups_count,
      unresolved_lines_count: summary.unresolved_lines_count,
      provider_groups_count: summary.provider_groups_count,
      cargado_por: row.cargado_por || null,
      procesado_en: row.procesado_en || null,
      actualizado_en: row.actualizado_en || null
    },
    provider_groups: view.provider_groups,
    warnings: view.warnings
  };
};

const applyAutomaticMatchingToPayload = ({ parsedPayload, documents, society }) => {
  const payload = {
    ...parsedPayload,
    warnings: [],
    provider_groups: (parsedPayload?.provider_groups || []).map((group) => ({ ...group }))
  };
  const catalog = buildDocumentsCatalog(documents);
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

  payload.provider_groups = payload.provider_groups.map((group) => {
    const providerMatch = resolveBestProviderMatch({ group, catalog });
    let nextGroup = {
      ...group,
      matched_provider: providerMatch.matched_provider,
      warnings: providerMatch.warning ? [providerMatch.warning] : []
    };

    if (payload.society.matched === false) {
      nextGroup.lines = (group.lines || []).map((line) => ({
        ...line,
        matched_factura_id: null,
        match_strategy: null,
        match_status: 'unmatched',
        warning: line.warning || `Sociedad no coincide para ${line.document_raw}`
      }));
      return nextGroup;
    }

    nextGroup = applyAutomaticLineMatches({
      group: nextGroup,
      catalog
    });

    return nextGroup;
  });

  const view = buildProviderGroupsView({
    payload,
    documents,
    rutaArchivo: ''
  });
  payload.summary = buildPayloadSummary({ payload, view });
  return payload;
};

const applyManualResolutionToPayload = ({
  payload,
  documents,
  groupKey,
  providerFacturaId,
  lineMatches = []
}) => {
  const catalog = buildDocumentsCatalog(documents);
  const nextPayload = {
    ...payload,
    provider_groups: (payload?.provider_groups || []).map((group) => ({
      ...group,
      warnings: Array.isArray(group.warnings) ? [...group.warnings] : [],
      lines: (group.lines || []).map((line) => ({ ...line }))
    }))
  };

  const targetGroup = nextPayload.provider_groups.find((group) => group.group_key === groupKey);
  if (!targetGroup) {
    throw createError(404, 'Grupo de caratula no encontrado');
  }

  let providerEntry = null;
  const providerFactura = providerFacturaId ? catalog.docsById.get(Number(providerFacturaId)) : null;
  if (providerFactura) {
    providerEntry = catalog.providerEntryByKey.get(providerFactura.provider_key) || null;
  } else if (targetGroup.matched_provider?.provider_key) {
    providerEntry = catalog.providerEntryByKey.get(targetGroup.matched_provider.provider_key) || null;
  }

  if (providerEntry) {
    targetGroup.matched_provider = {
      provider_key: providerEntry.provider_key,
      provider_id: providerEntry.provider_id,
      provider_name: providerEntry.provider_name,
      provider_identification: providerEntry.provider_identification,
      strategy: 'manual'
    };
  }

  const lineMatchesMap = new Map(
    (Array.isArray(lineMatches) ? lineMatches : [])
      .map((item) => [String(item.line_key || ''), Number(item.factura_id)])
      .filter((item) => item[0] && Number.isInteger(item[1]) && item[1] > 0)
  );

  if (!providerEntry && lineMatchesMap.size > 0) {
    const matchedDocs = Array.from(lineMatchesMap.values())
      .map((facturaId) => catalog.docsById.get(facturaId))
      .filter(Boolean);
    const providerKeys = Array.from(new Set(matchedDocs.map((doc) => doc.provider_key).filter(Boolean)));
    if (providerKeys.length > 1) {
      throw createError(400, 'Todas las lineas de una caratula deben resolverse contra el mismo proveedor');
    }
    if (providerKeys.length === 1) {
      providerEntry = catalog.providerEntryByKey.get(providerKeys[0]) || null;
      if (providerEntry) {
        targetGroup.matched_provider = {
          provider_key: providerEntry.provider_key,
          provider_id: providerEntry.provider_id,
          provider_name: providerEntry.provider_name,
          provider_identification: providerEntry.provider_identification,
          strategy: 'manual'
        };
      }
    }
  }

  targetGroup.lines = targetGroup.lines.map((line) => {
    const facturaId = lineMatchesMap.get(line.line_key);
    if (!facturaId) {
      return line;
    }

    const matchedDocument = catalog.docsById.get(facturaId);
    if (!matchedDocument) {
      throw createError(400, `La factura ${facturaId} no pertenece al tramite`);
    }

    if (
      providerEntry
      && matchedDocument.provider_key !== providerEntry.provider_key
    ) {
      throw createError(400, 'Todas las lineas de una caratula deben resolverse contra el mismo proveedor');
    }

    return {
      ...line,
      matched_factura_id: matchedDocument.factura_id,
      match_strategy: 'manual',
      match_status: 'matched',
      warning: null
    };
  });

  const view = buildProviderGroupsView({
    payload: nextPayload,
    documents,
    rutaArchivo: ''
  });
  nextPayload.summary = buildPayloadSummary({ payload: nextPayload, view });
  return nextPayload;
};

module.exports = {
  MAX_TRAMITE_CARATULA_MB,
  decodeCaratulaPdfBase64,
  saveTramiteCaratulaPdf,
  resolveTramiteCaratulaFilePath,
  deleteTramiteCaratulaFileIfExists,
  parseTramiteCaratulaPdf,
  applyAutomaticMatchingToPayload,
  summarizeStoredTramiteCaratula,
  applyManualResolutionToPayload
};
