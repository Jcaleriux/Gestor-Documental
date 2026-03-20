const { handleRequest } = require('../utils/http');
const { sendFile } = require('./filesService');
const { createReservasUseCases } = require('./reservasUseCases');
const reservasRepo = require('../repositories/reservasRepository');
const { runtimeConfig } = require('../config/runtime');

const useCases = createReservasUseCases({
  reservasRepo,
  baseDir: runtimeConfig.storageBaseDir
});

const listOperacionesReserva = handleRequest(async (req) => {
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
}, 'Error fetching reservas:', 'Error fetching reservas');

const getOperacionReserva = handleRequest(async (req) => {
  const { operacionId } = req.params;
  return useCases.getOperacion({
    user: req.user,
    operacionId,
  });
}, 'Error fetching reserva:', 'Error fetching reserva');

const createOperacionReserva = handleRequest(async (req) => {
  return useCases.createOperacion({
    user: req.user,
    ...(req.body || {}),
  });
}, 'Error creating reserva:', 'Error creating reserva');

const cancelOperacionReserva = handleRequest(async (req) => {
  const { operacionId } = req.params;
  const { motivo, usuario } = req.body || {};

  return useCases.cancelOperacion({
    user: req.user,
    operacionId,
    motivo,
    usuario,
  });
}, 'Error canceling reserva:', 'Error canceling reserva');

const closeOperacionReserva = handleRequest(async (req) => {
  const { operacionId } = req.params;
  const { motivo, usuario } = req.body || {};

  return useCases.closeOperacion({
    user: req.user,
    operacionId,
    motivo,
    usuario,
  });
}, 'Error closing reserva:', 'Error closing reserva');

const transferOperacionReserva = handleRequest(async (req) => {
  const { operacionId } = req.params;

  return useCases.transferOperacion({
    user: req.user,
    operacionId,
    ...(req.body || {}),
  });
}, 'Error transferring reserva:', 'Error transferring reserva');

const upsertOperacionDocumentoReserva = handleRequest(async (req) => {
  const { operacionId } = req.params;

  return useCases.upsertOperacionDocumento({
    user: req.user,
    operacionId,
    ...(req.body || {}),
  });
}, 'Error upserting reserva document:', 'Error upserting reserva document');

const syncOperacionDocumentoReserva = handleRequest(async (req) => {
  return useCases.syncOperacionDocumento({
    user: req.user,
    ...(req.body || {}),
  });
}, 'Error syncing reserva document:', 'Error syncing reserva document');

const previewOperacionDocumentoReserva = handleRequest(async (req, res) => {
  const { operacionId, documentoId } = req.params;
  const result = await useCases.getOperacionDocumentoPreview({
    user: req.user,
    operacionId,
    documentoId,
  });

  await sendFile(res, result.fullPath, {
    logMessage: 'Error sending reserva document preview:',
    contentType: result.documento?.mime_type || undefined,
    contentDisposition: `inline; filename="${result.documento?.nombre_archivo || `doc_${documentoId}`}"`,
  });
}, 'Error previewing reserva document:', 'Error previewing reserva document');

const replaceOperacionDocumentoReserva = handleRequest(async (req) => {
  const { operacionId, documentoId } = req.params;

  return useCases.replaceOperacionDocumento({
    user: req.user,
    operacionId,
    documentoId,
    ...(req.body || {}),
  });
}, 'Error replacing reserva document:', 'Error replacing reserva document');

module.exports = {
  listOperacionesReserva,
  getOperacionReserva,
  createOperacionReserva,
  cancelOperacionReserva,
  closeOperacionReserva,
  transferOperacionReserva,
  upsertOperacionDocumentoReserva,
  syncOperacionDocumentoReserva,
  previewOperacionDocumentoReserva,
  replaceOperacionDocumentoReserva,
};
















