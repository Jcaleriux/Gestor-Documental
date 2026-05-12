const { createTramitesPagoUseCases } = require('./tramitesPagoUseCases');
const tramitesPagoRepo = require('../repositories/tramitesPagoRepository');
const { handleRequest } = require('../utils/http');
const { runtimeConfig } = require('../config/runtime');

const useCases = createTramitesPagoUseCases({
  tramitesPagoRepo,
  baseDir: runtimeConfig.storageBaseDir
});
const resolveActorUsuario = (req, fallback) => (
  req.user?.email
  || req.user?.nombre
  || fallback
  || 'system'
);

const rechazoTesoreria = handleRequest((req) => {
  const { id, facturaId } = req.params;
  const { motivo, usuario } = req.body || {};
  return useCases.rechazoTesoreria({
    id,
    facturaId,
    motivo,
    usuario: resolveActorUsuario(req, usuario)
  });
}, 'Error excluding document in tesoreria:', 'Error excluding document in tesoreria');

const accionTesoreria = handleRequest((req) => {
  const { id, facturaId } = req.params;
  const { accion, destino, motivo, usuario } = req.body || {};
  return useCases.accionTesoreria({
    id,
    facturaId,
    accion,
    destino,
    motivo,
    usuario: resolveActorUsuario(req, usuario)
  });
}, 'Error resolving tesoreria action:', 'Error resolving tesoreria action');

const listTramites = handleRequest((req) => {
  const { sociedadId, estado } = req.query || {};
  return useCases.listTramites({ sociedadId, estado });
}, 'Error fetching tramites:', 'Error fetching tramites');

const getRetencionesDisponibles = handleRequest((req) => {
  const { sociedadId } = req.query || {};
  return useCases.getRetencionesDisponibles({ sociedadId });
}, 'Error fetching retention payments:', 'Error fetching retention payments');

const getTramite = handleRequest((req) => {
  const { id } = req.params;
  return useCases.getTramite({
    id,
    actorUserId: req.user?.id,
    actorRoleId: req.user?.rol
  });
}, 'Error fetching tramite:', 'Error fetching tramite');

const getTramitePdfUnificado = handleRequest(async (req, res) => {
  const { id } = req.params;
  const pdfDownload = await useCases.getTramitePdfUnificado({
    id,
    actorUserId: req.user?.id,
    actorRoleId: req.user?.rol,
    providerSortDirection: req.query?.providerSortDirection
  });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${pdfDownload.filename}"`);
  res.setHeader('X-Novogar-Partial-Download', pdfDownload.partialDownload ? '1' : '0');
  res.setHeader('X-Novogar-Omitted-Count', String(pdfDownload.omittedCount || 0));
  if (pdfDownload.omittedItemsHeader) {
    res.setHeader('X-Novogar-Omitted-Items', pdfDownload.omittedItemsHeader);
  }

  res.send(pdfDownload.buffer);
}, 'Error downloading unified tramite PDF:', 'Error downloading unified tramite PDF');

const getHistorial = handleRequest((req) => {
  const { id } = req.params;
  return useCases.getHistorial({ id });
}, 'Error fetching tramite history:', 'Error fetching tramite history');

const uploadCaratulas = handleRequest((req) => {
  const { id } = req.params;
  const { filename, file_base64, usuario } = req.body || {};
  return useCases.uploadCaratulas({
    id,
    filename,
    file_base64,
    usuario: resolveActorUsuario(req, usuario)
  });
}, 'Error uploading tramite caratulas:', 'Error uploading tramite caratulas');

const resolveCaratulas = handleRequest((req) => {
  const { id } = req.params;
  const {
    group_key,
    provider_factura_id,
    line_matches,
    usuario
  } = req.body || {};
  return useCases.resolveCaratulas({
    id,
    group_key,
    provider_factura_id,
    line_matches,
    usuario: resolveActorUsuario(req, usuario)
  });
}, 'Error resolving tramite caratulas:', 'Error resolving tramite caratulas');

