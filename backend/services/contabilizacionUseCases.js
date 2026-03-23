const { runtimeConfig } = require('../config/runtime');
const { withTransaction } = require('../db/withTransaction');
const { assertRepoContract } = require('./contabilizacionUseCases.helpers');
const { createContabilizacionCrudUseCases } = require('./contabilizacionUseCases.contabilizacion');
const {
  createContabilizacionDocumentosRespaldoUseCases
} = require('./contabilizacionUseCases.documentosRespaldo');
const { createContabilizacionRetencionUseCases } = require('./contabilizacionUseCases.retencion');

const createContabilizacionUseCases = ({
  contabilizacionRepo,
  baseDir = runtimeConfig.storageBaseDir,
  maxDocumentoRespaldoMb = runtimeConfig.maxContabilizacionRespaldoMb
}) => {
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
    ...createContabilizacionDocumentosRespaldoUseCases({
      contabilizacionRepo,
      runInTransaction,
      baseDir,
      maxFileMb: maxDocumentoRespaldoMb
    }),
    ...createContabilizacionRetencionUseCases({
      contabilizacionRepo,
      runInTransaction
    })
  };
};

module.exports = { createContabilizacionUseCases };
