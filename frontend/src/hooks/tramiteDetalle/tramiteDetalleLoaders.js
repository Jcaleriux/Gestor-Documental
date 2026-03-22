const extractTramiteDetalleData = (response) => {
  if (!response?.data?.success) {
    return {
      tramite: null,
      documentos: [],
      retenciones: [],
      caratula: null,
      providerGroups: []
    };
  }

  return {
    tramite: response.data.data?.tramite || null,
    documentos: response.data.data?.documentos || [],
    retenciones: response.data.data?.retenciones || [],
    caratula: response.data.data?.caratula || null,
    providerGroups: response.data.data?.provider_groups || []
  };
};

export const fetchTramiteDetalleData = async ({ api, id }) => {
  const response = await api.getDetalle(id);
  return extractTramiteDetalleData(response);
};

export const fetchTramiteHistorialData = async ({ api, id }) => {
  const response = await api.getHistorial(id);
  if (!response?.data?.success) {
    return [];
  }
  return response.data.data || [];
};

export const fetchTramiteSociedadInfo = async ({ api, sociedadId }) => {
  const response = await api.getSociedades();
  if (!response?.data?.success) {
    return null;
  }

  return (response.data.data || []).find((item) => item.id === Number(sociedadId)) || null;
};
