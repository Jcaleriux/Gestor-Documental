const { handleRequest } = require('../utils/http');
const { createOrdenesCompraUseCases } = require('./ordenesCompraUseCases');
const ordenesCompraRepo = require('../repositories/ordenesCompraRepository');
const proveedoresRepo = require('../repositories/proveedoresRepository');
const { runtimeConfig } = require('../config/runtime');

const useCases = createOrdenesCompraUseCases({
  ordenesCompraRepo,
  proveedoresRepo,
  baseDir: runtimeConfig.storageBaseDir
});

const listOrdenesCompra = handleRequest(async (req) => {
  const { sociedad_id, proveedor_id, estado } = req.query || {};
  return useCases.listOrdenesCompra({
    user: req.user,
    sociedadId: sociedad_id,
    proveedorId: proveedor_id,
    estado
  });
}, 'Error fetching ordenes de compra:', 'Error fetching ordenes de compra');

const createOrdenCompra = handleRequest(async (req) => {
  return useCases.createOrdenCompra({
    user: req.user,
    ...(req.body || {})
  });
}, 'Error creating orden de compra:', 'Error creating orden de compra');

const autoImportOrdenCompra = handleRequest(async (req) => {
  return useCases.autoImportOrdenCompra({
    user: req.user,
    ...(req.body || {})
  });
}, 'Error auto importing orden de compra:', 'Error auto importing orden de compra');

const deleteOrdenCompra = handleRequest(async (req) => {
  const { ordenCompraId } = req.params;
  const { sociedad_id } = req.query || {};

  return useCases.deleteOrdenCompra({
    user: req.user,
    sociedadId: sociedad_id,
    ordenCompraId
  });
}, 'Error deleting orden de compra:', 'Error deleting orden de compra');

const updateEstadoManualOrdenCompra = handleRequest(async (req) => {
  const { ordenCompraId } = req.params;
  const { sociedad_id } = req.query || {};
  const { estado } = req.body || {};

  return useCases.updateEstadoManual({
    user: req.user,
    sociedadId: sociedad_id,
    ordenCompraId,
    estado
  });
}, 'Error updating orden de compra state:', 'Error updating orden de compra state');

module.exports = {
  listOrdenesCompra,
  createOrdenCompra,
  autoImportOrdenCompra,
  deleteOrdenCompra,
  updateEstadoManualOrdenCompra
};
