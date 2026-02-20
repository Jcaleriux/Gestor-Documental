const { withTransaction } = require('../db/withTransaction');
const { assertRepoContract } = require('./contabilizacionUseCases.helpers');
const { createContabilizacionCrudUseCases } = require('./contabilizacionUseCases.contabilizacion');
const { createContabilizacionRetencionUseCases } = require('./contabilizacionUseCases.retencion');

const createContabilizacionUseCases = ({ contabilizacionRepo }) => {
  if (!contabilizacionRepo) {
    throw new Error('contabilizacionRepo requerido');
  }
  assertRepoContract(contabilizacionRepo);

  const runInTransaction = (handler) => withTransaction(() => contabilizacionRepo.getClient(), handler);

  return {
    ...createContabilizacionCrudUseCases({
      contabilizacionRepo,
      runInTransaction
    }),
    ...createContabilizacionRetencionUseCases({
      contabilizacionRepo,
      runInTransaction
    })
  };
};

module.exports = { createContabilizacionUseCases };
