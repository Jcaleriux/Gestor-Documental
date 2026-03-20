import { openProtectedInNewTab } from '../utils/protectedResources.js';
import { useTablasPagoIngenieria } from '../hooks/tablasPago/useTablasPagoIngenieria';
import { formatDate, MAX_TABLA_PAGO_MB } from '../hooks/tablasPago/utils';
import PageHeader from './common/PageHeader';
import SectionCard from './common/SectionCard';
import EmptyState from './common/EmptyState';
import LoadingState from './common/LoadingState';
import ActionAlerts from './common/ActionAlerts';

function TablasPagoIngenieria({ sociedadId }) {
  const {
    loading,
    saving,
    deletingId,
    message,
    error,
    proveedorQuery,
    showProveedorList,
    selectedProveedor,
    tablaNombre,
    filteredProveedores,
    proveedoresConTablas,
    setShowProveedorList,
    setTablaNombre,
    setTablaFile,
    setError,
    onProveedorSelect,
    onProveedorInputChange,
    handleUpload,
    handleDeleteTabla,
    validateFileSize
  } = useTablasPagoIngenieria({ sociedadId });

  const openPdf = (rutaPdf) => {
    if (!rutaPdf) return;
    openProtectedInNewTab(`/api/files/pdf?path=${encodeURIComponent(rutaPdf)}`);
  };

  if (!sociedadId) {
    return (
      <div className="container-fluid">
        <EmptyState className="py-2">Seleccione una sociedad para gestionar tablas de pago.</EmptyState>
      </div>
    );
  }

  if (loading) {
    return <LoadingState label="Cargando tablas de pago..." />;
  }

  return (
    <div className="container-fluid">
      <PageHeader
        title="Tablas de pago"
        subtitle="Carga y consulta tablas de pago por proveedor de la sociedad seleccionada."
      />

      <ActionAlerts error={error} message={message} />

      <SectionCard title="Subir tabla de pago" className="mb-3">
        <form className="row g-2" onSubmit={handleUpload}>
          <div className="col-12 col-lg-6">
            <label className="form-label mb-0">Proveedor</label>
            <div className="position-relative">
              <input
                className="form-control"
                value={proveedorQuery}
                onChange={(e) => onProveedorInputChange(e.target.value)}
                onFocus={() => setShowProveedorList(true)}
                onBlur={() => setTimeout(() => setShowProveedorList(false), 150)}
                placeholder="Escriba nombre o identificacion..."
              />
              {showProveedorList && filteredProveedores.length > 0 && (
                <div
                  className="list-group position-absolute w-100"
                  style={{ zIndex: 50, maxHeight: '220px', overflowY: 'auto' }}
                >
                  {filteredProveedores.map((proveedor) => (
                    <button
                      key={proveedor.id}
                      type="button"
                      className="list-group-item list-group-item-action"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => onProveedorSelect(proveedor)}
                    >
                      <div className="fw-semibold">{proveedor.nombre}</div>
                      <div className="text-muted small">{proveedor.identificacion_numero}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {selectedProveedor && (
              <div className="text-muted small mt-1">
                Seleccionado: {selectedProveedor.nombre} ({selectedProveedor.identificacion_numero})
              </div>
            )}
          </div>

          <div className="col-12 col-lg-3">
            <label className="form-label mb-0">Nombre de la tabla</label>
            <input
              className="form-control"
              value={tablaNombre}
              onChange={(e) => setTablaNombre(e.target.value)}
              placeholder="Opcional"
            />
          </div>

          <div className="col-12 col-lg-3">
            <label className="form-label mb-0">PDF</label>
            <input
              className="form-control"
              type="file"
              accept="application/pdf"
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                if (!file) {
                  setTablaFile(null);
                  return;
                }
                setError('');
                if (!validateFileSize(file)) {
                  e.target.value = '';
                  return;
                }
                setTablaFile(file);
              }}
              required
            />
            <div className="text-muted small mt-1">
              Tamano maximo: {MAX_TABLA_PAGO_MB} MB
            </div>
          </div>

          <div className="col-12 d-grid d-lg-block">
            <button className="btn btn-primary" type="submit" disabled={saving}>
              {saving ? 'Subiendo...' : 'Subir tabla de pago'}
            </button>
          </div>
        </form>
      </SectionCard>

      <SectionCard title="Proveedores con tablas de pago">
        {proveedoresConTablas.length === 0 ? (
          <EmptyState className="py-2">No hay tablas de pago cargadas en esta sociedad.</EmptyState>
        ) : (
          <div className="d-grid gap-3">
            {proveedoresConTablas.map((entry) => (
              <div className="border rounded p-3" key={entry.proveedorId}>
                <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-2">
                  <div>
                    <div className="fw-semibold">
                      {entry.proveedor?.nombre || `Proveedor #${entry.proveedorId}`}
                    </div>
                    <div className="text-muted small">
                      {entry.proveedor?.identificacion_numero || '-'}
                    </div>
                  </div>
                  <span className="badge bg-primary-subtle text-primary">
                    {entry.tablas.length} tabla(s)
                  </span>
                </div>

                <div className="table-responsive">
                  <table className="table table-sm align-middle mb-0">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Nombre</th>
                        <th>Creado</th>
                        <th className="text-end">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {entry.tablas.map((tabla) => (
                        <tr key={tabla.id}>
                          <td>{tabla.id}</td>
                          <td>{tabla.nombre}</td>
                          <td>{formatDate(tabla.creado_en)}</td>
                          <td className="text-end">
                            <div className="d-inline-flex gap-2">
                              <button
                                className="btn btn-outline-success btn-sm"
                                type="button"
                                onClick={() => openPdf(tabla.ruta_pdf)}
                              >
                                Ver PDF
                              </button>
                              <button
                                className="btn btn-outline-danger btn-sm"
                                type="button"
                                onClick={() => handleDeleteTabla(tabla)}
                                disabled={deletingId === tabla.id}
                              >
                                {deletingId === tabla.id ? 'Eliminando...' : 'Eliminar'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}

export default TablasPagoIngenieria;
