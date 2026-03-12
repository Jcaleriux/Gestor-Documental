const PAGE_STATUS = {
  missingSociedad: 'missing_sociedad',
  loading: 'loading',
  error: 'error',
  notFound: 'not_found',
  sociedadMismatch: 'sociedad_mismatch',
  ready: 'ready'
};

export const buildFacturaDetallePageState = ({ sociedadId, meta }) => {
  if (!sociedadId) {
    return {
      status: PAGE_STATUS.missingSociedad,
      message: 'Seleccione una sociedad para ver el documento.'
    };
  }

  if (meta?.loading) {
    return {
      status: PAGE_STATUS.loading,
      message: ''
    };
  }

  if (meta?.error) {
    return {
      status: PAGE_STATUS.error,
      message: meta.error
    };
  }

  if (!meta?.factura) {
    return {
      status: PAGE_STATUS.notFound,
      message: 'Documento no encontrado.'
    };
  }

  if (meta.factura.sociedad_id && String(meta.factura.sociedad_id) !== String(sociedadId)) {
    return {
      status: PAGE_STATUS.sociedadMismatch,
      message: 'El documento no pertenece a la sociedad seleccionada.'
    };
  }

  return {
    status: PAGE_STATUS.ready,
    message: ''
  };
};
