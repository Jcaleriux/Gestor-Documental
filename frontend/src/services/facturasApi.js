import axios from 'axios';

const listFacturas = (params) => axios.get('/api/facturas', { params });
const listRetencionesPendientes = (params) => axios.get('/api/retenciones-pendientes', { params });
const listNotasCredito = (params) => axios.get('/api/notas-credito', { params });
const listTiquetesElectronicos = (params) => axios.get('/api/tiquetes-electronicos', { params });
const listMensajesHacienda = (params) => axios.get('/api/mensajes-hacienda', { params });

export const facturasApi = {
  listFacturas,
  listRetencionesPendientes,
  listNotasCredito,
  listTiquetesElectronicos,
  listMensajesHacienda
};
