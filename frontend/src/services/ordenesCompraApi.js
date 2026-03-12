import axios from 'axios';

const listOrdenesCompra = ({ sociedadId, proveedorId, estado }) => axios.get('/api/ordenes-compra', {
  params: {
    sociedad_id: sociedadId,
    proveedor_id: proveedorId || undefined,
    estado: estado || undefined
  }
});

const createOrdenCompra = (payload) => axios.post('/api/ordenes-compra', payload);

const autoImportOrdenCompra = (payload) => axios.post('/api/ordenes-compra/auto-import', payload);

const deleteOrdenCompra = ({ ordenCompraId, sociedadId }) => axios.delete(`/api/ordenes-compra/${ordenCompraId}`, {
  params: {
    sociedad_id: sociedadId
  }
});

const updateEstadoManual = ({ ordenCompraId, sociedadId, estado }) => axios.patch(
  `/api/ordenes-compra/${ordenCompraId}/estado-manual`,
  { estado },
  {
    params: {
      sociedad_id: sociedadId
    }
  }
);

export const ordenesCompraApi = {
  listOrdenesCompra,
  createOrdenCompra,
  autoImportOrdenCompra,
  deleteOrdenCompra,
  updateEstadoManual
};
