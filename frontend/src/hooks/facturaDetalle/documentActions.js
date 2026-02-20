export const createDocumentActions = ({
  id,
  factura,
  tablaPagoActual,
  notaCreditoActual,
  setMhLoading,
  setMhError,
  facturaApi,
  buildAuthUrl,
  openWindow
}) => {
  const openPathInNewTab = ({ endpoint, ruta }) => {
    const url = buildAuthUrl(`${endpoint}?path=${encodeURIComponent(ruta)}`);
    openWindow(url, '_blank', 'noopener,noreferrer');
  };

  const verTablaPagoAsociada = () => {
    if (!tablaPagoActual?.ruta_pdf) return;
    openPathInNewTab({
      endpoint: '/api/files/pdf',
      ruta: tablaPagoActual.ruta_pdf
    });
  };

  const verNotaCreditoAsociada = () => {
    if (notaCreditoActual?.ruta_pdf) {
      openPathInNewTab({
        endpoint: '/api/files/pdf',
        ruta: notaCreditoActual.ruta_pdf
      });
      return;
    }

    if (notaCreditoActual?.ruta_xml) {
      openPathInNewTab({
        endpoint: '/api/files/xml',
        ruta: notaCreditoActual.ruta_xml
      });
    }
  };

  const verMensajeHacienda = async () => {
    if (factura?.has_mensaje_hacienda === false) {
      setMhError('Esta factura aun no tiene Mensaje Hacienda registrado.');
      return;
    }
    try {
      setMhLoading(true);
      setMhError('');
      const response = await facturaApi.getMensajeHacienda(id);
      const rutaXml = response.data.data?.ruta_xml;
      if (!rutaXml) {
        setMhError('Mensaje Hacienda sin XML.');
        return;
      }
      openPathInNewTab({
        endpoint: '/api/files/xml',
        ruta: rutaXml
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
    const url = buildAuthUrl(`/api/facturas/${id}/manifest`);
    openWindow(url, '_blank', 'noopener,noreferrer');
  };

  return {
    verTablaPagoAsociada,
    verNotaCreditoAsociada,
    verMensajeHacienda,
    verManifest
  };
};
