const { createTramitesPagoUseCases } = require('./tramitesPagoUseCases');
const tramitesPagoRepo = require('../repositories/tramitesPagoRepository');
const { handleRequest } = require('../utils/http');

const useCases = createTramitesPagoUseCases({ tramitesPagoRepo });
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
    actorUserId: req.user?.id
  });
}, 'Error fetching tramite:', 'Error fetching tramite');

const getHistorial = handleRequest((req) => {
  const { id } = req.params;
  return useCases.getHistorial({ id });
}, 'Error fetching tramite history:', 'Error fetching tramite history');

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
    actorPermissions: req.user?.permissions
  });
}, 'Error updating document decision:', 'Error updating document decision');

module.exports = {
  rechazoTesoreria,
  accionTesoreria,
  listTramites,
  getRetencionesDisponibles,
  getTramite,
  getHistorial,
  crearTramite,
  cambiarEstado,
  decisionDocumento
};
