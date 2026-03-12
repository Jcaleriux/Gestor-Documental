import SectionCard from '../common/SectionCard';
import { FACTURA_DETALLE_LABELS } from '../../utils/uiLabels';

function FacturaDetalleEstadoSection({ viewModel }) {
  const {
    estadosDisponibles,
    estadoUser,
    setEstadoUser,
    estadoNuevo,
    setEstadoNuevo,
    estadoMotivo,
    setEstadoMotivo,
    changeEstado
  } = viewModel;

  return (
    <SectionCard title={FACTURA_DETALLE_LABELS.cambiarEstado.title} className="mb-3">
      <form onSubmit={changeEstado} className="d-grid gap-2">
        <input
          className="form-control"
          value={estadoUser}
          onChange={(event) => setEstadoUser(event.target.value)}
          placeholder={FACTURA_DETALLE_LABELS.cambiarEstado.usuarioPlaceholder}
        />
        <select
          className="form-select"
          value={estadoNuevo}
          onChange={(event) => setEstadoNuevo(event.target.value)}
        >
          <option value="">{FACTURA_DETALLE_LABELS.cambiarEstado.seleccionarEstado}</option>
          {estadosDisponibles.map((estado) => (
            <option key={estado} value={estado}>
              {estado}
            </option>
          ))}
        </select>
        <textarea
          className="form-control"
          rows="2"
          value={estadoMotivo}
          onChange={(event) => setEstadoMotivo(event.target.value)}
          placeholder={FACTURA_DETALLE_LABELS.cambiarEstado.motivoPlaceholder}
        />
        <button className="btn btn-primary" type="submit">
          {FACTURA_DETALLE_LABELS.cambiarEstado.submit}
        </button>
      </form>
    </SectionCard>
  );
}

export default FacturaDetalleEstadoSection;
