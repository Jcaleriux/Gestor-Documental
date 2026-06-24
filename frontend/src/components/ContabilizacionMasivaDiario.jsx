import { useCallback, useEffect, useMemo, useState } from 'react';
import EmptyState from './common/EmptyState.jsx';
import LoadingState from './common/LoadingState.jsx';
import PageHeader from './common/PageHeader.jsx';
import SectionCard from './common/SectionCard.jsx';
import { contabilizacionMasivaApi } from '../services/contabilizacionMasivaApi.js';
import { getDocumentoConsecutivo } from '../utils/formatters.js';

const STATUS_LABELS = {
  all: 'Todos',
  ready_new: 'Listas nuevas',
  ready_update: 'Actualizaciones',
  ready_assigned: 'Asignadas',
  missing: 'No encontradas',
  ambiguous: 'Ambiguas',
  invalid_reference: 'Sin referencia',
  invalid_resolution: 'Resolucion invalida',
  skipped: 'Saltadas',
};

const REVIEW_STATUSES = new Set(['missing', 'ambiguous', 'invalid_reference', 'invalid_resolution']);

const formatFacturaLabel = (factura) => {
  if (!factura) return 'Sin factura';
  return `#${getDocumentoConsecutivo(factura)} · ${factura.emisor_nombre || 'Emisor sin nombre'}`;
};

const getResolutionKey = (resolution) => `${resolution.asiento}:${resolution.action}:${resolution.factura_id || ''}`;

const normalizeResolutionList = (resolutionMap) => Array.from(resolutionMap.values());

const buildSummaryCards = (summary = {}) => [
  { key: 'total', label: 'Asientos', value: summary.total || 0 },
  { key: 'ready_new', label: 'Nuevas listas', value: summary.ready_new || 0 },
  { key: 'ready_update', label: 'Actualizaciones', value: summary.ready_update || 0 },
  { key: 'ready_assigned', label: 'Asignadas', value: summary.ready_assigned || 0 },
  { key: 'missing', label: 'No encontradas', value: summary.missing || 0 },
  { key: 'ambiguous', label: 'Ambiguas', value: summary.ambiguous || 0 },
  { key: 'skipped', label: 'Saltadas', value: summary.skipped || 0 },
  { key: 'multi_centro', label: 'Con multiples centros', value: summary.multi_centro || 0 },
  { key: 'centros_no_resueltos', label: 'Centros no resueltos', value: summary.centros_no_resueltos || 0 },
];

