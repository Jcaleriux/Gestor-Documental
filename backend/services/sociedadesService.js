const { handleRequest } = require('../utils/http');
const { createSociedadesUseCases } = require('./sociedadesUseCases');
const sociedadesRepo = require('../repositories/sociedadesRepository');
const usuariosSociedadesRepo = require('../repositories/usuariosSociedadesRepository');

const useCases = createSociedadesUseCases({ sociedadesRepo, usuariosSociedadesRepo });

const listSociedades = handleRequest(async (req) => {
  return useCases.listSociedades({ user: req.user });
}, 'Error fetching sociedades:', 'Error fetching sociedades');

module.exports = { listSociedades };
