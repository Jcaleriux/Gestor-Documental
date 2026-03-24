import { buildFileUrl } from './viewModelUtils.js';

export const buildPdfDocumentLinksViewModel = ({ id, factura }) => ({
  id,
  pdfUrl: buildFileUrl({ endpoint: '/api/files/pdf', ruta: factura.ruta_pdf }),
  xmlUrl: buildFileUrl({ endpoint: '/api/files/xml', ruta: factura.ruta_xml })
});

export const buildPdfMhViewModel = ({ factura, detalle }) => ({
  mhLoading: detalle.mhLoading,
  mhError: detalle.mhError,
  mhDisponible: factura.has_mensaje_hacienda !== false,
  mostrarManifest: true,
  manifestDisponible: Boolean(factura.ruta_xml || factura.ruta_pdf),
  verMensajeHacienda: detalle.verMensajeHacienda,
  verManifest: detalle.verManifest
});

export const buildPdfAssociationsViewModel = ({ detalle }) => ({
  tablaPagoActual: detalle.tablaPagoActual,
  tablaPagoPdfUrl: buildFileUrl({
    endpoint: '/api/files/pdf',
    ruta: detalle.tablaPagoActual?.ruta_pdf
  }),
  verTablaPagoAsociada: detalle.verTablaPagoAsociada,
  ordenCompraActual: detalle.ordenCompraActual,
  ordenCompraPdfUrl: buildFileUrl({
    endpoint: '/api/files/pdf',
    ruta: detalle.ordenCompraActual?.ruta_pdf
  }),
  verOrdenCompraAsociada: detalle.verOrdenCompraAsociada,
  notaCreditoActual: detalle.notaCreditoActual,
  notaCreditoPdfUrl: buildFileUrl({
    endpoint: '/api/files/pdf',
    ruta: detalle.notaCreditoActual?.ruta_pdf
  }),
  notaCreditoXmlUrl: buildFileUrl({
    endpoint: '/api/files/xml',
    ruta: detalle.notaCreditoActual?.ruta_xml
  }),
  verNotaCreditoAsociada: detalle.verNotaCreditoAsociada,
  documentosRespaldoActuales: (Array.isArray(detalle.documentosRespaldoActuales)
    ? detalle.documentosRespaldoActuales
    : [])
    .map((documento) => ({
      ...documento,
      pdfUrl: buildFileUrl({
        endpoint: '/api/files/pdf',
        ruta: documento?.ruta_pdf
      })
    })),
  verDocumentoRespaldo: detalle.verDocumentoRespaldo
});

export const buildPdfViewModel = ({ id, factura, detalle }) => ({
  ...buildPdfDocumentLinksViewModel({ id, factura }),
  ...buildPdfMhViewModel({ factura, detalle }),
  ...buildPdfAssociationsViewModel({ detalle })
});
