const { withTransaction } = require('../db/withTransaction');
const { assertRepoContract } = require('./tramitesPagoUseCases.helpers');
const { createTramitesPagoTesoreriaUseCases } = require('./tramitesPagoUseCases.tesoreria');
const { createTramitesPagoReadUseCases } = require('./tramitesPagoUseCases.reads');
const { createTramitesPagoWorkflowUseCases } = require('./tramitesPagoUseCases.workflow');
const { createTramitesPagoPolicyRegistry } = require('./tramitesPagoPolicyRegistry');

const createTramitesPagoUseCases = ({ tramitesPagoRepo }) => {
  if (!tramitesPagoRepo) {
    throw new Error('tramitesPagoRepo requerido');
  }
  assertRepoContract(tramitesPagoRepo);

  const runInTransaction = (handler) => withTransaction(() => tramitesPagoRepo.getClient(), handler);
  const policyRegistry = createTramitesPagoPolicyRegistry({ tramitesPagoRepo });

  return {
    ...createTramitesPagoTesoreriaUseCases({
      tramitesPagoRepo,
      runInTransaction,
      policyRegistry
    }),
    ...createTramitesPagoReadUseCases({
      tramitesPagoRepo
    }),
    ...createTramitesPagoWorkflowUseCases({
      tramitesPagoRepo,
      runInTransaction,
      policyRegistry
    })
  };
};

module.exports = { createTramitesPagoUseCases };
