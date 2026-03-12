export const ESTADOS_VIEWMODEL = [
  'no_contabilizado',
  'contabilizado',
  'en_revision',
  'en_tramite_pago',
  'pagado_parcialmente',
  'en_aprobacion',
  'rechazado',
  'pagado'
];

export const buildEstadoViewModel = ({ detalle }) => ({
  estadosDisponibles: ESTADOS_VIEWMODEL,
  estadoUser: detalle.estadoUser,
  setEstadoUser: detalle.setEstadoUser,
  estadoNuevo: detalle.estadoNuevo,
  setEstadoNuevo: detalle.setEstadoNuevo,
  estadoMotivo: detalle.estadoMotivo,
  setEstadoMotivo: detalle.setEstadoMotivo,
  changeEstado: detalle.changeEstado
});

export const buildHistorialViewModel = ({ detalle }) => ({
  estados: detalle.estados
});

export const buildComentariosViewModel = ({ detalle }) => ({
  commentUser: detalle.commentUser,
  setCommentUser: detalle.setCommentUser,
  commentText: detalle.commentText,
  setCommentText: detalle.setCommentText,
  addComment: detalle.addComment,
  comentarios: detalle.comentarios
});

export const buildEstadoComentariosViewModels = ({ detalle }) => ({
  estado: buildEstadoViewModel({ detalle }),
  historial: buildHistorialViewModel({ detalle }),
  comentarios: buildComentariosViewModel({ detalle })
});
