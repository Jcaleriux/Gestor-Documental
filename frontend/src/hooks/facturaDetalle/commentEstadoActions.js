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
    if (!commentUser || !commentText) return;
    try {
      await facturaApi.addComentario(id, {
        usuario: commentUser,
        texto: commentText
      });
      setCommentText('');
      const response = await facturaApi.getComentarios(id);
      setComentarios(response.data.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const changeEstado = async (event) => {
    event.preventDefault();
    if (!estadoNuevo || !estadoUser || !factura) return;
    try {
      await facturaApi.addEstado(id, {
        estado_anterior: factura.estado || null,
        estado_nuevo: estadoNuevo,
        usuario: estadoUser,
        motivo: estadoMotivo || null
      });
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
