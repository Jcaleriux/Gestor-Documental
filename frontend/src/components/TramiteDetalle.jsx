import { useParams } from 'react-router-dom';
import { useTramiteDetalle } from '../hooks/useTramiteDetalle';
import { formatAmount } from '../utils/formatters';
import { estadoLabelTramite, estadoClassTramite } from '../utils/estadosTramite';
import getPermisosTramite from '../utils/tramitePermissions';
import TRAMITE_LABELS from '../utils/tramiteLabels';
import { LOADING_LABELS } from '../utils/uiLabels';
import {
  ESTADOS_TRAMITE,
  ROLES_ADMIN,
  DESTINOS_TESORERIA
} from '../utils/tramiteConfig';
import PageHeader from './common/PageHeader';
import LoadingState from './common/LoadingState';
import ActionAlerts from './common/ActionAlerts';
import EmptyState from './common/EmptyState';
import SectionCard from './common/SectionCard';
import TramiteMeta from './TramiteMeta';
import TramiteDocumentoUnificado from './TramiteDocumentoUnificado';
import TramiteUnificadaHeader from './TramiteUnificadaHeader';
import TramiteDocumentosTable from './TramiteDocumentosTable';
import TramiteHistorial from './TramiteHistorial';
import TramiteOverrideForm from './TramiteOverrideForm';
import TramiteHeaderActions from './TramiteHeaderActions';
import TramiteTabs from './TramiteTabs';
import useTramiteResumen from '../hooks/useTramiteResumen';
import { withAuthToken } from '../utils/auth';
import { useTramiteWorkflowActions } from '../hooks/tramiteDetalle/useTramiteWorkflowActions';
import TramitePagosSection from './tramiteDetalle/TramitePagosSection';
import TramiteRetencionesSection from './tramiteDetalle/TramiteRetencionesSection';

const getPdfUrl = (rutaPdf) => (
  rutaPdf ? withAuthToken(`/api/files/pdf?path=${encodeURIComponent(rutaPdf)}`) : ''
);

