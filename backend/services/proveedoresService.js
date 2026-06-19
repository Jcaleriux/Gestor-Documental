const { handleRequest } = require('../utils/http');
const { createProveedoresUseCases } = require('./proveedoresUseCases');
const proveedoresRepo = require('../repositories/proveedoresRepository');

const useCases = createProveedoresUseCases({ proveedoresRepo });

const listProveedores = handleRequest(async (req) => {
  const { sociedad_id } = req.query || {};
  return useCases.listProveedores({
    user: req.user,
    sociedadId: sociedad_id
  });
}, 'Error fetching proveedores:', 'Error fetching proveedores');

const listProveedorHistorial = handleRequest(async (req) => {
  const { id } = req.params;
  return useCases.listProveedorHistorial({
    user: req.user,
    id
  });
}, 'Error fetching historial proveedor:', 'Error fetching historial proveedor');

const createProveedor = handleRequest(async (req) => {
  return useCases.createProveedor({
    user: req.user,
    ...(req.body || {})
  });
}, 'Error creating proveedor:', 'Error creating proveedor');

const updateProveedor = handleRequest(async (req) => {
  const { id } = req.params;
  return useCases.updateProveedor({
    user: req.user,
    id,
    ...(req.body || {})
  });
}, 'Error updating proveedor:', 'Error updating proveedor');

module.exports = {
  listProveedores,
  listProveedorHistorial,
  createProveedor,
  updateProveedor
};
