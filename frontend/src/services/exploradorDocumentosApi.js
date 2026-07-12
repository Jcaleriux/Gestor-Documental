import axios from 'axios';

export const EXPLORADOR_CONTRACT_ERROR_MESSAGE = 'El backend devolvio datos no compatibles para el explorador.';

export const extractExploradorPayload = (response) => {
  if (response?.data?.success === false) {
    throw new Error(response?.data?.error || 'No se pudo cargar el explorador de documentos.');
  }

  const payload = response?.data?.data;
  if (
    !payload
    || typeof payload !== 'object'
    || !payload.resumen
    || !Array.isArray(payload.documentos)
    || !payload.paginacion
  ) {
    const error = new Error(EXPLORADOR_CONTRACT_ERROR_MESSAGE);
    error.code = 'EXPLORADOR_CONTRACT_ERROR';
    throw error;
  }

  return payload;
};

const explorar = (params) => axios.get('/api/explorador/documentos', { params });

export const exploradorDocumentosApi = { explorar };
