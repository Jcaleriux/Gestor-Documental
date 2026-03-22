const path = require('path');

const DOCUMENTS_DIR_NAME = 'documentos';
const RECEIVED_DIR_NAME = 'facturas recibidas';
const PROCESSED_DIR_NAME = 'facturas procesadas';
const PAYMENT_TABLES_DIR_NAME = 'tablas_pago';
const PURCHASE_ORDERS_DIR_NAME = 'ordenes_compra';
const TRAMITES_DIR_NAME = 'tramites_pago';

const LEGACY_DOCUMENTS_ALIAS = 'facturas';
const LEGACY_RECEIVED_ALIAS = 'recibidas';
const LEGACY_PROCESSED_ALIAS = 'procesadas';

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
    `${DOCUMENTS_DIR_NAME}/${LEGACY_RECEIVED_ALIAS}`,
    `${DOCUMENTS_DIR_NAME}/${RECEIVED_DIR_NAME}`
  );
  normalized = replacePrefix(
    normalized,
    `${DOCUMENTS_DIR_NAME}/${LEGACY_PROCESSED_ALIAS}`,
    `${DOCUMENTS_DIR_NAME}/${PROCESSED_DIR_NAME}`
  );
  normalized = replacePrefix(
    normalized,
    `${LEGACY_DOCUMENTS_ALIAS}/${LEGACY_RECEIVED_ALIAS}`,
    `${DOCUMENTS_DIR_NAME}/${RECEIVED_DIR_NAME}`
  );
  normalized = replacePrefix(
    normalized,
    `${LEGACY_DOCUMENTS_ALIAS}/${LEGACY_PROCESSED_ALIAS}`,
    `${DOCUMENTS_DIR_NAME}/${PROCESSED_DIR_NAME}`
  );
  normalized = replacePrefix(
    normalized,
    `${LEGACY_DOCUMENTS_ALIAS}/${PAYMENT_TABLES_DIR_NAME}`,
    `${DOCUMENTS_DIR_NAME}/${PAYMENT_TABLES_DIR_NAME}`
  );
  normalized = replacePrefix(
    normalized,
    `${LEGACY_DOCUMENTS_ALIAS}/${PURCHASE_ORDERS_DIR_NAME}`,
    `${DOCUMENTS_DIR_NAME}/${PURCHASE_ORDERS_DIR_NAME}`
  );
  normalized = replacePrefix(
    normalized,
    `${LEGACY_DOCUMENTS_ALIAS}/${TRAMITES_DIR_NAME}`,
    `${DOCUMENTS_DIR_NAME}/${TRAMITES_DIR_NAME}`
  );
  normalized = replacePrefix(normalized, LEGACY_DOCUMENTS_ALIAS, DOCUMENTS_DIR_NAME);

  return normalized;
};

const getRelativePathVariants = (rawPath) => {
  const current = toCurrentRelativePath(rawPath);
  return current ? [current] : [];
};

const resolveDocumentPaths = (baseDir) => {
  const resolvedBaseDir = path.resolve(baseDir);

  return {
    baseDir: resolvedBaseDir,
    documentsRootDir: path.join(resolvedBaseDir, DOCUMENTS_DIR_NAME),
    facturasRecibidasDir: path.join(resolvedBaseDir, DOCUMENTS_DIR_NAME, RECEIVED_DIR_NAME),
    facturasProcesadasDir: path.join(resolvedBaseDir, DOCUMENTS_DIR_NAME, PROCESSED_DIR_NAME),
    tablasPagoDir: path.join(resolvedBaseDir, DOCUMENTS_DIR_NAME, PAYMENT_TABLES_DIR_NAME),
    ordenesCompraDir: path.join(resolvedBaseDir, DOCUMENTS_DIR_NAME, PURCHASE_ORDERS_DIR_NAME),
    tramitesDir: path.join(resolvedBaseDir, DOCUMENTS_DIR_NAME, TRAMITES_DIR_NAME)
  };
};

module.exports = {
  DOCUMENTS_DIR_NAME,
  RECEIVED_DIR_NAME,
  PROCESSED_DIR_NAME,
  PAYMENT_TABLES_DIR_NAME,
  PURCHASE_ORDERS_DIR_NAME,
  TRAMITES_DIR_NAME,
  toCurrentRelativePath,
  getRelativePathVariants,
  resolveDocumentPaths
};
