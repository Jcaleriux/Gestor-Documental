import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useRetencionesPendientes } from '../hooks/useRetencionesPendientes';
import {
  formatAmount,
  formatDate,
  getDocumentoConsecutivo,
  getDocumentoConsecutivoCompleto,
} from '../utils/formatters';
import EmptyState from './common/EmptyState';
import FiltersBar from './common/FiltersBar';
import FiltersPanel from './common/FiltersPanel';
import LoadingState from './common/LoadingState';
import PageHeader from './common/PageHeader';
import SearchInput from './common/SearchInput';
import SectionCard from './common/SectionCard';
import DataTable from './common/DataTable';
import StatusBadge from './common/StatusBadge';
import { LOADING_LABELS, RETENCIONES_PENDIENTES_LABELS } from '../utils/uiLabels';

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const getEstadoRetencion = (item) => {
  const pendiente = toNumber(item?.retencion_pendiente);
  const pagada = toNumber(item?.retencion_pagada);
  if (pendiente <= 0) return 'pagada';
  if (pagada > 0) return 'parcial';
  return 'pendiente';
};

const estadoRetencionLabel = (estado) => {
  if (!estado) return 'Pendiente';
  if (estado === 'parcial') return 'Parcial';
  if (estado === 'pagada') return 'Pagada';
  return 'Pendiente';
};

const estadoRetencionClass = (estado) => {
  if (estado === 'pagada') return 'badge-soft-success';
  if (estado === 'parcial') return 'badge-soft-info';
  return 'badge-soft-warning';
};