function CandidateSearch({
  item,
  sociedadId,
  onAssign,
  disabled,
}) {
  const [query, setQuery] = useState(item.factura11 || item.referencia2 || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [candidates, setCandidates] = useState([]);

  const search = async () => {
    if (!query.trim()) {
      setCandidates([]);
      return;
    }

    try {
      setLoading(true);
      setError('');
      const response = await contabilizacionMasivaApi.buscarCandidatos({
        sociedadId,
        query,
      });
      setCandidates(Array.isArray(response.data?.data) ? response.data.data : []);
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudieron buscar facturas candidatas.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-2">
      <div className="input-group input-group-sm">
        <input
          type="search"
          className="form-control"
          value={query}
          disabled={disabled}
          placeholder="Buscar por consecutivo, clave, proveedor o identificacion"
          onChange={(event) => setQuery(event.target.value)}
        />
        <button type="button" className="btn btn-outline-secondary" disabled={disabled || loading} onClick={search}>
          {loading ? 'Buscando...' : 'Buscar'}
        </button>
      </div>
      {error && <div className="small text-danger mt-1">{error}</div>}
      {candidates.length > 0 && (
        <div className="list-group mt-2">
          {candidates.map((candidate) => (
            <button
              key={candidate.id}
              type="button"
              className="list-group-item list-group-item-action py-2"
              disabled={disabled}
              onClick={() => onAssign(item.asiento, candidate.id)}
            >
              <div className="fw-semibold">{formatFacturaLabel(candidate)}</div>
              <div className="small text-muted">
                ID {candidate.id} · Estado {candidate.estado || '-'}
                {candidate.tiene_contabilizacion ? ' · Tiene contabilizacion' : ''}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ReportRow({
  item,
  sociedadId,
  onSkip,
  onAssign,
  disabled,
}) {
  const needsReview = REVIEW_STATUSES.has(item.status);
  const centros = Array.isArray(item.centros_costo_lineas) ? item.centros_costo_lineas : [];
  const proveedores = Array.isArray(item.proveedor_nombres) ? item.proveedor_nombres : [];

  return (
    <tr>
      <td>
        <div className="fw-semibold">{item.asiento}</div>
        <div className="small text-muted">{item.fecha_contabilizacion || 'Sin fecha'}</div>
      </td>
      <td>
        <div>{item.referencia2 || '-'}</div>
        <div className="small text-muted">Factura: {item.factura11 || '-'}</div>
        {proveedores.length > 0 && (
          <div className="small text-muted">Proveedor CSV: {proveedores.join(', ')}</div>
        )}
      </td>
      <td>
        <span className={`badge ${needsReview ? 'text-bg-warning' : item.status === 'skipped' ? 'text-bg-secondary' : 'text-bg-success'}`}>
          {item.status_label || STATUS_LABELS[item.status] || item.status}
        </span>
      </td>
      <td>
        {item.factura ? (
          <>
            <div className="fw-semibold">{formatFacturaLabel(item.factura)}</div>
            <div className="small text-muted">
              ID {item.factura.id} · Estado {item.factura.estado || '-'}
              {item.factura.tiene_contabilizacion ? ' · Actualizacion parcial' : ''}
            </div>
            {item.match_strategy === 'proveedor' && (
              <div className="small text-success">Resuelta por proveedor del CSV</div>
            )}
          </>
        ) : (
          <span className="text-muted">Sin factura asignada</span>
        )}
        {needsReview && Array.isArray(item.matches) && item.matches.length > 0 && (
          <div className="list-group mt-2">
            {item.matches.map((match) => (
              <button
                key={match.id}
                type="button"
                className="list-group-item list-group-item-action py-2"
                disabled={disabled}
                onClick={() => onAssign(item.asiento, match.id)}
              >
                <div className="fw-semibold">{formatFacturaLabel(match)}</div>
                <div className="small text-muted">ID {match.id} · Estado {match.estado || '-'}</div>
              </button>
            ))}
          </div>
        )}
        {needsReview && (
          <CandidateSearch
            item={item}
            sociedadId={sociedadId}
            onAssign={onAssign}
            disabled={disabled}
          />
        )}
      </td>
      <td>
        <div className="fw-semibold">{item.centro_costo_resumen || '-'}</div>
        {centros.length > 0 && (
          <div className="small text-muted mt-1">
            {centros.map((centro) => (
              centro.encontrado_en_catalogo === false
                ? `${centro.codigo} (no existe en catalogo)`
                : `${centro.codigo} - ${centro.nombre}`
            )).join(', ')}
          </div>
        )}
      </td>
      <td>
        <button
          type="button"
          className="btn btn-sm btn-outline-secondary"
          disabled={disabled || item.status === 'skipped'}
          onClick={() => onSkip(item.asiento)}
        >
          Saltar
        </button>
      </td>
    </tr>
  );
}

function ContabilizacionMasivaDiario({ sociedadId }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applyResult, setApplyResult] = useState(null);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [resolutionMap, setResolutionMap] = useState(() => new Map());

  const resolutions = useMemo(() => normalizeResolutionList(resolutionMap), [resolutionMap]);
  const resolutionSignature = useMemo(
    () => resolutions.map(getResolutionKey).sort().join('|'),
    [resolutions]
  );

  const loadReport = useCallback(async () => {
    if (!sociedadId) {
      setReport(null);
      return;
    }

    try {
      setLoading(true);
      setError('');
      const response = await contabilizacionMasivaApi.analizarDiarioDocumentos({
        sociedad_id: Number(sociedadId),
        resolutions,
      });
      setReport(response.data?.data || null);
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo analizar el diario de documentos.');
    } finally {
      setLoading(false);
    }
  }, [resolutions, sociedadId]);

  useEffect(() => {
    loadReport();
  }, [loadReport, resolutionSignature]);

  const setResolution = (asiento, resolution) => {
    setResolutionMap((previous) => {
      const next = new Map(previous);
      next.set(String(asiento), { asiento: String(asiento), ...resolution });
      return next;
    });
  };

  const clearResolutions = () => {
    setResolutionMap(new Map());
    setApplyResult(null);
  };

  const applyReadyItems = async () => {
    if (!sociedadId || readyToApply <= 0) {
      return;
    }

    try {
      setApplying(true);
      setError('');
      setApplyResult(null);
      const response = await contabilizacionMasivaApi.aplicarDiarioDocumentos({
        sociedad_id: Number(sociedadId),
        resolutions,
      });
      setApplyResult(response.data?.data || null);
      await loadReport();
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo aplicar la contabilizacion masiva.');
    } finally {
      setApplying(false);
    }
  };

  const items = Array.isArray(report?.items) ? report.items : [];
  const filteredItems = statusFilter === 'all'
    ? items
    : items.filter((item) => item.status === statusFilter);
  const readyToApply = (report?.summary?.ready_new || 0)
    + (report?.summary?.ready_update || 0)
    + (report?.summary?.ready_assigned || 0);
  const blockers = (report?.summary?.missing || 0)
    + (report?.summary?.ambiguous || 0)
    + (report?.summary?.invalid_reference || 0)
    + (report?.summary?.invalid_resolution || 0);

  return (
    <div>
      <PageHeader
        title="Contabilizacion masiva"
        subtitle="Previsualiza el diario de documentos, resuelve excepciones y confirma que el lote esta listo antes de aplicar cambios."
      />

      {!sociedadId && (
        <SectionCard>
          <EmptyState>Seleccione una sociedad para analizar el diario.</EmptyState>
        </SectionCard>
      )}

      {sociedadId && (
        <>
          <SectionCard>
            <div className="d-flex flex-wrap gap-2 justify-content-between align-items-start">
              <div>
                <div className="fw-semibold">Archivo fuente</div>
                <div className="small text-muted">{report?.source?.file_path || 'Diario de documentos predeterminado'}</div>
                {report?.source?.malformed_rows > 0 && (
                  <div className="small text-warning mt-1">
                    {report.source.malformed_rows} filas tienen comas internas; se interpretan usando columnas finales.
                  </div>
                )}
              </div>
              <div className="d-flex gap-2">
                <button type="button" className="btn btn-outline-secondary btn-sm" disabled={loading || applying} onClick={clearResolutions}>
                  Limpiar resoluciones
                </button>
                <button type="button" className="btn btn-primary btn-sm" disabled={loading || applying} onClick={loadReport}>
                  {loading ? 'Actualizando...' : 'Actualizar reporte'}
                </button>
              </div>
            </div>
          </SectionCard>

          {error && <div className="alert alert-danger">{error}</div>}
          {applyResult && (
            <div className="alert alert-success">
              Aplicacion completada: {applyResult.summary?.applied || 0} aplicadas,
              {' '}{applyResult.summary?.created || 0} nuevas,
              {' '}{applyResult.summary?.created_assigned || 0} asignadas,
              {' '}{applyResult.summary?.updated || 0} actualizadas,
              {' '}{applyResult.summary?.skipped || 0} omitidas.
            </div>
          )}
          {loading && !report && <LoadingState label="Analizando diario..." />}

          {report && (
            <>
              <div className="row g-3 mb-3">
                {buildSummaryCards(report.summary).map((card) => (
                  <div className="col-6 col-lg-3" key={card.key}>
                    <div className="summary-card h-100">
                      <div className="summary-label">{card.label}</div>
                      <div className="summary-value">{card.value}</div>
                    </div>
                  </div>
                ))}
              </div>

              <SectionCard>
                <div className="d-flex flex-wrap gap-2 justify-content-between align-items-center mb-3">
                  <div>
                    <div className="fw-semibold">Estado del lote</div>
                    <div className="small text-muted">
                      {readyToApply} asientos listos · {blockers} requieren resolucion · {report.summary.skipped || 0} saltados
                    </div>
                  </div>
                  <div className="d-flex flex-wrap gap-2 align-items-center">
                    <button
                      type="button"
                      className="btn btn-success btn-sm"
                      disabled={loading || applying || readyToApply <= 0}
                      onClick={applyReadyItems}
                    >
                      {applying ? 'Aplicando...' : `Aplicar filas listas (${readyToApply})`}
                    </button>
                    <select
                      className="form-select form-select-sm"
                      style={{ maxWidth: 260 }}
                      value={statusFilter}
                      disabled={applying}
                      onChange={(event) => setStatusFilter(event.target.value)}
                    >
                      {Object.entries(STATUS_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {filteredItems.length === 0 ? (
                  <EmptyState>No hay asientos para el filtro seleccionado.</EmptyState>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-sm align-middle">
                      <thead>
                        <tr>
                          <th>Asiento</th>
                          <th>Referencia</th>
                          <th>Estado</th>
                          <th>Factura</th>
                          <th>Centros de costo</th>
                          <th>Accion</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredItems.map((item) => (
                          <ReportRow
                            key={item.asiento}
                            item={item}
                            sociedadId={sociedadId}
                            disabled={loading || applying}
                            onSkip={(asiento) => setResolution(asiento, { action: 'skip' })}
                            onAssign={(asiento, facturaId) => setResolution(asiento, {
                              action: 'assign',
                              factura_id: Number(facturaId),
                            })}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </SectionCard>
            </>
          )}
        </>
      )}
    </div>
  );
}

export default ContabilizacionMasivaDiario;
