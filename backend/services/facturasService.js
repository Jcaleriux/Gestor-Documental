const { createFacturasUseCases } = require('./facturasUseCases');
const facturasRepo = require('../repositories/facturasRepository');
const { handleRequest } = require('../utils/http');

const useCases = createFacturasUseCases({ facturasRepo });

const listFacturas = handleRequest((req) => {
  return useCases.listFacturas({ ...(req.query || {}), user: req.user });
}, 'Error fetching facturas:', 'Error fetching facturas');

const listRetencionesPendientes = handleRequest((req) => {
  const { sociedadId } = req.query || {};
  return useCases.listRetencionesPendientes({ sociedadId, user: req.user });
}, 'Error fetching retenciones pendientes:', 'Error fetching retenciones pendientes');

const getFactura = handleRequest((req) => {
  const { id } = req.params;
  return useCases.getFactura({ id, user: req.user });
}, 'Error fetching factura:', 'Error fetching factura');

const getFacturasPdfSeleccionadas = handleRequest(async (req, res) => {
  const pdfDownload = await useCases.getFacturasPdfSeleccionadas({
    sociedadId: req.body?.sociedadId || req.query?.sociedadId,
    facturaIds: req.body?.facturaIds || req.query?.facturaIds,
    user: req.user,
  });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${pdfDownload.filename}"`);
  res.setHeader('X-Novogar-Partial-Download', pdfDownload.partialDownload ? '1' : '0');
  res.setHeader('X-Novogar-Omitted-Count', String(pdfDownload.omittedCount || 0));
  if (pdfDownload.omittedItemsHeader) {
    res.setHeader('X-Novogar-Omitted-Items', pdfDownload.omittedItemsHeader);
  }
  res.send(pdfDownload.buffer);
}, 'Error downloading selected facturas PDF:', 'Error downloading selected facturas PDF');

const getMensajeHacienda = handleRequest((req) => {
  const { id } = req.params;
  return useCases.getMensajeHacienda({ id, user: req.user });
}, 'Error fetching mensaje hacienda:', 'Error fetching mensaje hacienda');

const getManifest = handleRequest(async (req, res) => {
  const { id } = req.params;
  const { manifest, manifestPath } = await useCases.getManifest({ id, user: req.user });

  res
    .status(200)
    .type('application/json')
    .send(JSON.stringify({ _manifest_path: manifestPath, ...manifest }, null, 2));
}, 'Error fetching manifest:', 'Error fetching manifest');

const getNotaCreditoManifest = handleRequest(async (req, res) => {
  const { id } = req.params;
  const { manifest, manifestPath } = await useCases.getNotaCreditoManifest({ id, user: req.user });

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
  return useCases.listNotasCredito({ ...query, user: req.user });
}, 'Error fetching notas de credito:', 'Error fetching notas de credito');

const listTiquetesElectronicos = handleRequest((req) => {
  return useCases.listTiquetesElectronicos({ ...(req.query || {}), user: req.user });
}, 'Error fetching tiquetes electronicos:', 'Error fetching tiquetes electronicos');

const listMensajesHacienda = handleRequest((req) => {
  const { sociedadId } = req.query || {};
  return useCases.listMensajesHacienda({ sociedadId, user: req.user });
}, 'Error fetching mensajes hacienda:', 'Error fetching mensajes hacienda');

module.exports = {
  listFacturas,
  listRetencionesPendientes,
  getFactura,
  getFacturasPdfSeleccionadas,
  getMensajeHacienda,
  getManifest,
  getNotaCreditoManifest,
  listNotasCredito,
  listTiquetesElectronicos,
  listMensajesHacienda
};
