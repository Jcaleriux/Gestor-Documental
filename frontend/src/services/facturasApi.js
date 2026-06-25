import axios from 'axios';

export const FACTURAS_CONTRACT_ERROR_MESSAGE = 'El backend de facturas devolvio un formato no compatible. Reinicia o actualiza la API para usar el listado paginado.';
export const NOTAS_CREDITO_CONTRACT_ERROR_MESSAGE = 'El backend de notas de credito devolvio un formato no compatible. Reinicia o actualiza la API para usar el listado paginado.';
export const TIQUETES_CONTRACT_ERROR_MESSAGE = 'El backend de tiquetes electronicos devolvio un formato no compatible. Reinicia o actualiza la API para usar el listado paginado.';

const createContractError = (code, message) => {
  const error = new Error(message);
  error.code = code;
  return error;
};

const createFacturasContractError = (message = FACTURAS_CONTRACT_ERROR_MESSAGE) => (
  createContractError('FACTURAS_CONTRACT_ERROR', message)
);

const createNotasCreditoContractError = (message = NOTAS_CREDITO_CONTRACT_ERROR_MESSAGE) => (
  createContractError('NOTAS_CREDITO_CONTRACT_ERROR', message)
);

const createTiquetesContractError = (message = TIQUETES_CONTRACT_ERROR_MESSAGE) => (
  createContractError('TIQUETES_CONTRACT_ERROR', message)
);

export const extractFacturasPagePayload = (response) => {
  if (response?.data?.success === false) {
    throw new Error(response?.data?.error || 'No se pudo cargar el listado de facturas.');
  }

  const payload = response?.data?.data;
  if (Array.isArray(payload)) {
    throw createFacturasContractError();
  }

  if (!payload || typeof payload !== 'object') {
    throw createFacturasContractError('El backend de facturas no devolvio una pagina valida.');
  }

  if (!payload.meta || typeof payload.meta !== 'object') {
    throw createFacturasContractError('El backend de facturas no devolvio metadatos de paginacion.');
  }

  return {
    items: Array.isArray(payload.items) ? payload.items : [],
    meta: payload.meta,
    summary: payload.summary && typeof payload.summary === 'object'
      ? payload.summary
      : {
        totalItems: 0,
        totalAmount: 0,
        byEstado: [],
        byMoneda: [],
      },
  };
};

export const extractNotasCreditoPagePayload = (response) => {
  if (response?.data?.success === false) {
    throw new Error(response?.data?.error || 'No se pudo cargar el listado de notas de credito.');
  }

  const payload = response?.data?.data;
  if (Array.isArray(payload)) {
    throw createNotasCreditoContractError();
  }

  if (!payload || typeof payload !== 'object') {
    throw createNotasCreditoContractError('El backend de notas de credito no devolvio una pagina valida.');
  }

  if (!payload.meta || typeof payload.meta !== 'object') {
    throw createNotasCreditoContractError('El backend de notas de credito no devolvio metadatos de paginacion.');
  }

  return {
    items: Array.isArray(payload.items) ? payload.items : [],
    meta: payload.meta,
    summary: payload.summary && typeof payload.summary === 'object'
      ? payload.summary
      : {
        totalItems: 0,
        totalAmount: 0,
        totalSaldoDisponible: 0,
        byEstado: [],
        byMoneda: [],
      },
  };
};

export const extractTiquetesPagePayload = (response) => {
  if (response?.data?.success === false) {
    throw new Error(response?.data?.error || 'No se pudo cargar el listado de tiquetes electronicos.');
  }

  const payload = response?.data?.data;
  if (Array.isArray(payload)) {
    throw createTiquetesContractError();
  }

  if (!payload || typeof payload !== 'object') {
    throw createTiquetesContractError('El backend de tiquetes electronicos no devolvio una pagina valida.');
  }

  if (!payload.meta || typeof payload.meta !== 'object') {
    throw createTiquetesContractError('El backend de tiquetes electronicos no devolvio metadatos de paginacion.');
  }

  return {
    items: Array.isArray(payload.items) ? payload.items : [],
    meta: payload.meta,
    summary: payload.summary && typeof payload.summary === 'object'
      ? payload.summary
      : {
        totalItems: 0,
        totalAmount: 0,
        byMoneda: [],
      },
  };
};

export const extractMensajeHaciendaXmlPath = (response) => {
  if (response?.data?.success === false) {
    throw new Error(response?.data?.error || 'Mensaje Hacienda no encontrado.');
  }

  const payload = response?.data?.data;
  const rutaXml = payload?.ruta_xml || payload?.rutaXml || response?.data?.ruta_xml || response?.data?.rutaXml;
  return rutaXml ? String(rutaXml) : '';
};

const listFacturas = (params) => axios.get('/api/facturas', { params });
const listRetencionesPendientes = (params) => axios.get('/api/retenciones-pendientes', { params });
const listNotasCredito = (params) => axios.get('/api/notas-credito', { params });
const listTiquetesElectronicos = (params) => axios.get('/api/tiquetes-electronicos', { params });
const listMensajesHacienda = (params) => axios.get('/api/mensajes-hacienda', { params });
const listPdfsPendientes = (params) => axios.get('/api/pdfs-pendientes', { params });
const searchPdfsPendientesFacturas = (params) => axios.get('/api/pdfs-pendientes/facturas-candidatas', { params });
const assignPdfPendiente = (payload) => axios.post('/api/pdfs-pendientes/asignar', payload);
const getMensajeHacienda = (id) => axios.get(`/api/facturas/${id}/mensaje-hacienda`);
const getFacturaManifest = (id) => axios.get(`/api/facturas/${id}/manifest`);
const getNotaCreditoManifest = (id) => axios.get(`/api/notas-credito/${id}/manifest`);
const buildFacturasPdfSeleccionadasRequest = ({ sociedadId, facturaIds }) => ({
  url: '/api/facturas/pdf-seleccionadas',
  options: {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sociedadId, facturaIds }),
  },
});

const listAllFacturas = async (params = {}, options = {}) => {
  const {
    pageSize = 200,
    maxPages = 100,
  } = options;
  const { page: _ignoredPage, pageSize: _ignoredPageSize, ...baseParams } = params || {};

  const allItems = [];
  let page = 1;

  while (page <= maxPages) {
    const response = await listFacturas({
      ...baseParams,
      page,
      pageSize,
    });

    const payload = extractFacturasPagePayload(response);
    const items = payload.items;
    allItems.push(...items);

    if (!payload.meta.hasNext) {
      break;
    }

    page += 1;
  }

  return allItems;
};

const listAllNotasCredito = async (params = {}, options = {}) => {
  const {
    pageSize = 200,
    maxPages = 100,
  } = options;
  const { page: _ignoredPage, pageSize: _ignoredPageSize, ...baseParams } = params || {};

  const allItems = [];
  let page = 1;

  while (page <= maxPages) {
    const response = await listNotasCredito({
      ...baseParams,
      page,
      pageSize,
    });

    const payload = extractNotasCreditoPagePayload(response);
    allItems.push(...payload.items);

    if (!payload.meta.hasNext) {
      break;
    }

    page += 1;
  }

  return allItems;
};

export const facturasApi = {
  listFacturas,
  listAllFacturas,
  listAllNotasCredito,
  listRetencionesPendientes,
  listNotasCredito,
  listTiquetesElectronicos,
  listMensajesHacienda,
  listPdfsPendientes,
  searchPdfsPendientesFacturas,
  assignPdfPendiente,
  getMensajeHacienda,
  getFacturaManifest,
  getNotaCreditoManifest,
  buildFacturasPdfSeleccionadasRequest
};
