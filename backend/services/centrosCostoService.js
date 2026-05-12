const { handleRequest } = require('../utils/http');
const { withTransaction } = require('../db/withTransaction');
const contabilizacionRepo = require('../repositories/contabilizacionRepository');
const centrosCostoRepo = require('../repositories/centrosCostoRepository');
const usuariosRepo = require('../repositories/usuariosRepository');
const rolesRepo = require('../repositories/rolesRepository');
const { createCentrosCostoUseCases } = require('./centrosCostoUseCases');

const runInTransaction = (handler) => withTransaction(contabilizacionRepo.getClient, handler);

const useCases = createCentrosCostoUseCases({
  centrosCostoRepo,
  usuariosRepo,
  rolesRepo,
  runInTransaction,
});

const listCentrosCosto = handleRequest(async (req) => {
  const { sociedad_id } = req.query || {};
  return useCases.listCentrosCosto({
    user: req.user,
    sociedadId: sociedad_id,
  });
}, 'Error fetching centros de costo:', 'Error fetching centros de costo');

const createCentroCosto = handleRequest(async (req) => useCases.createCentroCosto({
  user: req.user,
  ...(req.body || {}),
}), 'Error creating centro de costo:', 'Error creating centro de costo');

const updateCentroCosto = handleRequest(async (req) => {
  const { id } = req.params;
  return useCases.updateCentroCosto({
    user: req.user,
    id,
    ...(req.body || {}),
  });
}, 'Error updating centro de costo:', 'Error updating centro de costo');

const bulkUpsertCentrosCosto = handleRequest(async (req) => {
  const { sociedad_id, centros } = req.body || {};
  return useCases.bulkUpsertCentrosCosto({
    user: req.user,
    sociedadId: sociedad_id,
    centros,
  });
}, 'Error bulk saving centros de costo:', 'Error bulk saving centros de costo');

module.exports = {
  listCentrosCosto,
  createCentroCosto,
  updateCentroCosto,
  bulkUpsertCentrosCosto,
};
