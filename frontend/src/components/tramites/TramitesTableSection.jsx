import { Link } from 'react-router-dom';
import { estadoLabelTramite, estadoClassTramite } from '../../utils/estadosTramite';
import {
  getTramiteSemaforoLabel,
  getTramiteSemaforoClass
} from '../../utils/tramitesSemaforo';
import { TRAMITES_LABELS } from '../../utils/uiLabels';
import StatusBadge from '../common/StatusBadge';
import EmptyState from '../common/EmptyState';
import FiltersBar from '../common/FiltersBar';
import SearchInput from '../common/SearchInput';
import SectionCard from '../common/SectionCard';
import DataTable from '../common/DataTable';

function TramitesTableSection({
  search,
  onSearchChange,
  estado,
  onEstadoChange,
  tramitesFiltrados
}) {
  return (
    <>
      <FiltersBar>
        <SearchInput
          placeholder={TRAMITES_LABELS.searchPlaceholder}
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
        />
        <div className="tramites-filter">
          <select className="form-select" value={estado} onChange={(event) => onEstadoChange(event.target.value)}>
            <option value="">{TRAMITES_LABELS.filters.estadoPlaceholder}</option>
            <option value="en_aprobacion_gerencia">{TRAMITES_LABELS.filters.estados.en_aprobacion_gerencia}</option>
            <option value="en_aprobacion_gerencia_contable">
              {TRAMITES_LABELS.filters.estados.en_aprobacion_gerencia_contable}
            </option>
            <option value="en_aprobacion_gerencia_financiera">
              {TRAMITES_LABELS.filters.estados.en_aprobacion_gerencia_financiera}
            </option>
            <option value="en_revision_tesoreria">{TRAMITES_LABELS.filters.estados.en_revision_tesoreria}</option>
            <option value="en_revision_tesoreria_2">{TRAMITES_LABELS.filters.estados.en_revision_tesoreria_2}</option>
            <option value="pagado">{TRAMITES_LABELS.filters.estados.pagado}</option>
            <option value="cancelado">{TRAMITES_LABELS.filters.estados.cancelado}</option>
          </select>
        </div>
      </FiltersBar>

      <SectionCard className="table-card" bodyClassName="p-0">
        <DataTable
          headers={[
            'Tramite',
            'Documentos',
            'Semaforo',
            'Estado',
            'Creado por',
            'Creado',
            'Acciones'
          ]}
        >
          {tramitesFiltrados.map((tramite) => (
            <tr key={tramite.id}>
              <td className="fw-semibold">Tramite #{tramite.id}</td>
              <td>F: {Number(tramite.total_documentos || 0)} - R: {Number(tramite.total_retenciones || 0)}</td>
              <td>
                <StatusBadge
                  label={getTramiteSemaforoLabel(tramite.semaforoStatus)}
                  className={getTramiteSemaforoClass(tramite.semaforoStatus)}
                />
              </td>
              <td>
                <StatusBadge
                  label={estadoLabelTramite(tramite.estado)}
                  className={estadoClassTramite(tramite.estado)}
                />
              </td>
              <td>{tramite.creado_por || '-'}</td>
              <td>{tramite.creado_en ? new Date(tramite.creado_en).toLocaleDateString() : '-'}</td>
              <td className="text-end">
                <Link className="btn btn-sm btn-outline-primary" to={`/tramites/${tramite.id}`}>
                  Ver
                </Link>
              </td>
            </tr>
          ))}
          {tramitesFiltrados.length === 0 && (
            <tr>
              <td colSpan="7" className="py-4">
                <EmptyState className="text-center py-2">
                  {TRAMITES_LABELS.listEmptyFilters}
                </EmptyState>
              </td>
            </tr>
          )}
        </DataTable>
      </SectionCard>
    </>
  );
}

export default TramitesTableSection;
