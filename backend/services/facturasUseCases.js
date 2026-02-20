const path = require('path');
const { assertFound, createError } = require('../utils/errors');
const {
  mapFacturaRow,
  mapRetencionPendienteRow,
  mapNotaCreditoRow,
  mapTiqueteElectronicoRow,
  mapMensajeHaciendaRow
} = require('../mappers/facturasMapper');
const { createFacturasManifestResolver } = require('./facturasManifestResolver');

const toOptionalPositiveInt = (value, fieldName) => {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw createError(400, `${fieldName} invalido`);
  }

  return parsed;
};

const createFacturasUseCases = ({ facturasRepo }) => {
  if (!facturasRepo) {
    throw new Error('facturasRepo requerido');
  }

  const manifestResolver = createFacturasManifestResolver({
    baseDir: process.env.FACTURAS_BASE_DIR || path.resolve(__dirname, '..', '..')
  });

  const listFacturas = async ({ sociedadId }) => {
    const rows = await facturasRepo.listFacturas({ sociedadId });
    return rows.map(mapFacturaRow);
  };

  const listRetencionesPendientes = async ({ sociedadId }) => {
    const normalizedSociedadId = toOptionalPositiveInt(sociedadId, 'sociedadId');
    const rows = await facturasRepo.listRetencionesPendientes({ sociedadId: normalizedSociedadId });
    return rows.map(mapRetencionPendienteRow);
  };

  const getFactura = async ({ id }) => {
    const row = await facturasRepo.getFacturaById(id);
    assertFound(row, 'Factura not found');
    return mapFacturaRow(row);
  };

  const getMensajeHacienda = async ({ id }) => {
    const factura = await facturasRepo.getClaveByFacturaId(id);
    assertFound(factura, 'Factura no encontrada');

    let mensaje = await facturasRepo.getLatestMensajeHaciendaByFacturaId(id);
    if (!mensaje) {
      mensaje = await facturasRepo.getLatestMensajeHaciendaByClave(factura.clave);
    }
    assertFound(mensaje, 'Esta factura aun no tiene Mensaje Hacienda registrado');

    return mensaje;
  };

  const getManifestFor = async ({ getDocument, notFoundMessage, manifestNotFoundMessage }) => {
    const document = await getDocument();
    assertFound(document, notFoundMessage);

    return manifestResolver.readManifestForDocument({
      rutaXml: document.ruta_xml,
      rutaPdf: document.ruta_pdf,
      notFoundMessage: manifestNotFoundMessage
    });
  };

  const getManifest = async ({ id }) => getManifestFor({
    getDocument: () => facturasRepo.getFacturaById(id),
    notFoundMessage: 'Factura no encontrada',
    manifestNotFoundMessage: 'Manifiesto no encontrado para esta factura'
  });

  const getNotaCreditoManifest = async ({ id }) => getManifestFor({
    getDocument: () => facturasRepo.getNotaCreditoById(id),
    notFoundMessage: 'Nota de credito no encontrada',
    manifestNotFoundMessage: 'Manifiesto no encontrado para esta nota de credito'
  });

  const listNotasCredito = async ({ sociedadId, proveedorId }) => {
    const normalizedSociedadId = toOptionalPositiveInt(sociedadId, 'sociedadId');
    const normalizedProveedorId = toOptionalPositiveInt(proveedorId, 'proveedorId');
    const rows = await facturasRepo.listNotasCredito({
      sociedadId: normalizedSociedadId,
      proveedorId: normalizedProveedorId
    });
    return rows.map(mapNotaCreditoRow);
  };

  const listTiquetesElectronicos = async ({ sociedadId }) => {
    const rows = await facturasRepo.listTiquetesElectronicos({ sociedadId });
    return rows.map(mapTiqueteElectronicoRow);
  };

  const listMensajesHacienda = async ({ sociedadId }) => {
    const normalizedSociedadId = toOptionalPositiveInt(sociedadId, 'sociedadId');
    const rows = await facturasRepo.listMensajesHacienda({ sociedadId: normalizedSociedadId });
    return rows.map(mapMensajeHaciendaRow);
  };

  return {
    listFacturas,
    listRetencionesPendientes,
    getFactura,
    getMensajeHacienda,
    getManifest,
    getNotaCreditoManifest,
    listNotasCredito,
    listTiquetesElectronicos,
    listMensajesHacienda
  };
};

module.exports = { createFacturasUseCases };
