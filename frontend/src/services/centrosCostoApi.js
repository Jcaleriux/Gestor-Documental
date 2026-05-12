import axios from 'axios';

const toNumericOrNull = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const normalizeCentroPayload = (centro = {}) => ({
  codigo: centro.codigo,
  nombre: centro.nombre,
  centro_padre_id: toNumericOrNull(centro.centro_padre_id),
  codigo_padre: centro.centro_padre_codigo || centro.codigo_padre || null,
  usuario_aprobador_id: toNumericOrNull(centro.usuario_aprobador_id),
  rol_aprobador_id: toNumericOrNull(centro.rol_aprobador_id),
  seleccionable_en_contabilizacion: centro.seleccionable_en_contabilizacion !== false,
  activo: centro.activo !== false,
  orden: centro.orden === '' || centro.orden == null ? null : Number(centro.orden),
  metadata: centro.metadata || null,
});

const listCentros = async ({ sociedadId }) => {
  const response = await axios.get('/api/centros-costo', {
    params: { sociedad_id: sociedadId },
  });

  return Array.isArray(response.data?.data) ? response.data.data : [];
};

const upsertCentro = async ({ sociedadId, centro }) => {
  const centroId = toNumericOrNull(centro?.id);
  const payload = {
    sociedad_id: toNumericOrNull(sociedadId),
    ...normalizeCentroPayload(centro),
  };

  if (centroId) {
    const response = await axios.patch(`/api/centros-costo/${centroId}`, payload);
    return response.data?.data || null;
  }

  const response = await axios.post('/api/centros-costo', payload);
  return response.data?.data || null;
};

const setCentros = async ({ sociedadId, centros }) => {
  const payload = {
    sociedad_id: toNumericOrNull(sociedadId),
    centros: Array.isArray(centros)
      ? centros.map((centro) => ({
        id: toNumericOrNull(centro.id),
        ...normalizeCentroPayload(centro),
      }))
      : [],
  };

  const response = await axios.put('/api/centros-costo/bulk', payload);
  return Array.isArray(response.data?.data) ? response.data.data : [];
};

export const centrosCostoApi = {
  listCentros,
  upsertCentro,
  setCentros,
};
