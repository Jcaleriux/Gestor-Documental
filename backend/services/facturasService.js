const { createFacturasUseCases } = require('./facturasUseCases');
const facturasRepo = require('../repositories/facturasRepository');
const { handleRequest } = require('../utils/http');

const useCases = createFacturasUseCases({ facturasRepo });

const listFacturas = handleRequest((req) => {
  return useCases.listFacturas(req.query || {});
}, 'Error fetching facturas:', 'Error fetching facturas');

const listRetencionesPendientes = handleRequest((req) => {
  const { sociedadId } = req.query || {};
  return useCases.listRetencionesPendientes({ sociedadId });
}, 'Error fetching retenciones pendientes:', 'Error fetching retenciones pendientes');

const getFactura = handleRequest((req) => {
  const { id } = req.params;
  return useCases.getFactura({ id });
}, 'Error fetching factura:', 'Error fetching factura');

const getMensajeHacienda = handleRequest((req) => {
  const { id } = req.params;
  return useCases.getMensajeHacienda({ id });
}, 'Error fetching mensaje hacienda:', 'Error fetching mensaje hacienda');

const getManifest = handleRequest(async (req, res) => {
  const { id } = req.params;
  const { manifest, manifestPath } = await useCases.getManifest({ id });

  res
    .status(200)
    .type('application/json')
    .send(JSON.stringify({ _manifest_path: manifestPath, ...manifest }, null, 2));
}, 'Error fetching manifest:', 'Error fetching manifest');

const getNotaCreditoManifest = handleRequest(async (req, res) => {
  const { id } = req.params;
  const { manifest, manifestPath } = await useCases.getNotaCreditoManifest({ id });

  res
    .status(200)
    .type('application/json')
    .send(JSON.stringify({ _manifest_path: manifestPath, ...manifest }, null, 2));
}, 'Error fetching nota credito manifest:', 'Error fetching nota credito manifest');

const listNotasCredito = handleRequest((req) => {
  const query = { ...(req.query || {}) };
  if (query.proveedor_id && !query.proveedorId) {
    query.proveedorId = query.proveedor_id;
  }
  return useCases.listNotasCredito(query);
}, 'Error fetching notas de credito:', 'Error fetching notas de credito');

const listTiquetesElectronicos = handleRequest((req) => {
  return useCases.listTiquetesElectronicos(req.query || {});
}, 'Error fetching tiquetes electronicos:', 'Error fetching tiquetes electronicos');

const listMensajesHacienda = handleRequest((req) => {
  const { sociedadId } = req.query || {};
  return useCases.listMensajesHacienda({ sociedadId });
}, 'Error fetching mensajes hacienda:', 'Error fetching mensajes hacienda');

module.exports = {
  listFacturas,
  listRetencionesPendientes,
  getFactura,
  getMensajeHacienda,
  getManifest,
  getNotaCreditoManifest,
  listNotasCredito,
  listTiquetesElectronicos,
  listMensajesHacienda
};
