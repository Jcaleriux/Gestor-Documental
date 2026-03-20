import { extractMensajeHaciendaXmlPath } from '../../services/facturasApi.js';
import { createProtectedResourceOpener } from '../../utils/protectedResources.js';

const openUrlInNewTab = ({
  url,
  openProtectedResource
}) => openProtectedResource(url);

const openApiFilePath = ({
  endpoint,
  ruta,
  openProtectedResource
}) => {
  const url = `${endpoint}?path=${encodeURIComponent(ruta)}`;
  openUrlInNewTab({
    url,
    openProtectedResource
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

const buildManifestUrl = ({ id }) => `/api/facturas/${id}/manifest`;

const getMensajeHaciendaRutaXml = async ({ id, facturaApi }) => {
  const response = await facturaApi.getMensajeHacienda(id);
  return extractMensajeHaciendaXmlPath(response);
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
  openProtectedResource,
  buildAuthUrl,
  openWindow
}) => {
  const resolvedOpenProtectedResource = createProtectedResourceOpener({
    openProtectedResource,
    buildAuthUrl,
    openWindow,
  });

  const verTablaPagoAsociada = () => {
    if (!tablaPagoActual?.ruta_pdf) return;
    openApiFilePath({
      endpoint: '/api/files/pdf',
      ruta: tablaPagoActual.ruta_pdf,
      openProtectedResource: resolvedOpenProtectedResource
    });
  };

  const verNotaCreditoAsociada = () => {
    const notaFile = resolveNotaCreditoFile({ notaCreditoActual });
    if (!notaFile) {
      return;
    }

    openApiFilePath({
      ...notaFile,
      openProtectedResource: resolvedOpenProtectedResource
    });
  };

  const verOrdenCompraAsociada = () => {
    if (!ordenCompraActual?.ruta_pdf) return;
    openApiFilePath({
      endpoint: '/api/files/pdf',
      ruta: ordenCompraActual.ruta_pdf,
      openProtectedResource: resolvedOpenProtectedResource
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
        openProtectedResource: resolvedOpenProtectedResource
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
      url: buildManifestUrl({ id }),
      openProtectedResource: resolvedOpenProtectedResource
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
