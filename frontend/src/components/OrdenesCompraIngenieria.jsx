import { useEffect, useRef } from 'react';
import { useOrdenesCompraIngenieria } from '../hooks/ordenesCompra/useOrdenesCompraIngenieria';
import { openProtectedInNewTab } from '../utils/protectedResources.js';
import {
  formatAmount,
  formatDateOnly,
  formatDateTime,
  MAX_ORDEN_COMPRA_MB,
  MONEDAS_OPCIONES
} from '../hooks/ordenesCompra/utils';
import PageHeader from './common/PageHeader';
import SectionCard from './common/SectionCard';
import EmptyState from './common/EmptyState';
import LoadingState from './common/LoadingState';
import ActionAlerts from './common/ActionAlerts';

function UploadOrdenSection({
  saving,
  proveedoresOrdenados,
  selectedProveedor,
  ordenNumero,
  ordenMonto,
  ordenMoneda,
  ordenFecha,
  onProveedorChange,
  setOrdenNumero,
  setOrdenMonto,
  setOrdenMoneda,
  setOrdenFecha,
  setOrdenFile,
  setError,
  handleUpload,
  validateFileSize
}) {
  return (
    <SectionCard title="Subir orden de compra" className="mb-3">
      <form className="row g-2" onSubmit={handleUpload}>
        <div className="col-12 col-lg-6">
          <label className="form-label mb-0" htmlFor="oc-proveedor-select">Proveedor</label>
          <select
            id="oc-proveedor-select"
            className="form-select"
            value={selectedProveedor?.id || ''}
            onChange={(e) => onProveedorChange(e.target.value)}
            required
          >
            <option value="">Seleccione proveedor</option>
            {proveedoresOrdenados.map((proveedor) => (
              <option key={proveedor.id} value={proveedor.id}>
                {proveedor.nombre} - {proveedor.identificacion_numero}
              </option>
            ))}
          </select>
          {selectedProveedor && (
            <div className="text-muted small mt-1">
              Seleccionado: {selectedProveedor.nombre} ({selectedProveedor.identificacion_numero})
            </div>
          )}
        </div>

        <div className="col-12 col-lg-3">
          <label className="form-label mb-0" htmlFor="oc-numero-input">Numero de OC</label>
          <input
            id="oc-numero-input"
            className="form-control"
            value={ordenNumero}
            onChange={(e) => setOrdenNumero(String(e.target.value || '').replace(/\D/g, ''))}
            placeholder="Ej: 2176"
            required
          />
        </div>

        <div className="col-6 col-lg-2">
          <label className="form-label mb-0" htmlFor="oc-monto-input">Monto</label>
          <input
            id="oc-monto-input"
            className="form-control"
            type="number"
            min="0.01"
            step="0.01"
            value={ordenMonto}
            onChange={(e) => setOrdenMonto(e.target.value)}
            required
          />
        </div>

        <div className="col-6 col-lg-1">
          <label className="form-label mb-0" htmlFor="oc-moneda-select">Moneda</label>
          <select
            id="oc-moneda-select"
            className="form-select"
            value={ordenMoneda}
            onChange={(e) => setOrdenMoneda(e.target.value)}
          >
            {MONEDAS_OPCIONES.map((moneda) => (
              <option key={moneda} value={moneda}>{moneda}</option>
            ))}
          </select>
        </div>

        <div className="col-12 col-lg-3">
          <label className="form-label mb-0" htmlFor="oc-fecha-input">Fecha</label>
          <input
            id="oc-fecha-input"
            className="form-control"
            type="date"
            value={ordenFecha}
            onChange={(e) => setOrdenFecha(e.target.value)}
            required
          />
        </div>

        <div className="col-12 col-lg-6">
          <label className="form-label mb-0" htmlFor="oc-pdf-input">PDF</label>
          <input
            id="oc-pdf-input"
            className="form-control"
            type="file"
            accept="application/pdf"
            onChange={(e) => {
              const file = e.target.files?.[0] || null;
              if (!file) {
                setOrdenFile(null);
                return;
              }
              setError('');
              if (!validateFileSize(file)) {
                e.target.value = '';
                return;
              }
              setOrdenFile(file);
            }}
            required
          />
          <div className="text-muted small mt-1">
            Tamano maximo: {MAX_ORDEN_COMPRA_MB} MB
          </div>
        </div>

        <div className="col-12 d-grid d-lg-block">
          <button className="btn btn-primary" type="submit" disabled={saving}>
            {saving ? 'Subiendo...' : 'Subir orden de compra'}
          </button>
        </div>
      </form>
    </SectionCard>
  );
}

