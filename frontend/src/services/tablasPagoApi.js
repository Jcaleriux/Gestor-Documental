import axios from 'axios';

const listTablasPago = ({ sociedadId, proveedorId }) => axios.get('/api/tablas-pago', {
  params: {
    sociedad_id: sociedadId,
    proveedor_id: proveedorId || undefined
  }
});

const createTablaPago = (payload) => axios.post('/api/tablas-pago', payload);

const deleteTablaPago = ({ tablaPagoId, sociedadId }) => axios.delete(`/api/tablas-pago/${tablaPagoId}`, {
  params: {
    sociedad_id: sociedadId
  }
});

export const tablasPagoApi = {
  listTablasPago,
  createTablaPago,
  deleteTablaPago
};
