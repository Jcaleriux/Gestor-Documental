const NEW_TAB_TARGET = '_blank';
const NEW_TAB_FEATURES = 'noopener,noreferrer';

const openUrlInNewTab = ({
  url,
  openWindow
}) => {
  openWindow(url, NEW_TAB_TARGET, NEW_TAB_FEATURES);
};

const openApiFilePath = ({
  endpoint,
  ruta,
  buildAuthUrl,
  openWindow
}) => {
  const url = buildAuthUrl(`${endpoint}?path=${encodeURIComponent(ruta)}`);
  openUrlInNewTab({
    url,
    openWindow
  });
};

const resolveNotaCreditoFile = ({ notaCreditoActual }) => {
  if (notaCreditoActual?.ruta_pdf) {
    return {
      endpoint: '/api/files/pdf',
      ruta: notaCreditoActual.ruta_pdf
    };
  }

  if (notaCreditoActual?.ruta_xml) {
    return {
      endpoint: '/api/files/xml',
      ruta: notaCreditoActual.ruta_xml
    };
  }

  return null;
};

const hasMensajeHacienda = ({ factura }) => (
  factura?.has_mensaje_hacienda !== false
);

const buildManifestUrl = ({ id, buildAuthUrl }) => (
  buildAuthUrl(`/api/facturas/${id}/manifest`)
);

const getMensajeHaciendaRutaXml = async ({ id, facturaApi }) => {
  const response = await facturaApi.getMensajeHacienda(id);
  return response.data.data?.ruta_xml;
};

export const createDocumentActions = ({
  id,
  factura,
  tablaPagoActual,
  ordenCompraActual,
  notaCreditoActual,
  setMhLoading,
  setMhError,
  facturaApi,
  buildAuthUrl,
  openWindow
}) => {
  const verTablaPagoAsociada = () => {
    if (!tablaPagoActual?.ruta_pdf) return;
    openApiFilePath({
      endpoint: '/api/files/pdf',
      ruta: tablaPagoActual.ruta_pdf,
      buildAuthUrl,
      openWindow
    });
  };

  const verNotaCreditoAsociada = () => {
    const notaFile = resolveNotaCreditoFile({ notaCreditoActual });
    if (!notaFile) {
      return;
    }

    openApiFilePath({
      ...notaFile,
      buildAuthUrl,
      openWindow
    });
  };

  const verOrdenCompraAsociada = () => {
    if (!ordenCompraActual?.ruta_pdf) return;
    openApiFilePath({
      endpoint: '/api/files/pdf',
      ruta: ordenCompraActual.ruta_pdf,
      buildAuthUrl,
      openWindow
    });
  };

  const verMensajeHacienda = async () => {
    if (!hasMensajeHacienda({ factura })) {
      setMhError('Esta factura aun no tiene Mensaje Hacienda registrado.');
      return;
    }

    try {
      setMhLoading(true);
      setMhError('');

      const rutaXml = await getMensajeHaciendaRutaXml({
        id,
        facturaApi
      });

      if (!rutaXml) {
        setMhError('Mensaje Hacienda sin XML.');
        return;
      }

      openApiFilePath({
        endpoint: '/api/files/xml',
        ruta: rutaXml,
        buildAuthUrl,
        openWindow
      });
    } catch (err) {
      console.error(err);
      const apiError = err.response?.data?.error || 'Mensaje Hacienda no encontrado.';
      setMhError(apiError);
    } finally {
      setMhLoading(false);
    }
  };

  const verManifest = () => {
    openUrlInNewTab({
      url: buildManifestUrl({ id, buildAuthUrl }),
      openWindow
    });
  };

  return {
    verTablaPagoAsociada,
    verOrdenCompraAsociada,
    verNotaCreditoAsociada,
    verMensajeHacienda,
    verManifest
  };
};
