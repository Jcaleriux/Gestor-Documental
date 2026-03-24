const { withTransaction } = require('../db/withTransaction');
const { runtimeConfig } = require('../config/runtime');
const { assertRepoContract } = require('./tramitesPagoUseCases.helpers');
const { createTramitesPagoCaratulasUseCases } = require('./tramitesPagoUseCases.caratulas');
const { createTramitesPagoTesoreriaUseCases } = require('./tramitesPagoUseCases.tesoreria');
const { createTramitesPagoReadUseCases } = require('./tramitesPagoUseCases.reads');
const { createTramitesPagoWorkflowUseCases } = require('./tramitesPagoUseCases.workflow');
const { createTramitesPagoPolicyRegistry } = require('./tramitesPagoPolicyRegistry');

const createTramitesPagoUseCases = ({
  tramitesPagoRepo,
  baseDir = runtimeConfig.storageBaseDir
}) => {
  if (!tramitesPagoRepo) {
    throw new Error('tramitesPagoRepo requerido');
  }
  assertRepoContract(tramitesPagoRepo);

  const runInTransaction = (handler) => withTransaction(() => tramitesPagoRepo.getClient(), handler);
  const policyRegistry = createTramitesPagoPolicyRegistry({ tramitesPagoRepo });

  return {
    ...createTramitesPagoCaratulasUseCases({
      tramitesPagoRepo,
      runInTransaction,
      baseDir
    }),
    ...createTramitesPagoTesoreriaUseCases({
      tramitesPagoRepo,
      runInTransaction,
      policyRegistry
    }),
    ...createTramitesPagoReadUseCases({
      tramitesPagoRepo,
      baseDir
    }),
    ...createTramitesPagoWorkflowUseCases({
      tramitesPagoRepo,
      runInTransaction,
      policyRegistry
    })
  };
};

module.exports = { createTramitesPagoUseCases };
