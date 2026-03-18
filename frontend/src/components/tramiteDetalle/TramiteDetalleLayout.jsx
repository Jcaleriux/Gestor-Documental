import { useCallback, useEffect, useState } from 'react';
import { formatAmount } from '../../utils/formatters';
import { estadoLabelTramite, estadoClassTramite } from '../../utils/estadosTramite';
import { withAuthToken } from '../../utils/auth';
import PageHeader from '../common/PageHeader';
import ActionAlerts from '../common/ActionAlerts';
import EmptyState from '../common/EmptyState';
import SectionCard from '../common/SectionCard';
import TramiteMeta from '../TramiteMeta';
import TramiteDocumentoUnificado from '../TramiteDocumentoUnificado';
import TramiteUnificadaHeader from '../TramiteUnificadaHeader';
import TramiteDocumentosTable from '../TramiteDocumentosTable';
import TramiteHistorial from '../TramiteHistorial';
import TramiteHeaderActions from '../TramiteHeaderActions';
import TramiteTabs from '../TramiteTabs';
import TramitePagosSection from './TramitePagosSection';
import TramiteRetencionesSection from './TramiteRetencionesSection';

const getPdfUrl = (rutaPdf) => (
  rutaPdf ? withAuthToken(`/api/files/pdf?path=${encodeURIComponent(rutaPdf)}`) : ''
);