function AutoImportResultsTable({ autoResults }) {
  if (autoResults.length === 0) {
    return null;
  }

  return (
    <div className="table-responsive mt-3">
      <table className="table table-sm align-middle mb-0">
        <thead>
          <tr>
            <th>Archivo</th>
            <th>Estado</th>
            <th>Numero OC</th>
            <th>Proveedor</th>
            <th>Fecha</th>
            <th>Moneda</th>
            <th className="text-end">Monto</th>
            <th>Error</th>
          </tr>
        </thead>
        <tbody>
          {autoResults.map((result) => (
            <tr key={result.rowKey || result.filename}>
              <td className="small">{result.filename}</td>
              <td>
                <span className={`badge ${result.status === 'ok' ? 'text-bg-success' : 'text-bg-danger'}`}>
                  {result.status === 'ok' ? 'OK' : 'Error'}
                </span>
              </td>
              <td>{result.numero_oc || '-'}</td>
              <td>{result.proveedor || '-'}</td>
              <td>{result.fecha || '-'}</td>
              <td>{result.moneda || '-'}</td>
              <td className="text-end">{result.monto != null ? formatAmount(result.monto) : '-'}</td>
              <td className="small text-danger">{result.error || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AutoImportSection({
  autoFiles,
  autoImporting,
  autoResults,
  handleAutoFilesChange,
  handleAutoImport
}) {
  const autoDirectoryInputRef = useRef(null);

  useEffect(() => {
    const input = autoDirectoryInputRef.current;
    if (!input) return;
    // Directory picker attributes are non-standard; apply them directly to avoid JSX unknown-prop warnings.
    input.setAttribute('webkitdirectory', '');
    input.setAttribute('directory', '');
  }, []);

  return (
    <SectionCard title="Carga automatica por carpeta" className="mb-3">
      <div className="row g-2 align-items-end">
        <div className="col-12 col-lg-8">
          <label className="form-label mb-0" htmlFor="oc-carpeta-input">Carpeta con PDFs de OCs</label>
          <input
            id="oc-carpeta-input"
            ref={autoDirectoryInputRef}
            className="form-control"
            type="file"
            accept="application/pdf"
            multiple
            onChange={(e) => handleAutoFilesChange(e.target.files)}
          />
          <div className="text-muted small mt-1">
            Se procesaran solo archivos `.pdf`. Seleccionados: {autoFiles.length}
          </div>
        </div>
        <div className="col-12 col-lg-4 d-grid d-lg-block">
          <button
            className="btn btn-outline-primary"
            type="button"
            onClick={handleAutoImport}
            disabled={autoImporting || autoFiles.length === 0}
          >
            {autoImporting ? 'Importando...' : 'Importar carpeta automaticamente'}
          </button>
        </div>
      </div>

      <AutoImportResultsTable autoResults={autoResults} />
    </SectionCard>
  );
}

function ProveedorOrdenesCard({
  entry,
  deletingId,
  updatingEstadoId,
  onOpenPdf,
  onToggleEstadoManual,
  onDeleteOrden
}) {
  return (
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
          {entry.ordenes.length} OC(s)
        </span>
      </div>

      <div className="table-responsive">
        <table className="table table-sm align-middle mb-0">
          <thead>
            <tr>
              <th>ID</th>
              <th>Numero OC</th>
              <th>Fecha OC</th>
              <th>Moneda</th>
              <th className="text-end">Monto</th>
              <th className="text-end">Consumido</th>
              <th className="text-end">Disponible</th>
              <th>Estado</th>
              <th>Creado</th>
              <th className="text-end">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {entry.ordenes.map((orden) => {
              const estado = String(orden.estado || '').toLowerCase();
              const estadoLabel = estado === 'cerrada' ? 'Cerrada' : 'Abierta';
              const nextLabel = estado === 'cerrada' ? 'Abrir manual' : 'Cerrar manual';

              return (
                <tr key={orden.id}>
                  <td>{orden.id}</td>
                  <td>{orden.nombre}</td>
                  <td>{formatDateOnly(orden.fecha)}</td>
                  <td>{orden.moneda || '-'}</td>
                  <td className="text-end">{formatAmount(orden.monto)}</td>
                  <td className="text-end">{formatAmount(orden.monto_consumido)}</td>
                  <td className="text-end">{formatAmount(orden.monto_disponible)}</td>
                  <td>
                    <span className={`badge ${estado === 'cerrada' ? 'text-bg-secondary' : 'text-bg-success'}`}>
                      {estadoLabel}
                    </span>
                  </td>
                  <td>{formatDateTime(orden.creado_en)}</td>
                  <td className="text-end">
                    <div className="d-inline-flex gap-2">
                      <button
                        className="btn btn-outline-success btn-sm"
                        type="button"
                        onClick={() => onOpenPdf(orden.ruta_pdf)}
                      >
                        Ver PDF
                      </button>
                      <button
                        className="btn btn-outline-primary btn-sm"
                        type="button"
                        onClick={() => onToggleEstadoManual(orden)}
                        disabled={updatingEstadoId === orden.id}
                      >
                        {updatingEstadoId === orden.id ? 'Actualizando...' : nextLabel}
                      </button>
                      <button
                        className="btn btn-outline-danger btn-sm"
                        type="button"
                        onClick={() => onDeleteOrden(orden)}
                        disabled={deletingId === orden.id}
                      >
                        {deletingId === orden.id ? 'Eliminando...' : 'Eliminar'}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ProveedoresOrdenesSection({
  estadoFilter,
  proveedoresConOrdenes,
  setEstadoFilter,
  deletingId,
  updatingEstadoId,
  onOpenPdf,
  onToggleEstadoManual,
  onDeleteOrden
}) {
  return (
    <SectionCard
      title="Proveedores con ordenes de compra"
      subtitle={(
        <div className="d-flex align-items-center gap-2">
          <span className="small text-muted">Estado:</span>
          <select
            className="form-select form-select-sm"
            style={{ width: '220px' }}
            value={estadoFilter}
            onChange={(e) => setEstadoFilter(e.target.value)}
          >
            <option value="">Todas</option>
            <option value="abierta">Abiertas</option>
            <option value="cerrada">Cerradas</option>
          </select>
        </div>
      )}
    >
      {proveedoresConOrdenes.length === 0 ? (
        <EmptyState className="py-2">No hay ordenes de compra cargadas en esta sociedad.</EmptyState>
      ) : (
        <div className="d-grid gap-3">
          {proveedoresConOrdenes.map((entry) => (
            <ProveedorOrdenesCard
              key={entry.proveedorId}
              entry={entry}
              deletingId={deletingId}
              updatingEstadoId={updatingEstadoId}
              onOpenPdf={onOpenPdf}
              onToggleEstadoManual={onToggleEstadoManual}
              onDeleteOrden={onDeleteOrden}
            />
          ))}
        </div>
      )}
    </SectionCard>
  );
}

function OrdenesCompraIngenieria({ sociedadId }) {
  const {
    loading,
    saving,
    deletingId,
    updatingEstadoId,
    message,
    error,
    estadoFilter,
    proveedoresOrdenados,
    selectedProveedor,
    ordenNumero,
    ordenMonto,
    ordenMoneda,
    ordenFecha,
    autoFiles,
    autoImporting,
    autoResults,
    proveedoresConOrdenes,
    setEstadoFilter,
    setOrdenNumero,
    setOrdenMonto,
    setOrdenMoneda,
    setOrdenFecha,
    setOrdenFile,
    setError,
    onProveedorChange,
    handleAutoFilesChange,
    handleAutoImport,
    handleUpload,
    handleDeleteOrden,
    handleToggleEstadoManual,
    validateFileSize
  } = useOrdenesCompraIngenieria({ sociedadId });

  const openPdf = (rutaPdf) => {
    if (!rutaPdf) return;
    openProtectedInNewTab(`/api/files/pdf?path=${encodeURIComponent(rutaPdf)}`);
  };

  if (!sociedadId) {
    return (
      <div className="container-fluid">
        <EmptyState className="py-2">Seleccione una sociedad para gestionar ordenes de compra.</EmptyState>
      </div>
    );
  }

  if (loading) {
    return <LoadingState label="Cargando ordenes de compra..." />;
  }

  return (
    <div className="container-fluid">
      <PageHeader
        title="Ordenes de compra"
        subtitle="Carga y consulta ordenes de compra por proveedor de la sociedad seleccionada."
      />
      <ActionAlerts error={error} message={message} />
      <UploadOrdenSection
        saving={saving}
        proveedoresOrdenados={proveedoresOrdenados}
        selectedProveedor={selectedProveedor}
        ordenNumero={ordenNumero}
        ordenMonto={ordenMonto}
        ordenMoneda={ordenMoneda}
        ordenFecha={ordenFecha}
        onProveedorChange={onProveedorChange}
        setOrdenNumero={setOrdenNumero}
        setOrdenMonto={setOrdenMonto}
        setOrdenMoneda={setOrdenMoneda}
        setOrdenFecha={setOrdenFecha}
        setOrdenFile={setOrdenFile}
        setError={setError}
        handleUpload={handleUpload}
        validateFileSize={validateFileSize}
      />
      <AutoImportSection
        autoFiles={autoFiles}
        autoImporting={autoImporting}
        autoResults={autoResults}
        handleAutoFilesChange={handleAutoFilesChange}
        handleAutoImport={handleAutoImport}
      />
      <ProveedoresOrdenesSection
        estadoFilter={estadoFilter}
        proveedoresConOrdenes={proveedoresConOrdenes}
        setEstadoFilter={setEstadoFilter}
        deletingId={deletingId}
        updatingEstadoId={updatingEstadoId}
        onOpenPdf={openPdf}
        onToggleEstadoManual={handleToggleEstadoManual}
        onDeleteOrden={handleDeleteOrden}
      />
    </div>
  );
}

export default OrdenesCompraIngenieria;
