import { useState } from 'react';
import { formatAmount } from '../../utils/formatters';
import { estadoLabelTramite, estadoClassTramite } from '../../utils/estadosTramite';
import PageHeader from '../common/PageHeader';
import ActionAlerts from '../common/ActionAlerts';
import EmptyState from '../common/EmptyState';
import SectionCard from '../common/SectionCard';
import TramiteMeta from '../TramiteMeta';
import TramiteUnificadaHeader from '../TramiteUnificadaHeader';
import TramiteDocumentosTable from '../TramiteDocumentosTable';
import TramiteHistorial from '../TramiteHistorial';
import TramiteHeaderActions from '../TramiteHeaderActions';
import TramiteTabs from '../TramiteTabs';
import TramitePagosSection from './TramitePagosSection';
import TramiteRetencionesSection from './TramiteRetencionesSection';
import TramiteCaratulasSection from './TramiteCaratulasSection.jsx';
import TramiteProveedorGroup from './TramiteProveedorGroup.jsx';

function TramiteDetalleLayout({ layoutProps }) {
  const {
    header,
    tabs,
    alerts,
    historial,
    meta,
    pagos,
    retenciones,
    caratulas,
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
  const [allProviderPdfsExpanded, setAllProviderPdfsExpanded] = useState(true);
  const [globalPdfExpansionVersion, setGlobalPdfExpansionVersion] = useState(0);

  const applyGlobalPdfExpansion = (expanded) => {
    setAllProviderPdfsExpanded(Boolean(expanded));
    setGlobalPdfExpansionVersion((prev) => prev + 1);
  };

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
            canExportReport={header.canExportReport}
            exportReportLoading={header.exportReportLoading}
            historialVisible={header.historialVisible}
            onExportReport={header.onExportReport}
            onToggleHistorial={header.onToggleHistorial}
            labels={header.labels}
          />
        )}
      />

      <TramiteTabs activeTab={tabs.activeTab} onChange={tabs.onChange} labels={tabs.labels} />

      <ActionAlerts error={alerts.error} message={alerts.message} />
      <ActionAlerts error={alerts.reportError} message={alerts.reportMessage} />

      {historial.visible && (
        <TramiteHistorial
          historial={historial.historial}
          historialError={historial.historialError}
          labels={historial.labels}
        />
      )}

      <SectionCard className="table-card tramite-detail-card" bodyClassName="tramite-detail-card-body">
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

      <TramiteCaratulasSection caratulasProps={caratulas} />

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
                actions={table.providerGroups.length > 0 ? (
                  <>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-primary"
                      onClick={() => applyGlobalPdfExpansion(true)}
                    >
                      {table.labelsUnificada?.expandAllPdfs || 'Expandir todos los PDFs'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary"
                      onClick={() => applyGlobalPdfExpansion(false)}
                    >
                      {table.labelsUnificada?.collapseAllPdfs || 'Ocultar todos los PDFs'}
                    </button>
                  </>
                ) : null}
                labels={table.labelsUnificada}
              />
              <div className="p-3 tramite-unificada-list">
                {table.providerGroups.map((group) => (
                  <TramiteProveedorGroup
                    key={group.group_key}
                    group={group}
                    labels={caratulas.labels}
                    defaultExpanded
                    globalPdfExpanded={allProviderPdfsExpanded}
                    globalPdfExpansionVersion={globalPdfExpansionVersion}
                    canManage={caratulas.permisos?.puedeTesoreria && tramite.estado === 'en_revision_tesoreria_1'}
                    canResolve={caratulas.permisos?.puedeTesoreria && tramite.estado === 'en_revision_tesoreria_1'}
                    onResolveGroup={caratulas.onResolveCaratulas}
                    resolving={caratulas.resolvingCaratulaGroupKey === group.group_key}
                    onConfirmOrder={caratulas.onConfirmProviderOrder}
                    confirmingOrder={caratulas.confirmingOrderProviderKey === (group.provider_key || group.group_key)}
                    onUploadProviderCaratula={caratulas.onUploadProviderCaratula}
                    uploadingProvider={caratulas.uploadingProviderKey === (group.provider_key || group.group_key)}
                    onConfirmProviderCaratula={caratulas.onConfirmProviderCaratula}
                    confirmingProvider={caratulas.confirmingProviderKey === (group.provider_key || group.group_key)}
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
                  />
                ))}
                {table.providerGroups.length === 0 && (
                  <EmptyState className="text-center py-2">
                    {caratulas.labels.noGroups}
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
