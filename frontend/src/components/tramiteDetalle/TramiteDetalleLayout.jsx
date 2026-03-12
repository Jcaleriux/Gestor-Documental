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
import TramiteOverrideForm from '../TramiteOverrideForm';
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
    override,
    table
  } = layoutProps;

  const { tramite, resumenTotales, resumenMoneda } = meta;
  const {
    puedeGerencia,
    puedeGerenciaContable,
    puedeFinanciera,
    puedeTesoreria
  } = table.permisos;

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
            rolActivo={header.rolActivo}
            onRolChange={header.onRolChange}
            roles={header.roles}
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

      <TramiteRetencionesSection retencionesActivas={retenciones.retencionesActivas} />

      <TramiteOverrideForm
        estados={override.estados}
        overrideUser={override.overrideUser}
        overrideEstado={override.overrideEstado}
        overrideMotivo={override.overrideMotivo}
        overrideError={override.overrideError}
        onUserChange={override.onUserChange}
        onEstadoChange={override.onEstadoChange}
        onMotivoChange={override.onMotivoChange}
        onSubmit={override.onSubmit}
        labels={override.labels}
      />

      <SectionCard className="table-card" bodyClassName="p-0">
        <div className="table-responsive">
          {table.activeTab === 'individual' && (
            <TramiteDocumentosTable
              documentos={table.documentos}
              puedeGerencia={puedeGerencia}
              puedeGerenciaContable={puedeGerenciaContable}
              puedeFinanciera={puedeFinanciera}
              puedeTesoreria={puedeTesoreria}
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
                labels={table.labelsUnificada}
              />
              <div className="p-3">
                {table.documentosActivos.map((doc, index) => (
                  <TramiteDocumentoUnificado
                    key={doc.factura_id}
                    doc={doc}
                    pdfUrl={getPdfUrl(doc.ruta_pdf)}
                    offset={index * 14}
                    puedeGerencia={puedeGerencia}
                    puedeGerenciaContable={puedeGerenciaContable}
                    puedeFinanciera={puedeFinanciera}
                    puedeTesoreria={puedeTesoreria}
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
