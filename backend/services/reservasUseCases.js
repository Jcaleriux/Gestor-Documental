const { createReservasDocuments } = require('./reservas/documents');
const { createReservasDocumentStorage } = require('./reservas/documentStorage');
const { createReservasOperations } = require('./reservas/operations');
const {
  assertRepoContract,
  createReservasSharedContext,
} = require('./reservas/shared');

const createReservasUseCases = ({ reservasRepo, baseDir }) => {
  if (!reservasRepo) {
    throw new Error('reservasRepo requerido');
  }

  assertRepoContract(reservasRepo);

  if (!baseDir) {
    throw new Error('baseDir requerido');
  }

  const shared = createReservasSharedContext({ reservasRepo });
  const documentStorage = createReservasDocumentStorage({
    baseDir,
    normalizeOptionalText: shared.normalizeOptionalText,
    normalizeRequiredText: shared.normalizeRequiredText,
  });

  return {
    ...createReservasOperations({ reservasRepo, shared }),
    ...createReservasDocuments({ reservasRepo, shared, documentStorage }),
  };
};

module.exports = {
  createReservasUseCases,
};