function TramiteDetalleLayout({ layoutProps }) {
  const {
    header,
    tabs,
    alerts,
    historial,
    meta,
    pagos,
    retenciones,
    table
  } = layoutProps;

  const { tramite, resumenTotales, resumenMoneda } = meta;
  const {
    enEtapaGerencia,
    puedeVerGerencia,
    puedeGerencia,
    puedeGerenciaContable,
    puedeFinanciera,
    puedeTesoreria
  } = table.permisos;
  const documentosActivosIdsKey = table.documentosActivos
    .map((doc) => Number(doc.factura_id))
    .join('|');
  const [expandedDocIds, setExpandedDocIds] = useState(() => new Set());

  useEffect(() => {
    setExpandedDocIds((previous) => {
      const availableIds = new Set(table.documentosActivos.map((doc) => Number(doc.factura_id)));
      const next = new Set(
        [...previous].filter((facturaId) => availableIds.has(Number(facturaId)))
      );

      if (table.activeTab === 'unificada' && next.size === 0 && table.documentosActivos.length > 0) {
        next.add(Number(table.documentosActivos[0].factura_id));
      }

      return next;
    });
  }, [table.activeTab, documentosActivosIdsKey]);

  const handleToggleExpandedDoc = useCallback((facturaId) => {
    setExpandedDocIds((previous) => {
      const next = new Set(previous);
      if (next.has(facturaId)) {
        next.delete(facturaId);
      } else {
        next.add(facturaId);
      }
      return next;
    });
  }, []);

  const handleExpandAllDocs = useCallback(() => {
    setExpandedDocIds(new Set(table.documentosActivos.map((doc) => Number(doc.factura_id))));
  }, [table.documentosActivos]);

  const handleCollapseAllDocs = useCallback(() => {
    setExpandedDocIds(new Set());
  }, []);

  return (
    <div className="documents-page">
      <PageHeader
        title={header.title}
        subtitle={header.subtitle}
        actionsClassName={header.actionsClassName}
        actions={(
          <TramiteHeaderActions
            accionSiguiente={header.accionSiguiente}
            onAccionSiguiente={header.onAccionSiguiente}
            historialVisible={header.historialVisible}
            onToggleHistorial={header.onToggleHistorial}
            labels={header.labels}
          />
        )}
      />

      <TramiteTabs activeTab={tabs.activeTab} onChange={tabs.onChange} labels={tabs.labels} />

      <ActionAlerts error={alerts.error} message={alerts.message} />

      {historial.visible && (
        <TramiteHistorial
          historial={historial.historial}
          historialError={historial.historialError}
          labels={historial.labels}
        />
      )}

      <SectionCard className="table-card tramite-detail-card">
        <TramiteMeta
          estado={estadoLabelTramite(tramite.estado)}
          estadoClass={estadoClassTramite(tramite.estado)}
          creadoPor={tramite.creado_por}
          creadoEn={tramite.creado_en ? new Date(tramite.creado_en).toLocaleDateString() : '-'}
          totalDocs={resumenTotales.totalDocs}
          totalMonto={formatAmount(resumenTotales.suma)}
          resumenMoneda={resumenMoneda}
        />
      </SectionCard>

      <TramitePagosSection
        visible={pagos.visible}
        documentosActivos={pagos.documentosActivos}
        pagosFacturas={pagos.pagosFacturas}
        onPagoFacturaChange={pagos.onPagoFacturaChange}
      />

      {retenciones.retencionesActivas.length > 0 && (
        <TramiteRetencionesSection retencionesActivas={retenciones.retencionesActivas} />
      )}

      <SectionCard className="table-card" bodyClassName="p-0">
        <div className="table-responsive">
          {table.activeTab === 'individual' && (
            <TramiteDocumentosTable
              documentos={table.documentos}
              enEtapaGerencia={enEtapaGerencia}
              puedeVerGerencia={puedeVerGerencia}
              puedeGerencia={puedeGerencia}
              puedeGerenciaContable={puedeGerenciaContable}
              puedeFinanciera={puedeFinanciera}
              puedeTesoreria={puedeTesoreria}
              sociedadId={table.sociedadId}
              destinosTesoreria={table.destinosTesoreria}
              tesoreriaDestino={table.tesoreriaDestino}
              onDestinoChange={table.onDestinoChange}
              onDecision={table.onDecision}
              onAccionTesoreria={table.onAccionTesoreria}
              labels={table.labelsDocumentos}
            />
          )}
          {table.activeTab === 'unificada' && (
            <>
              <TramiteUnificadaHeader
                tramiteId={tramite.id}
                sociedadLabel={table.sociedadLabel}
                totalDocs={table.resumenTotales.totalDocs}
                totalMonto={formatAmount(table.resumenTotales.suma)}
                resumenMoneda={table.resumenMoneda}
                actions={table.documentosActivos.length > 0 ? (
                  <>
                    <button type="button" className="btn btn-sm btn-outline-secondary" onClick={handleExpandAllDocs}>
                      Expandir todo
                    </button>
                    <button type="button" className="btn btn-sm btn-outline-secondary" onClick={handleCollapseAllDocs}>
                      Colapsar todo
                    </button>
                  </>
                ) : null}
                labels={table.labelsUnificada}
              />
              <div className="p-3 tramite-unificada-list">
                {table.documentosActivos.map((doc, index) => (
                  <TramiteDocumentoUnificado
                    key={doc.factura_id}
                    doc={doc}
                    pdfUrl={getPdfUrl(doc.ruta_pdf)}
                    sequenceNumber={index + 1}
                    expanded={expandedDocIds.has(Number(doc.factura_id))}
                    onToggleExpanded={() => handleToggleExpandedDoc(Number(doc.factura_id))}
                    enEtapaGerencia={enEtapaGerencia}
                    puedeVerGerencia={puedeVerGerencia}
                    puedeGerencia={puedeGerencia}
                    puedeGerenciaContable={puedeGerenciaContable}
                    puedeFinanciera={puedeFinanciera}
                    puedeTesoreria={puedeTesoreria}
                    sociedadId={table.sociedadId}
                    destinosTesoreria={table.destinosTesoreria}
                    destinoSeleccionado={table.tesoreriaDestino[doc.factura_id]}
                    onDestinoChange={table.onDestinoChange}
                    onDecision={table.onDecision}
                    onAccionTesoreria={table.onAccionTesoreria}
                  />
                ))}
                {table.documentosActivos.length === 0 && (
                  <EmptyState className="text-center py-2">
                    {table.labelsDocumentos.emptyActivos}
                  </EmptyState>
                )}
              </div>
            </>
          )}
        </div>
      </SectionCard>
    </div>
  );
}

export default TramiteDetalleLayout;
