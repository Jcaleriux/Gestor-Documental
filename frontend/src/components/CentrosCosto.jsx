import { useMemo, useRef } from 'react';
import PageHeader from './common/PageHeader';
import SectionCard from './common/SectionCard';
import EmptyState from './common/EmptyState';
import LoadingState from './common/LoadingState';
import ActionAlerts from './common/ActionAlerts';
import SearchInput from './common/SearchInput';
import DataTable from './common/DataTable';
import { useCentrosCostoCatalog } from '../hooks/centrosCosto/useCentrosCostoCatalog.js';
import { formatDate } from '../utils/formatters.js';
import {
  ROOT_PARENT_CODE,
  formatCentroCostoLabel,
  getCentroCostoAprobadorDetalle,
  getCentroCostoAprobadorNombre,
} from '../utils/centrosCosto.js';

const TABLE_HEADERS = [
  { key: 'codigo', label: 'Codigo' },
  { key: 'nombre', label: 'Nombre' },
  { key: 'padre', label: 'Centro padre' },
  { key: 'aprobador', label: 'Aprobador' },
  { key: 'seleccionable', label: 'Seleccionable' },
  { key: 'estado', label: 'Estado' },
  { key: 'actualizado', label: 'Actualizado' },
  { key: 'acciones', label: 'Acciones', align: 'end' },
];

function SummaryCard({ label, value, tone = '' }) {
  return (
    <div className={`facturas-summary-card ${tone}`.trim()}>
      <div className="facturas-summary-label">{label}</div>
      <div className="facturas-summary-value">{value}</div>
    </div>
  );
}

