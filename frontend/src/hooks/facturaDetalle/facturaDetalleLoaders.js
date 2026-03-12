const toList = (response) => {
  const data = response?.data?.data;
  return Array.isArray(data) ? data : [];
};

const toObject = (response, fallback) => {
  const data = response?.data?.data;
  return data ?? fallback;
};

export const fetchFacturaDetalleBundle = async ({ id, facturaApi }) => {
  const [facturaRes, comentariosRes, estadosRes, contaRes] = await Promise.all([
    facturaApi.getFactura(id),
    facturaApi.getComentarios(id),
    facturaApi.getEstados(id),
    facturaApi.getContabilizacion(id)
  ]);

  return {
    facturaData: toObject(facturaRes, null),
    comentariosData: toList(comentariosRes),
    estadosData: toList(estadosRes),
    contaData: toObject(contaRes, {})
  };
};

export const fetchProveedoresForFactura = async ({ facturaApi, sociedadId }) => {
  if (!sociedadId) {
    return [];
  }

  try {
    const proveedoresRes = await facturaApi.getProveedores(sociedadId);
    return toList(proveedoresRes);
  } catch {
    return [];
  }
};

export const fetchFacturaDetalleData = async ({ id, facturaApi }) => {
  const bundle = await fetchFacturaDetalleBundle({ id, facturaApi });
  const proveedoresData = await fetchProveedoresForFactura({
    facturaApi,
    sociedadId: bundle.facturaData?.sociedad_id
  });

  return {
    ...bundle,
    proveedoresData
  };
};