function RetencionesPendientes({ sociedadId }) {
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [estadoRetencion, setEstadoRetencion] = useState('');
  const [enTramite, setEnTramite] = useState('');
  const [moneda, setMoneda] = useState('');
  const [montoMin, setMontoMin] = useState('');
  const [montoMax, setMontoMax] = useState('');

  const { retenciones, loading } = useRetencionesPendientes({ sociedadId });

  const filtradas = useMemo(() => {
    const term = search.trim().toLowerCase();
    const monedaTerm = moneda.trim().toUpperCase();
    const min = Number(montoMin);
    const max = Number(montoMax);

    return retenciones.filter((item) => {
      const doc = (item.consecutivo || item.clave || '').toLowerCase();
      const proveedor = (item.proveedor_nombre || '').toLowerCase();
      const proveedorIdentificacion = String(item.proveedor_identificacion || '').toLowerCase();
      const monedaDoc = (
        item.resumen?.CodigoTipoMoneda?.CodigoMoneda
        || item.resumen?.CodigoMoneda
        || item.resumen?.codigoMoneda
        || 'CRC'
      ).toUpperCase();
      const pendiente = Number(item.retencion_pendiente || 0);
      const estadoRetencionItem = getEstadoRetencion(item);

      const matchSearch = !term || doc.includes(term) || proveedor.includes(term) || proveedorIdentificacion.includes(term);
      const matchEstado = !estadoRetencion || estadoRetencionItem === estadoRetencion;
      const matchEnTramite = !enTramite
        || (enTramite === 'si' && item.retencion_en_tramite_activo)
        || (enTramite === 'no' && !item.retencion_en_tramite_activo);
      const matchMoneda = !monedaTerm || monedaDoc === monedaTerm;
      const matchMin = !montoMin || pendiente >= min;
      const matchMax = !montoMax || pendiente <= max;

      return matchSearch && matchEstado && matchEnTramite && matchMoneda && matchMin && matchMax;
    });
  }, [retenciones, search, estadoRetencion, enTramite, moneda, montoMin, montoMax]);

  const resumen = useMemo(() => {
    const totalDocs = filtradas.length;
    const totalPendiente = filtradas.reduce((acc, item) => acc + Number(item.retencion_pendiente || 0), 0);
    return { totalDocs, totalPendiente };
  }, [filtradas]);

  if (!sociedadId) {
    return <p>Seleccione una sociedad para ver las retenciones pendientes.</p>;
  }

  if (loading) return <LoadingState label={LOADING_LABELS.retencionesPendientes} />;

  return (
    <div className="documents-page">
      <PageHeader
        title={RETENCIONES_PENDIENTES_LABELS.pageTitle}
        subtitle={RETENCIONES_PENDIENTES_LABELS.pageSubtitle}
        actions={(
          <button className="btn btn-outline-secondary" type="button" onClick={() => setShowFilters((prev) => !prev)}>
            {RETENCIONES_PENDIENTES_LABELS.filtersButton}
          </button>
        )}
      />

      <FiltersBar>
        <SearchInput
          placeholder={RETENCIONES_PENDIENTES_LABELS.searchPlaceholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </FiltersBar>

      <FiltersPanel visible={showFilters}>
        <div className="filter-item">
          <label>Estado retencion</label>
          <select className="form-select" value={estadoRetencion} onChange={(e) => setEstadoRetencion(e.target.value)}>
            <option value="">Todos</option>
            <option value="pendiente">Pendiente</option>
            <option value="parcial">Parcial</option>
            <option value="pagada">Pagada</option>
          </select>
        </div>
        <div className="filter-item">
          <label>En tramite</label>
          <select className="form-select" value={enTramite} onChange={(e) => setEnTramite(e.target.value)}>
            <option value="">Todos</option>
            <option value="si">Si</option>
            <option value="no">No</option>
          </select>
        </div>
        <div className="filter-item">
          <label>Moneda</label>
          <select className="form-select" value={moneda} onChange={(e) => setMoneda(e.target.value)}>
            <option value="">Todas</option>
            <option value="CRC">CRC</option>
            <option value="USD">USD</option>
          </select>
        </div>
        <div className="filter-item">
          <label>Monto min</label>
          <input
            type="number"
            className="form-control"
            value={montoMin}
            onChange={(e) => setMontoMin(e.target.value)}
            placeholder="0"
          />
        </div>
        <div className="filter-item">
          <label>Monto max</label>
          <input
            type="number"
            className="form-control"
            value={montoMax}
            onChange={(e) => setMontoMax(e.target.value)}
            placeholder="0"
          />
        </div>
      </FiltersPanel>

      <SectionCard className="table-card mb-3">
        <div className="text-muted">
          Documentos: {resumen.totalDocs} - Total retencion pendiente: {formatAmount(resumen.totalPendiente)}
        </div>
      </SectionCard>

      <SectionCard className="table-card" bodyClassName="p-0">
        <DataTable
          headers={[
            'Documento',
            'Proveedor',
            'Moneda',
            'Retencion pagada',
            'Retencion pendiente',
            'Estado retencion',
            'En tramite',
            'Fecha',
            'Acciones'
          ]}
        >
          {filtradas.map((item) => {
            const monedaDoc = (
              item.resumen?.CodigoTipoMoneda?.CodigoMoneda
              || item.resumen?.CodigoMoneda
              || item.resumen?.codigoMoneda
              || 'CRC'
            );
            const estadoRetencionItem = getEstadoRetencion(item);
            const documentoVisible = getDocumentoConsecutivo(item);
            const documentoCompleto = getDocumentoConsecutivoCompleto(item);

            return (
              <tr key={item.id}>
                <td className="fw-semibold" title={documentoCompleto}>#{documentoVisible}</td>
                <td>
                  <div>{item.proveedor_nombre || '-'}</div>
                  <div className="text-muted small">{item.proveedor_identificacion || '-'}</div>
                </td>
                <td>{monedaDoc}</td>
                <td>{formatAmount(item.retencion_pagada)}</td>
                <td>{formatAmount(item.retencion_pendiente)}</td>
                <td>
                  <StatusBadge
                    label={estadoRetencionLabel(estadoRetencionItem)}
                    className={estadoRetencionClass(estadoRetencionItem)}
                  />
                </td>
                <td>
                  <StatusBadge
                    label={item.retencion_en_tramite_activo ? 'Si' : 'No'}
                    className={item.retencion_en_tramite_activo ? 'badge-soft-info' : 'badge-soft-secondary'}
                  />
                </td>
                <td>{formatDate(item.fecha_emision)}</td>
                <td className="text-end">
                  <Link className="btn btn-sm btn-outline-primary" to={`/facturas/${item.id}`}>
                    Ver
                  </Link>
                </td>
              </tr>
            );
          })}
          {filtradas.length === 0 && (
            <tr>
              <td colSpan="9" className="py-4">
                <EmptyState className="text-center py-2">
                  {RETENCIONES_PENDIENTES_LABELS.emptyFilters}
                </EmptyState>
              </td>
            </tr>
          )}
        </DataTable>
      </SectionCard>
    </div>
  );
}

export default RetencionesPendientes;