function TramiteDetalle({ sociedadId }) {
  const { id } = useParams();
  const {
    tramite,
    documentos,
    retenciones,
    loading,
    actionMessage,
    setActionMessage,
    actionError,
    setActionError,
    historial,
    historialError,
    fetchDetalle,
    fetchHistorial,
    sociedadInfo
  } = useTramiteDetalle({ id, sociedadId });

  const { documentosActivos, retencionesActivas, resumenTotales, resumenMoneda } = useTramiteResumen(documentos, retenciones);

  const {
    rolActivo,
    setRolActivo,
    historialVisible,
    setHistorialVisible,
    overrideEstado,
    setOverrideEstado,
    overrideMotivo,
    setOverrideMotivo,
    overrideUser,
    setOverrideUser,
    overrideError,
    tesoreriaDestino,
    pagosFacturas,
    activeTab,
    setActiveTab,
    accionSiguiente,
    handleDecision,
    handleAccionTesoreria,
    handleOverrideEstado,
    handleTesoreriaDestinoChange,
    handlePagoFacturaChange,
    handleAccionSiguiente
  } = useTramiteWorkflowActions({
    id,
    tramite,
    documentosActivos,
    fetchDetalle,
    fetchHistorial,
    setActionMessage,
    setActionError
  });

  if (!sociedadId) {
    return <p>Seleccione una sociedad para ver el tramite.</p>;
  }

  if (loading) return <LoadingState label={LOADING_LABELS.tramiteDetalle} />;

  if (!tramite) return <p>No se encontro el tramite.</p>;

  const {
    puedeGerencia,
    puedeGerenciaContable,
    puedeFinanciera,
    puedeTesoreria
  } = getPermisosTramite({ rolActivo, estado: tramite.estado });

  const sociedadLabel = sociedadInfo?.nombre_proyecto || sociedadInfo?.razon_social || sociedadId || '-';

  return (
    <div className="documents-page">
      <PageHeader
        title={`${TRAMITE_LABELS.pageTitle} #${tramite.id}`}
        subtitle={TRAMITE_LABELS.pageSubtitle}
        actionsClassName="tramite-actions"
        actions={(
          <TramiteHeaderActions
            accionSiguiente={accionSiguiente}
            onAccionSiguiente={handleAccionSiguiente}
            historialVisible={historialVisible}
            onToggleHistorial={() => setHistorialVisible((prev) => !prev)}
            rolActivo={rolActivo}
            onRolChange={setRolActivo}
            roles={ROLES_ADMIN}
            labels={TRAMITE_LABELS.headerActions}
          />
        )}
      />

      <TramiteTabs activeTab={activeTab} onChange={setActiveTab} labels={TRAMITE_LABELS.tabs} />

      <ActionAlerts error={actionError} message={actionMessage} />

      {historialVisible && (
        <TramiteHistorial
          historial={historial}
          historialError={historialError}
          labels={TRAMITE_LABELS.historial}
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
        visible={accionSiguiente?.estado === 'pagado' && documentosActivos.length > 0}
        documentosActivos={documentosActivos}
        pagosFacturas={pagosFacturas}
        onPagoFacturaChange={handlePagoFacturaChange}
      />

      <TramiteRetencionesSection retencionesActivas={retencionesActivas} />

      <TramiteOverrideForm
        estados={ESTADOS_TRAMITE.map((estado) => ({
          value: estado,
          label: estadoLabelTramite(estado)
        }))}
        overrideUser={overrideUser}
        overrideEstado={overrideEstado}
        overrideMotivo={overrideMotivo}
        overrideError={overrideError}
        onUserChange={setOverrideUser}
        onEstadoChange={setOverrideEstado}
        onMotivoChange={setOverrideMotivo}
        onSubmit={handleOverrideEstado}
        labels={TRAMITE_LABELS.override}
      />

      <SectionCard className="table-card" bodyClassName="p-0">
        <div className="table-responsive">
          {activeTab === 'individual' && (
            <TramiteDocumentosTable
              documentos={documentos}
              puedeGerencia={puedeGerencia}
              puedeGerenciaContable={puedeGerenciaContable}
              puedeFinanciera={puedeFinanciera}
              puedeTesoreria={puedeTesoreria}
              destinosTesoreria={DESTINOS_TESORERIA}
              tesoreriaDestino={tesoreriaDestino}
              onDestinoChange={handleTesoreriaDestinoChange}
              onDecision={handleDecision}
              onAccionTesoreria={handleAccionTesoreria}
              labels={TRAMITE_LABELS.documentos}
            />
          )}
          {activeTab === 'unificada' && (
            <>
              <TramiteUnificadaHeader
                tramiteId={tramite.id}
                sociedadLabel={sociedadLabel}
                totalDocs={resumenTotales.totalDocs}
                totalMonto={formatAmount(resumenTotales.suma)}
                resumenMoneda={resumenMoneda}
                labels={TRAMITE_LABELS.unificada}
              />
              <div className="p-3">
                {documentosActivos.map((doc, index) => (
                  <TramiteDocumentoUnificado
                    key={doc.factura_id}
                    doc={doc}
                    pdfUrl={getPdfUrl(doc.ruta_pdf)}
                    offset={index * 14}
                    puedeGerencia={puedeGerencia}
                    puedeGerenciaContable={puedeGerenciaContable}
                    puedeFinanciera={puedeFinanciera}
                    puedeTesoreria={puedeTesoreria}
                    destinosTesoreria={DESTINOS_TESORERIA}
                    destinoSeleccionado={tesoreriaDestino[doc.factura_id]}
                    onDestinoChange={handleTesoreriaDestinoChange}
                    onDecision={handleDecision}
                    onAccionTesoreria={handleAccionTesoreria}
                  />
                ))}
                {documentosActivos.length === 0 && (
                  <EmptyState className="text-center py-2">
                    {TRAMITE_LABELS.documentos.emptyActivos}
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

export default TramiteDetalle;
