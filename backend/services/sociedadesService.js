const { handleRequest } = require('../utils/http');
const { createSociedadesUseCases } = require('./sociedadesUseCases');
const sociedadesRepo = require('../repositories/sociedadesRepository');
const usuariosSociedadesRepo = require('../repositories/usuariosSociedadesRepository');

const useCases = createSociedadesUseCases({ sociedadesRepo, usuariosSociedadesRepo });

const listSociedades = handleRequest(async (req) => {
  return useCases.listSociedades({ user: req.user });
}, 'Error fetching sociedades:', 'Error fetching sociedades');

const listSociedadesAdmin = handleRequest(async () => {
  return useCases.listSociedadesAdmin();
}, 'Error fetching sociedades admin:', 'Error fetching sociedades');

const createSociedad = handleRequest(async (req) => {
  return useCases.createSociedad(req.body || {});
}, 'Error creating sociedad:', 'Error creating sociedad');

const updateSociedad = handleRequest(async (req) => {
  return useCases.updateSociedad({
    id: req.params.id,
    ...(req.body || {})
  });
}, 'Error updating sociedad:', 'Error updating sociedad');

module.exports = {
  listSociedades,
  listSociedadesAdmin,
  createSociedad,
  updateSociedad
};
