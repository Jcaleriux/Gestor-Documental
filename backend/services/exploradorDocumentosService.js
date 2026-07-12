const { createExploradorDocumentosUseCases } = require('./exploradorDocumentosUseCases');
const exploradorRepo = require('../repositories/exploradorDocumentosRepository');
const { handleRequest } = require('../utils/http');

const useCases = createExploradorDocumentosUseCases({ exploradorRepo });

const explorarDocumentos = handleRequest(
  (req) => useCases.explorar({ query: req.query, user: req.user }),
  'Error explorando documentos:',
  'No se pudo cargar el explorador de documentos'
);

module.exports = { explorarDocumentos };