const confirmProviderCaratulaOrder = handleRequest((req) => {
  const { id, providerKey } = req.params;
  const { factura_ids, order_source, usuario } = req.body || {};
  return useCases.confirmProviderOrder({
    id,
    provider_key: providerKey,
    factura_ids,
    order_source,
    usuario: resolveActorUsuario(req, usuario)
  });
}, 'Error confirming provider invoice order:', 'Error confirming provider invoice order');

const uploadProviderCaratula = handleRequest((req) => {
  const { id, providerKey } = req.params;
  const { filename, file_base64, usuario } = req.body || {};
  return useCases.uploadProviderCaratula({
    id,
    provider_key: providerKey,
    filename,
    file_base64,
    usuario: resolveActorUsuario(req, usuario)
  });
}, 'Error uploading provider caratula:', 'Error uploading provider caratula');

const confirmProviderCaratula = handleRequest((req) => {
  const { id, providerKey } = req.params;
  const { usuario } = req.body || {};
  return useCases.confirmProviderCaratula({
    id,
    provider_key: providerKey,
    usuario: resolveActorUsuario(req, usuario)
  });
}, 'Error confirming provider caratula:', 'Error confirming provider caratula');

const assignOrphanCaratula = handleRequest((req) => {
  const { id, orphanId } = req.params;
  const { provider_key, usuario } = req.body || {};
  return useCases.assignOrphanCaratula({
    id,
    orphan_id: orphanId,
    provider_key,
    usuario: resolveActorUsuario(req, usuario)
  });
}, 'Error assigning orphan caratula:', 'Error assigning orphan caratula');

const discardOrphanCaratula = handleRequest((req) => {
  const { id, orphanId } = req.params;
  const { usuario } = req.body || {};
  return useCases.discardOrphanCaratula({
    id,
    orphan_id: orphanId,
    usuario: resolveActorUsuario(req, usuario)
  });
}, 'Error discarding orphan caratula:', 'Error discarding orphan caratula');

const crearTramite = handleRequest((req) => {
  const { sociedad_id, factura_ids, retencion_factura_ids, usuario } = req.body || {};
  return useCases.crearTramite({
    sociedad_id,
    factura_ids,
    retencion_factura_ids,
    usuario: resolveActorUsuario(req, usuario)
  });
}, 'Error creating tramite:', 'Error creating tramite');

const cambiarEstado = handleRequest((req) => {
  const { id } = req.params;
  const { estado, usuario, motivo, force, pagos_documentos } = req.body || {};
  return useCases.cambiarEstado({
    id,
    estado,
    usuario: resolveActorUsuario(req, usuario),
    motivo,
    force,
    pagos_documentos,
    actorPermissions: req.user?.permissions
  });
}, 'Error updating tramite state:', 'Error updating tramite state');

const decisionDocumento = handleRequest((req) => {
  const { id, facturaId } = req.params;
  const { etapa, decision, motivo, usuario } = req.body || {};
  return useCases.decisionDocumento({
    id,
    facturaId,
    etapa,
    decision,
    motivo,
    usuario: resolveActorUsuario(req, usuario),
    actorUserId: req.user?.id,
    actorUserName: req.user?.nombre,
    actorUserEmail: req.user?.email,
    actorRoleId: req.user?.rol,
    actorPermissions: req.user?.permissions
  });
}, 'Error updating document decision:', 'Error updating document decision');

module.exports = {
  rechazoTesoreria,
  accionTesoreria,
  listTramites,
  getRetencionesDisponibles,
  getTramite,
  getTramitePdfUnificado,
  getHistorial,
  uploadCaratulas,
  resolveCaratulas,
  confirmProviderCaratulaOrder,
  uploadProviderCaratula,
  confirmProviderCaratula,
  assignOrphanCaratula,
  discardOrphanCaratula,
  crearTramite,
  cambiarEstado,
  decisionDocumento
};
