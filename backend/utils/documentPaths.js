const path = require('path');

const DOCUMENTS_DIR_NAME = 'documentos';
const RECEIVED_DIR_NAME = 'facturas recibidas';
const PROCESSED_DIR_NAME = 'facturas procesadas';
const PAYMENT_TABLES_DIR_NAME = 'tablas_pago';

const LEGACY_DOCUMENTS_DIR_NAME = 'facturas';
const LEGACY_RECEIVED_DIR_NAME = 'recibidas';
const LEGACY_PROCESSED_DIR_NAME = 'procesadas';

const toPosix = (value) => String(value || '').replace(/\\/g, '/');

const stripLeadingSlash = (value) => value.replace(/^\/+/, '');

const replacePrefix = (value, fromPrefix, toPrefix) => {
  if (value === fromPrefix) {
    return toPrefix;
  }
  if (value.startsWith(`${fromPrefix}/`)) {
    return `${toPrefix}/${value.slice(fromPrefix.length + 1)}`;
  }
  return value;
};

const toCurrentRelativePath = (rawPath) => {
  let normalized = stripLeadingSlash(toPosix(rawPath));

  normalized = replacePrefix(
    normalized,
    `${DOCUMENTS_DIR_NAME}/${LEGACY_RECEIVED_DIR_NAME}`,
    `${DOCUMENTS_DIR_NAME}/${RECEIVED_DIR_NAME}`
  );
  normalized = replacePrefix(
    normalized,
    `${DOCUMENTS_DIR_NAME}/${LEGACY_PROCESSED_DIR_NAME}`,
    `${DOCUMENTS_DIR_NAME}/${PROCESSED_DIR_NAME}`
  );
  normalized = replacePrefix(
    normalized,
    `${LEGACY_DOCUMENTS_DIR_NAME}/${LEGACY_RECEIVED_DIR_NAME}`,
    `${DOCUMENTS_DIR_NAME}/${RECEIVED_DIR_NAME}`
  );
  normalized = replacePrefix(
    normalized,
    `${LEGACY_DOCUMENTS_DIR_NAME}/${LEGACY_PROCESSED_DIR_NAME}`,
    `${DOCUMENTS_DIR_NAME}/${PROCESSED_DIR_NAME}`
  );
  normalized = replacePrefix(
    normalized,
    `${LEGACY_DOCUMENTS_DIR_NAME}/${PAYMENT_TABLES_DIR_NAME}`,
    `${DOCUMENTS_DIR_NAME}/${PAYMENT_TABLES_DIR_NAME}`
  );
  normalized = replacePrefix(normalized, LEGACY_DOCUMENTS_DIR_NAME, DOCUMENTS_DIR_NAME);

  return normalized;
};

const toLegacyRelativePath = (rawPath) => {
  let normalized = stripLeadingSlash(toPosix(rawPath));

  normalized = replacePrefix(
    normalized,
    `${DOCUMENTS_DIR_NAME}/${LEGACY_RECEIVED_DIR_NAME}`,
    `${LEGACY_DOCUMENTS_DIR_NAME}/${LEGACY_RECEIVED_DIR_NAME}`
  );
  normalized = replacePrefix(
    normalized,
    `${DOCUMENTS_DIR_NAME}/${LEGACY_PROCESSED_DIR_NAME}`,
    `${LEGACY_DOCUMENTS_DIR_NAME}/${LEGACY_PROCESSED_DIR_NAME}`
  );
  normalized = replacePrefix(
    normalized,
    `${DOCUMENTS_DIR_NAME}/${RECEIVED_DIR_NAME}`,
    `${LEGACY_DOCUMENTS_DIR_NAME}/${LEGACY_RECEIVED_DIR_NAME}`
  );
  normalized = replacePrefix(
    normalized,
    `${DOCUMENTS_DIR_NAME}/${PROCESSED_DIR_NAME}`,
    `${LEGACY_DOCUMENTS_DIR_NAME}/${LEGACY_PROCESSED_DIR_NAME}`
  );
  normalized = replacePrefix(
    normalized,
    `${DOCUMENTS_DIR_NAME}/${PAYMENT_TABLES_DIR_NAME}`,
    `${LEGACY_DOCUMENTS_DIR_NAME}/${PAYMENT_TABLES_DIR_NAME}`
  );
  normalized = replacePrefix(normalized, DOCUMENTS_DIR_NAME, LEGACY_DOCUMENTS_DIR_NAME);

  return normalized;
};

const getRelativePathVariants = (rawPath) => {
  const normalized = stripLeadingSlash(toPosix(rawPath));
  const current = toCurrentRelativePath(normalized);
  const legacy = toLegacyRelativePath(normalized);

  return [...new Set([current, normalized, legacy].filter(Boolean))];
};

const resolveDocumentPaths = (baseDir) => {
  const resolvedBaseDir = path.resolve(baseDir);

  return {
    baseDir: resolvedBaseDir,
    documentsRootDir: path.join(resolvedBaseDir, DOCUMENTS_DIR_NAME),
    facturasRecibidasDir: path.join(resolvedBaseDir, DOCUMENTS_DIR_NAME, RECEIVED_DIR_NAME),
    facturasProcesadasDir: path.join(resolvedBaseDir, DOCUMENTS_DIR_NAME, PROCESSED_DIR_NAME),
    tablasPagoDir: path.join(resolvedBaseDir, DOCUMENTS_DIR_NAME, PAYMENT_TABLES_DIR_NAME),
    legacyDocumentsRootDir: path.join(resolvedBaseDir, LEGACY_DOCUMENTS_DIR_NAME),
    legacyFacturasRecibidasDir: path.join(
      resolvedBaseDir,
      LEGACY_DOCUMENTS_DIR_NAME,
      LEGACY_RECEIVED_DIR_NAME
    ),
    legacyFacturasProcesadasDir: path.join(
      resolvedBaseDir,
      LEGACY_DOCUMENTS_DIR_NAME,
      LEGACY_PROCESSED_DIR_NAME
    ),
    legacyTablasPagoDir: path.join(
      resolvedBaseDir,
      LEGACY_DOCUMENTS_DIR_NAME,
      PAYMENT_TABLES_DIR_NAME
    )
  };
};

module.exports = {
  DOCUMENTS_DIR_NAME,
  RECEIVED_DIR_NAME,
  PROCESSED_DIR_NAME,
  PAYMENT_TABLES_DIR_NAME,
  LEGACY_DOCUMENTS_DIR_NAME,
  LEGACY_RECEIVED_DIR_NAME,
  LEGACY_PROCESSED_DIR_NAME,
  toCurrentRelativePath,
  toLegacyRelativePath,
  getRelativePathVariants,
  resolveDocumentPaths
};