function ImportSummary({ summary }) {
  if (!summary) {
    return null;
  }

  return (
    <div className="alert alert-warning">
      <div className="fw-semibold">Importacion: {summary.filename}</div>
      <div className="small mt-1">
        Creados: {summary.created} | Actualizados: {summary.updated} | Omitidos: {summary.skipped || 0}
      </div>
      {summary.warnings?.length > 0 ? (
        <div className="small mt-2">
          {summary.warnings.map((warning) => (
            <div key={warning}>{warning}</div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function CentroBadges({ centro }) {
  return (
    <div className="centros-costo-badges">
      <span className={`status-badge ${centro.activo === false ? 'badge-soft-secondary' : 'badge-soft-success'}`}>
        {centro.activo === false ? 'Inactivo' : 'Activo'}
      </span>
      <span className={`status-badge ${centro.seleccionable_en_contabilizacion === false ? 'badge-soft-warning' : 'badge-soft-primary'}`}>
        {centro.seleccionable_en_contabilizacion === false ? 'Solo agrupador' : 'Seleccionable'}
      </span>
    </div>
  );
}

function CentroTreeNode({ node, onEdit, onToggleActive }) {
  return (
    <li className="centros-costo-tree-item">
      <div className="centros-costo-tree-row">
        <div className="centros-costo-tree-copy">
          <div className="centros-costo-tree-title">{formatCentroCostoLabel(node)}</div>
          <div className="centros-costo-tree-meta">
            {getCentroCostoAprobadorNombre(node) || 'Sin aprobador asignado'}
          </div>
          <CentroBadges centro={node} />
        </div>

        <div className="centros-costo-tree-actions">
          <button
            className="btn btn-outline-primary btn-sm"
            type="button"
            onClick={() => onEdit(node)}
          >
            Editar
          </button>
          <button
            className="btn btn-outline-secondary btn-sm"
            type="button"
            onClick={() => onToggleActive(node)}
          >
            {node.activo === false ? 'Activar' : 'Inactivar'}
          </button>
        </div>
      </div>

      {node.children?.length > 0 ? (
        <ul className="centros-costo-tree-list">
          {node.children.map((child) => (
            <CentroTreeNode
              key={child.id}
              node={child}
              onEdit={onEdit}
              onToggleActive={onToggleActive}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

function CentrosCosto({ sociedadId }) {
  const fileInputRef = useRef(null);
  const {
    usuarios,
    roles,
    loading,
    saving,
    message,
    error,
    search,
    showInactive,
    onlySelectable,
    filteredCentros,
    treeNodes,
    stats,
    form,
    editingId,
    parentOptions,
    suggestedParent,
    importSummary,
    setSearch,
    setShowInactive,
    setOnlySelectable,
    setFormField,
    startCreate,
    startEdit,
    resetForm,
    handleSubmit,
    toggleActivo,
    downloadTemplate,
    importCsv,
  } = useCentrosCostoCatalog({ sociedadId });

  const editing = Boolean(editingId);
  const selectedParentLabel = useMemo(() => {
    if (form.centro_padre_id === ROOT_PARENT_CODE) {
      return 'Raíz de la sociedad';
    }

    return parentOptions.find((option) => String(option.id) === String(form.centro_padre_id))?.nombre || '';
  }, [form.centro_padre_id, parentOptions]);

  if (!sociedadId) {
    return (
      <div className="container-fluid">
        <EmptyState className="py-2">Seleccione una sociedad para gestionar centros de costo.</EmptyState>
      </div>
    );
  }

  if (loading) {
    return <LoadingState label="Cargando centros de costo..." />;
  }

  return (
    <div className="container-fluid">
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv,.txt"
        className="d-none"
        onChange={async (event) => {
          const file = event.target.files?.[0] || null;
          if (!file) {
            return;
          }

          await importCsv(file);
          event.target.value = '';
        }}
      />

      <PageHeader
        title="Centros de costo"
        subtitle="Crea la jerarquía por sociedad y define los aprobadores que se usarán en contabilización."
        actions={(
          <div className="facturas-toolbar-actions">
            <button className="btn btn-outline-secondary" type="button" onClick={downloadTemplate}>
              Descargar plantilla
            </button>
            <button
              className="btn btn-outline-primary"
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={saving}
            >
              {saving ? 'Procesando...' : 'Importar CSV'}
            </button>
            <button className="btn btn-primary" type="button" onClick={startCreate}>
              Nuevo centro
            </button>
          </div>
        )}
      />

      <ActionAlerts error={error} message={message} />
      <ImportSummary summary={importSummary} />

      <div className="facturas-summary-grid mb-3">
        <SummaryCard label="Total catálogo" value={stats.total} />
        <SummaryCard label="Activos" value={stats.activos} />
        <SummaryCard label="Seleccionables" value={stats.seleccionables} />
        <SummaryCard label="Inactivos" value={stats.inactivos} />
      </div>

      <div className="row g-3">
        <div className="col-12 col-xl-4">
          <SectionCard title={editing ? `Editar centro ${form.codigo}` : 'Nuevo centro'}>
            <form className="d-grid gap-3" onSubmit={handleSubmit}>
              <label className="form-label mb-0">
                Codigo
                <input
                  className="form-control"
                  value={form.codigo}
                  onChange={(event) => setFormField('codigo', event.target.value.toUpperCase())}
                  required
                />
              </label>

              <label className="form-label mb-0">
                Nombre
                <input
                  className="form-control"
                  value={form.nombre}
                  onChange={(event) => setFormField('nombre', event.target.value)}
                  required
                />
              </label>

              <label className="form-label mb-0">
                Centro padre
                <select
                  className="form-select"
                  value={form.centro_padre_id}
                  onChange={(event) => setFormField('centro_padre_id', event.target.value)}
                  required
                >
                  <option value={ROOT_PARENT_CODE}>Raíz de la sociedad</option>
                  {parentOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.codigo} - {option.nombre}
                    </option>
                  ))}
                </select>
              </label>

              {suggestedParent && String(suggestedParent.id) !== String(form.centro_padre_id) ? (
                <div className="small text-muted">
                  Sugerencia por codigo: <strong>{suggestedParent.codigo}</strong> - {suggestedParent.nombre}{' '}
                  <button
                    type="button"
                    className="btn btn-link btn-sm p-0 align-baseline"
                    onClick={() => setFormField('centro_padre_id', String(suggestedParent.id))}
                  >
                    Usar sugerido
                  </button>
                </div>
              ) : null}

              <label className="form-label mb-0">
                Tipo de aprobador
                <select
                  className="form-select"
                  value={form.aprobador_tipo}
                  onChange={(event) => setFormField('aprobador_tipo', event.target.value)}
                >
                  <option value="usuario">Usuario especifico</option>
                  <option value="rol">Rol compartido</option>
                </select>
              </label>

              {form.aprobador_tipo === 'rol' ? (
                <label className="form-label mb-0">
                  Rol aprobador
                  <select
                    className="form-select"
                    value={form.rol_aprobador_id}
                    onChange={(event) => setFormField('rol_aprobador_id', event.target.value)}
                    required
                  >
                    <option value="">Seleccionar rol</option>
                    {roles.map((rol) => (
                      <option key={rol.id} value={rol.id}>
                        {rol.nombre} ({rol.codigo})
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <label className="form-label mb-0">
                  Usuario aprobador
                  <select
                    className="form-select"
                    value={form.usuario_aprobador_id}
                    onChange={(event) => setFormField('usuario_aprobador_id', event.target.value)}
                    required
                  >
                    <option value="">Seleccionar aprobador</option>
                    {usuarios.map((usuario) => (
                      <option key={usuario.id} value={usuario.id}>
                        {usuario.nombre} ({usuario.email})
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <label className="form-label mb-0">
                Orden
                <input
                  className="form-control"
                  type="number"
                  min="1"
                  value={form.orden}
                  onChange={(event) => setFormField('orden', event.target.value)}
                />
              </label>

              <label className="form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  checked={form.seleccionable_en_contabilizacion}
                  onChange={(event) => setFormField('seleccionable_en_contabilizacion', event.target.checked)}
                />
                <span className="form-check-label">Seleccionable en contabilización</span>
              </label>

              <label className="form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  checked={form.activo}
                  onChange={(event) => setFormField('activo', event.target.checked)}
                />
                <span className="form-check-label">Centro activo</span>
              </label>

              <div className="small text-muted">
                Padre actual: {selectedParentLabel || 'Raíz de la sociedad'}
              </div>

              <div className="d-flex gap-2">
                <button className="btn btn-primary flex-grow-1" type="submit" disabled={saving}>
                  {saving ? 'Guardando...' : editing ? 'Actualizar centro' : 'Crear centro'}
                </button>
                {editing ? (
                  <button className="btn btn-outline-secondary" type="button" onClick={resetForm} disabled={saving}>
                    Cancelar
                  </button>
                ) : null}
              </div>
            </form>
          </SectionCard>
        </div>

        <div className="col-12 col-xl-8">
          <SectionCard title="Vista del catálogo" className="mb-3">
            <div className="row g-2 align-items-end">
              <div className="col-12 col-lg-7">
                <label className="form-label mb-1">Buscar</label>
                <SearchInput
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar por codigo, nombre o aprobador..."
                />
              </div>

              <div className="col-6 col-lg-2">
                <label className="form-check mt-4">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    checked={showInactive}
                    onChange={(event) => setShowInactive(event.target.checked)}
                  />
                  <span className="form-check-label">Mostrar inactivos</span>
                </label>
              </div>

              <div className="col-6 col-lg-3">
                <label className="form-check mt-4">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    checked={onlySelectable}
                    onChange={(event) => setOnlySelectable(event.target.checked)}
                  />
                  <span className="form-check-label">Solo seleccionables</span>
                </label>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Jerarquia de centros de costo" className="mb-3">
            {treeNodes.length === 0 ? (
              <EmptyState className="py-2">No hay centros de costo para los filtros seleccionados.</EmptyState>
            ) : (
              <ul className="centros-costo-tree-list root">
                {treeNodes.map((node) => (
                  <CentroTreeNode
                    key={node.id}
                    node={node}
                    onEdit={startEdit}
                    onToggleActive={toggleActivo}
                  />
                ))}
              </ul>
            )}
          </SectionCard>

          <SectionCard title="Tabla completa">
            {filteredCentros.length === 0 ? (
              <EmptyState className="py-2">No hay centros de costo que mostrar.</EmptyState>
            ) : (
              <DataTable headers={TABLE_HEADERS} stickyHeader tableClassName="table table-hover align-middle mb-0">
                {filteredCentros.map((centro) => (
                  <tr key={centro.id}>
                    <td className="fw-semibold">{centro.codigo}</td>
                    <td>{centro.nombre}</td>
                    <td>{centro.centro_padre_codigo || 'Raíz'}</td>
                    <td>
                      <div>{getCentroCostoAprobadorNombre(centro) || '-'}</div>
                      <div className="small text-muted">{getCentroCostoAprobadorDetalle(centro) || 'Sin detalle'}</div>
                    </td>
                    <td>{centro.seleccionable_en_contabilizacion === false ? 'No' : 'Sí'}</td>
                    <td>{centro.activo === false ? 'Inactivo' : 'Activo'}</td>
                    <td>{formatDate(centro.actualizado_en)}</td>
                    <td className="text-end">
                      <div className="d-inline-flex gap-2">
                        <button
                          className="btn btn-outline-primary btn-sm"
                          type="button"
                          onClick={() => startEdit(centro)}
                        >
                          Editar
                        </button>
                        <button
                          className="btn btn-outline-secondary btn-sm"
                          type="button"
                          onClick={() => toggleActivo(centro)}
                        >
                          {centro.activo === false ? 'Activar' : 'Inactivar'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </DataTable>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

export default CentrosCosto;
