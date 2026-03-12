const hasCommentData = ({ commentUser, commentText }) => (
  Boolean(commentUser) && Boolean(commentText)
);

const hasEstadoData = ({ estadoNuevo, estadoUser, factura }) => (
  Boolean(estadoNuevo) && Boolean(estadoUser) && Boolean(factura)
);

const buildComentarioPayload = ({ commentUser, commentText }) => ({
  usuario: commentUser,
  texto: commentText
});

const buildEstadoPayload = ({
  factura,
  estadoNuevo,
  estadoUser,
  estadoMotivo
}) => ({
  estado_anterior: factura.estado || null,
  estado_nuevo: estadoNuevo,
  usuario: estadoUser,
  motivo: estadoMotivo || null
});

const refreshComentarios = async ({
  id,
  facturaApi,
  setComentarios
}) => {
  const response = await facturaApi.getComentarios(id);
  setComentarios(response.data.data || []);
};

export const createCommentEstadoActions = ({
  id,
  factura,
  commentUser,
  commentText,
  estadoNuevo,
  estadoUser,
  estadoMotivo,
  fetchAll,
  setComentarios,
  setCommentText,
  setEstadoMotivo,
  setEstadoNuevo,
  facturaApi
}) => {
  const addComment = async (event) => {
    event.preventDefault();
    if (!hasCommentData({ commentUser, commentText })) {
      return;
    }

    try {
      await facturaApi.addComentario(id, buildComentarioPayload({
        commentUser,
        commentText
      }));
      setCommentText('');
      await refreshComentarios({
        id,
        facturaApi,
        setComentarios
      });
    } catch (err) {
      console.error(err);
    }
  };

  const changeEstado = async (event) => {
    event.preventDefault();
    if (!hasEstadoData({ estadoNuevo, estadoUser, factura })) {
      return;
    }

    try {
      await facturaApi.addEstado(id, buildEstadoPayload({
        factura,
        estadoNuevo,
        estadoUser,
        estadoMotivo
      }));
      await facturaApi.patchEstado(id, {
        estado: estadoNuevo
      });
      setEstadoMotivo('');
      setEstadoNuevo('');
      await fetchAll();
    } catch (err) {
      console.error(err);
    }
  };

  return {
    addComment,
    changeEstado
  };
};
