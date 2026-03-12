const path = require('path');
const { handleRequest } = require('../utils/http');
const { sendFile } = require('./filesService');
const { createVentasUseCases } = require('./ventasUseCases');
const ventasRepo = require('../repositories/ventasRepository');

const defaultBaseDir = path.resolve(__dirname, '..', '..');
const baseDir = process.env.FACTURAS_BASE_DIR || defaultBaseDir;
const useCases = createVentasUseCases({ ventasRepo, baseDir });

const listOperacionesVenta = handleRequest(async (req) => {
  const {
    sociedad_id,
    estado,
    proyecto_codigo,
    unidad_codigo,
    cliente,
    limit,
  } = req.query || {};

  return useCases.listOperaciones({
    user: req.user,
    sociedadId: sociedad_id,
    estado,
    proyectoCodigo: proyecto_codigo,
    unidadCodigo: unidad_codigo,
    cliente,
    limit,
  });
}, 'Error fetching ventas operations:', 'Error fetching ventas operations');

const getOperacionVenta = handleRequest(async (req) => {
  const { operacionId } = req.params;
  return useCases.getOperacion({
    user: req.user,
    operacionId,
  });
}, 'Error fetching ventas operation:', 'Error fetching ventas operation');

const createOperacionVenta = handleRequest(async (req) => {
  return useCases.createOperacion({
    user: req.user,
    ...(req.body || {}),
  });
}, 'Error creating ventas operation:', 'Error creating ventas operation');

const cancelOperacionVenta = handleRequest(async (req) => {
  const { operacionId } = req.params;
  const { motivo, usuario } = req.body || {};

  return useCases.cancelOperacion({
    user: req.user,
    operacionId,
    motivo,
    usuario,
  });
}, 'Error canceling ventas operation:', 'Error canceling ventas operation');

const closeOperacionVenta = handleRequest(async (req) => {
  const { operacionId } = req.params;
  const { motivo, usuario } = req.body || {};

  return useCases.closeOperacion({
    user: req.user,
    operacionId,
    motivo,
    usuario,
  });
}, 'Error closing ventas operation:', 'Error closing ventas operation');

const transferOperacionVenta = handleRequest(async (req) => {
  const { operacionId } = req.params;

  return useCases.transferOperacion({
    user: req.user,
    operacionId,
    ...(req.body || {}),
  });
}, 'Error transferring ventas operation:', 'Error transferring ventas operation');

const upsertOperacionDocumentoVenta = handleRequest(async (req) => {
  const { operacionId } = req.params;

  return useCases.upsertOperacionDocumento({
    user: req.user,
    operacionId,
    ...(req.body || {}),
  });
}, 'Error upserting ventas operation document:', 'Error upserting ventas operation document');

const syncOperacionDocumentoVenta = handleRequest(async (req) => {
  return useCases.syncOperacionDocumento({
    user: req.user,
    ...(req.body || {}),
  });
}, 'Error syncing ventas operation document:', 'Error syncing ventas operation document');

const previewOperacionDocumentoVenta = handleRequest(async (req, res) => {
  const { operacionId, documentoId } = req.params;
  const result = await useCases.getOperacionDocumentoPreview({
    user: req.user,
    operacionId,
    documentoId,
  });

  await sendFile(res, result.fullPath, {
    logMessage: 'Error sending ventas operation document preview:',
    contentType: result.documento?.mime_type || undefined,
    contentDisposition: `inline; filename="${result.documento?.nombre_archivo || `doc_${documentoId}`}"`,
  });
}, 'Error previewing ventas operation document:', 'Error previewing ventas operation document');

const replaceOperacionDocumentoVenta = handleRequest(async (req) => {
  const { operacionId, documentoId } = req.params;

  return useCases.replaceOperacionDocumento({
    user: req.user,
    operacionId,
    documentoId,
    ...(req.body || {}),
  });
}, 'Error replacing ventas operation document:', 'Error replacing ventas operation document');

module.exports = {
  listOperacionesVenta,
  getOperacionVenta,
  createOperacionVenta,
  cancelOperacionVenta,
  closeOperacionVenta,
  transferOperacionVenta,
  upsertOperacionDocumentoVenta,
  syncOperacionDocumentoVenta,
  previewOperacionDocumentoVenta,
  replaceOperacionDocumentoVenta,
};
