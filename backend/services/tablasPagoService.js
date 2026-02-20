const path = require('path');
const { handleRequest } = require('../utils/http');
const { createTablasPagoUseCases } = require('./tablasPagoUseCases');
const tablasPagoRepo = require('../repositories/tablasPagoRepository');
const proveedoresRepo = require('../repositories/proveedoresRepository');

const baseDir = process.env.FACTURAS_BASE_DIR || path.resolve(__dirname, '..', '..');
const useCases = createTablasPagoUseCases({
  tablasPagoRepo,
  proveedoresRepo,
  baseDir
});

const listTablasPago = handleRequest(async (req) => {
  const { sociedad_id, proveedor_id } = req.query || {};
  return useCases.listTablasPago({
    user: req.user,
    sociedadId: sociedad_id,
    proveedorId: proveedor_id
  });
}, 'Error fetching tablas de pago:', 'Error fetching tablas de pago');

const createTablaPago = handleRequest(async (req) => {
  return useCases.createTablaPago({
    user: req.user,
    ...(req.body || {})
  });
}, 'Error creating tabla de pago:', 'Error creating tabla de pago');

const deleteTablaPago = handleRequest(async (req) => {
  const { tablaPagoId } = req.params;
  const { sociedad_id } = req.query || {};

  return useCases.deleteTablaPago({
    user: req.user,
    sociedadId: sociedad_id,
    tablaPagoId
  });
}, 'Error deleting tabla de pago:', 'Error deleting tabla de pago');

module.exports = {
  listTablasPago,
  createTablaPago,
  deleteTablaPago
};
