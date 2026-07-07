const pool = require('../db');
const usuariosRepo = require('../repositories/usuariosRepository');
const rolesRepo = require('../repositories/rolesRepository');
const { handleRequest } = require('../utils/http');
const { createOnboardingUseCases } = require('./onboardingUseCases');

const useCases = createOnboardingUseCases({
  pool,
  usuariosRepo,
  rolesRepo,
});

const getStatus = handleRequest(async () => {
  return useCases.getStatus();
}, 'Error fetching onboarding status:', 'Error fetching onboarding status');

const setupInitialAdmin = handleRequest(async (req) => {
  const {
    nombre,
    email,
    password,
  } = req.body || {};

  return useCases.setupInitialAdmin({
    nombre,
    email,
    password,
  });
}, 'Error configuring onboarding:', 'Error configurando onboarding');

module.exports = {
  getStatus,
  setupInitialAdmin,
};
