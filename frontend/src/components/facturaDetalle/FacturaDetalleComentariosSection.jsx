import EmptyState from '../common/EmptyState';
import SectionCard from '../common/SectionCard';
import { FACTURA_DETALLE_LABELS } from '../../utils/uiLabels';

function FacturaDetalleComentariosSection({
  commentUser,
  setCommentUser,
  commentText,
  setCommentText,
  addComment,
  comentarios
}) {
  return (
    <SectionCard title={FACTURA_DETALLE_LABELS.comentarios.title}>
      <form onSubmit={addComment} className="d-grid gap-2 mb-3">
        <input
          className="form-control"
          value={commentUser}
          onChange={(event) => setCommentUser(event.target.value)}
          placeholder={FACTURA_DETALLE_LABELS.comentarios.usuarioPlaceholder}
        />
        <textarea
          className="form-control"
          rows="3"
          value={commentText}
          onChange={(event) => setCommentText(event.target.value)}
          placeholder={FACTURA_DETALLE_LABELS.comentarios.comentarioPlaceholder}
        />
        <button className="btn btn-outline-primary" type="submit">
          {FACTURA_DETALLE_LABELS.comentarios.submit}
        </button>
      </form>

      {comentarios.length === 0 && <EmptyState className="py-2">{FACTURA_DETALLE_LABELS.comentarios.empty}</EmptyState>}
      <ul className="list-group">
        {comentarios.map((comentario) => (
          <li key={comentario.id} className="list-group-item">
            <div className="fw-semibold">{comentario.usuario}</div>
            <div className="text-muted">
              {new Date(comentario.creado_en).toLocaleString()}
            </div>
            <div className="mt-1">{comentario.texto}</div>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}

export default FacturaDetalleComentariosSection;
