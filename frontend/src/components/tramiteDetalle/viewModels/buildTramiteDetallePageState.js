const PAGE_STATUS = {
  missingSociedad: 'missing_sociedad',
  loading: 'loading',
  loadError: 'load_error',
  notFound: 'not_found',
  ready: 'ready'
};

export const buildTramiteDetallePageState = ({
  sociedadId,
  loading,
  tramite,
  actionError = '',
}) => {
  if (!sociedadId) {
    return {
      status: PAGE_STATUS.missingSociedad,
      message: 'Seleccione una sociedad para ver el tramite.'
    };
  }

  if (loading) {
    return {
      status: PAGE_STATUS.loading,
      message: ''
    };
  }

  if (!tramite && actionError) {
    return {
      status: PAGE_STATUS.loadError,
      message: actionError
    };
  }

  if (!tramite) {
    return {
      status: PAGE_STATUS.notFound,
      message: 'No se encontro el tramite.'
    };
  }

  return {
    status: PAGE_STATUS.ready,
    message: ''
  };
};
