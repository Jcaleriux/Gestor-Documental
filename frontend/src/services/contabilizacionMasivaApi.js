import axios from 'axios';

const analizarDiarioDocumentos = (payload) => axios.post(
  '/api/contabilizacion-masiva/diario-documentos/analizar',
  payload
);

const buscarCandidatos = ({ sociedadId, query, limit = 10 }) => axios.get(
  '/api/contabilizacion-masiva/diario-documentos/candidatos',
  {
    params: {
      sociedad_id: sociedadId,
      query,
      limit,
    },
  }
);

export const contabilizacionMasivaApi = {
  analizarDiarioDocumentos,
  buscarCandidatos,
};
