import axios from 'axios';
import { facturasApi } from './facturasApi.js';

const getFactura = (id) => axios.get(`/api/facturas/${id}`);
const getComentarios = (id) => axios.get(`/api/documentos/${id}/comentarios`);
const addComentario = (id, payload) => axios.post(`/api/documentos/${id}/comentarios`, payload);
const getEstados = (id) => axios.get(`/api/documentos/${id}/estados`);
const addEstado = (id, payload) => axios.post(`/api/documentos/${id}/estados`, payload);
const patchEstado = (id, payload) => axios.patch(`/api/documentos/${id}/estado`, payload);
const getContabilizacion = (id) => axios.get(`/api/facturas/${id}/contabilizacion`);
const saveContabilizacion = (id, payload) => axios.post(`/api/facturas/${id}/contabilizacion`, payload);
const registrarPagoRetencion = (id, payload) => axios.post(`/api/facturas/${id}/contabilizacion/retencion-pagos`, payload);
const getMensajeHacienda = (id) => axios.get(`/api/facturas/${id}/mensaje-hacienda`);
const getProveedores = (sociedadId) => axios.get('/api/proveedores', {
  params: { sociedad_id: sociedadId }
});
const getTablasPago = ({ sociedadId, proveedorId }) => axios.get('/api/tablas-pago', {
  params: { sociedad_id: sociedadId, proveedor_id: proveedorId }
});
const getOrdenesCompra = ({ sociedadId, proveedorId, estado }) => axios.get('/api/ordenes-compra', {
  params: {
    sociedad_id: sociedadId,
    proveedor_id: proveedorId,
    estado: estado || undefined
  }
});
const getNotasCredito = async ({ sociedadId, proveedorId }) => {
  const items = await facturasApi.listAllNotasCredito({
    sociedadId,
    proveedorId,
    estado: 'disponible',
  });

  return {
    data: {
      success: true,
      data: items,
    },
  };
};

export const facturaDetalleApi = {
  getFactura,
  getComentarios,
  addComentario,
  getEstados,
  addEstado,
  patchEstado,
  getContabilizacion,
  saveContabilizacion,
  registrarPagoRetencion,
  getMensajeHacienda,
  getProveedores,
  getTablasPago,
  getOrdenesCompra,
  getNotasCredito
};
