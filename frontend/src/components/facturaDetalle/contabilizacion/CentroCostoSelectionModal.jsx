import { useMemo, useState } from 'react';
import DataTable from '../../common/DataTable';
import EmptyState from '../../common/EmptyState';
import SearchInput from '../../common/SearchInput';
import { filterCentrosCosto } from '../../../utils/centrosCosto.js';

const HEADERS = [
  { key: 'codigo', label: 'Codigo' },
  { key: 'nombre', label: 'Nombre' },
  { key: 'padre', label: 'Padre' },
  { key: 'aprobador', label: 'Aprobador' },
  { key: 'estado', label: 'Estado' },
  { key: 'acciones', label: 'Acciones', align: 'end' },
];

function CentroCostoSelectionModal({
  title,
  items,
  error,
  loading,
  targetLineId,
  onClose,
  onSelect,
}) {
  const [search, setSearch] = useState('');

  const filteredItems = useMemo(() => filterCentrosCosto(items, {
    query: search,
    includeInactive: false,
    onlySelectable: true,
  }), [items, search]);

  return (
    <div className="cc-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="cc-modal-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="cc-modal-header">
          <div>
            <div className="cc-modal-title">{title}</div>
            <div className="cc-modal-copy">
              Busca por codigo o nombre y selecciona el centro correcto para esta linea.
            </div>
          </div>
          <button className="btn btn-outline-secondary btn-sm" type="button" onClick={onClose}>
            Cerrar
          </button>
        </div>

        <div className="cc-modal-toolbar">
          <SearchInput
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar centro..."
            className="w-100"
          />
        </div>

        {error ? <div className="alert alert-danger py-2 mb-3">{error}</div> : null}

        {loading ? (
          <div className="text-muted small">Cargando catalogo...</div>
        ) : filteredItems.length === 0 ? (
          <EmptyState className="py-2">No hay centros de costo seleccionables para esta busqueda.</EmptyState>
        ) : (
          <DataTable headers={HEADERS} stickyHeader className="cc-modal-table-wrap">
            {filteredItems.map((item) => (
              <tr key={item.id}>
                <td className="fw-semibold">{item.codigo}</td>
                <td>{item.nombre}</td>
                <td>{item.centro_padre_codigo || 'Raiz'}</td>
                <td>
                  <div>{item.usuario_aprobador_nombre || '-'}</div>
                  <div className="small text-muted">{item.usuario_aprobador_email || 'Sin email'}</div>
                </td>
                <td>{item.activo === false ? 'Inactivo' : 'Activo'}</td>
                <td className="text-end">
                  <button
                    className="btn btn-primary btn-sm"
                    type="button"
                    onClick={() => onSelect(targetLineId, item)}
                  >
                    Usar
                  </button>
                </td>
              </tr>
            ))}
          </DataTable>
        )}

        {!loading && filteredItems.length > 0 ? (
          <div className="cc-modal-footer">
            {filteredItems.length} centro(s) disponibles. Solo se muestran centros activos y seleccionables.
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default CentroCostoSelectionModal;
