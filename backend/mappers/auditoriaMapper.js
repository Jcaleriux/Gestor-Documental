const { FACTURA_ESTADOS } = require('../domain/facturas');
const { TRAMITE_ESTADOS } = require('../domain/tramitesPago');

const FACTURA_ESTADO_LABELS = Object.freeze({
  [FACTURA_ESTADOS.NO_CONTABILIZADO]: 'No contabilizado',
  [FACTURA_ESTADOS.CONTABILIZADO]: 'Contabilizado',
  [FACTURA_ESTADOS.EN_REVISION]: 'En revision',
  [FACTURA_ESTADOS.EN_TRAMITE_PAGO]: 'En tramite de pago',
  [FACTURA_ESTADOS.PAGADO_PARCIALMENTE]: 'Pagado parcialmente',
  rechazado: 'Rechazado',
  en_aprobacion: 'En aprobacion',
  [FACTURA_ESTADOS.PAGADO]: 'Pagado'
});

const TRAMITE_ESTADO_LABELS = Object.freeze({
  [TRAMITE_ESTADOS.EN_APROBACION_GERENCIA]: 'Aprobacion gerencia',
  [TRAMITE_ESTADOS.EN_APROBACION_GERENCIA_CONTABLE]: 'Aprobacion gerencia contable',
  [TRAMITE_ESTADOS.EN_APROBACION_GERENCIA_FINANCIERA]: 'Aprobacion gerencia financiera',
  [TRAMITE_ESTADOS.EN_REVISION_TESORERIA]: 'Revision tesoreria',
  [TRAMITE_ESTADOS.EN_REVISION_TESORERIA_1]: 'Revision tesoreria',
  [TRAMITE_ESTADOS.EN_REVISION_TESORERIA_2]: 'Tesoreria para pago',
  [TRAMITE_ESTADOS.PAGADO]: 'Pagado',
  [TRAMITE_ESTADOS.CANCELADO]: 'Cancelado'
});

const DECISION_LABELS = Object.freeze({
  aprobado: 'Aprobado',
  rechazado: 'Rechazado',
  pendiente: 'Pendiente'
});

const toNonEmptyString = (value) => {
  const normalized = String(value || '').trim();
  return normalized || '';
};

const formatFacturaEstado = (value) => (
  FACTURA_ESTADO_LABELS[value] || toNonEmptyString(value).replace(/_/g, ' ') || 'Sin estado'
);

const formatTramiteEstado = (value) => (
  TRAMITE_ESTADO_LABELS[value] || toNonEmptyString(value).replace(/_/g, ' ') || 'Sin estado'
);

const formatDecisionLabel = (value) => (
  DECISION_LABELS[value] || toNonEmptyString(value).replace(/_/g, ' ') || 'Sin decision'
);

const resolveActorLabel = (...values) => values.map(toNonEmptyString).find(Boolean) || '';

const buildTimelineEvent = ({
  id,
  tipo,
  categoria,
  titulo,
  descripcion = '',
  usuario = '',
  creado_en = null,
  motivo = '',
  referencia = '',
  monto = null,
  moneda = '',
  sort_at = null
}) => ({
  id,
  tipo,
  categoria,
  titulo,
  descripcion,
  usuario,
  creado_en,
  motivo,
  referencia,
  monto,
  moneda,
  sort_at: sort_at || creado_en || null
});

const buildEstadoTitle = (estadoNuevo) => {
  switch (estadoNuevo) {
    case FACTURA_ESTADOS.CONTABILIZADO:
      return 'Factura contabilizada';
    case FACTURA_ESTADOS.EN_REVISION:
      return 'Factura en revision';
    case FACTURA_ESTADOS.EN_TRAMITE_PAGO:
      return 'Factura enviada a tramite de pago';
    case FACTURA_ESTADOS.PAGADO_PARCIALMENTE:
      return 'Factura con pago parcial';
    case FACTURA_ESTADOS.PAGADO:
      return 'Factura marcada como pagada';
    default:
      return `Estado actualizado a ${formatFacturaEstado(estadoNuevo)}`;
  }
};

const buildTransitionDescription = (estadoAnterior, estadoNuevo, formatter) => {
  const previous = toNonEmptyString(estadoAnterior);
  const next = toNonEmptyString(estadoNuevo);

  if (previous && next) {
    return `${formatter(previous)} -> ${formatter(next)}`;
  }

  if (next) {
    return formatter(next);
  }

  if (previous) {
    return formatter(previous);
  }

  return '';
};

const isFacturaState = (value) => Object.prototype.hasOwnProperty.call(FACTURA_ESTADO_LABELS, value);

const humanizeAction = (value) => toNonEmptyString(value).replace(/_/g, ' ') || 'accion';

const buildTramiteHistorialTitle = (row) => {
  switch (row.accion) {
    case 'tesoreria_excluir':
      return 'Documento excluido en tesoreria';
    case 'tesoreria_devolver_contabilidad':
      return 'Documento devuelto a contabilidad';
    case 'tesoreria_reenviar':
      return row.estado_nuevo
        ? `Documento reenviado a ${formatTramiteEstado(row.estado_nuevo)}`
        : 'Documento reenviado por tesoreria';
    case 'tesoreria_reincluir':
      return 'Documento reincluido por tesoreria';
    case 'devolver_tesoreria':
      return 'Documento devuelto a tesoreria';
    case 'decision_gerencia_contable':
      return row.estado_nuevo
        ? `${formatDecisionLabel(row.estado_nuevo)} por gerencia contable`
        : 'Decision de gerencia contable registrada';
    case 'decision_financiera':
      return row.estado_nuevo
        ? `${formatDecisionLabel(row.estado_nuevo)} por gerencia financiera`
        : 'Decision de gerencia financiera registrada';
    case 'decision_gerencia':
      return row.estado_nuevo
        ? `${formatDecisionLabel(row.estado_nuevo)} por gerencia`
        : 'Decision de gerencia registrada';
    case 'cambiar_estado':
    case 'override_estado':
      return isFacturaState(row.estado_nuevo)
        ? buildEstadoTitle(row.estado_nuevo)
        : `Estado de tramite actualizado a ${formatTramiteEstado(row.estado_nuevo)}`;
    default:
      return `Evento de tramite: ${humanizeAction(row.accion)}`;
  }
};

const buildTramiteHistorialDescription = (row) => {
  if (row.accion === 'cambiar_estado' || row.accion === 'override_estado') {
    if (isFacturaState(row.estado_nuevo) || isFacturaState(row.estado_anterior)) {
      return buildTransitionDescription(row.estado_anterior, row.estado_nuevo, formatFacturaEstado);
    }

    return buildTransitionDescription(row.estado_anterior, row.estado_nuevo, formatTramiteEstado);
  }

  if (row.estado_anterior || row.estado_nuevo) {
    return buildTransitionDescription(row.estado_anterior, row.estado_nuevo, formatTramiteEstado);
  }

  return row.tramite_id ? `Tramite #${row.tramite_id}` : '';
};

const resolveTramiteHistorialCategory = (accion) => {
  if (accion.startsWith('tesoreria_') || accion === 'devolver_tesoreria') {
    return 'tesoreria';
  }

  if (accion.startsWith('decision_')) {
    return 'aprobacion';
  }

  if (accion === 'cambiar_estado' || accion === 'override_estado') {
    return 'estado';
  }

  return 'tramite';
};

const mapAuditoriaRow = (row) => ({ ...row });

const mapEstadoDocumentoRow = (row) => ({ ...row });

const mapEstadoDocumentoTimelineRow = (row) => buildTimelineEvent({
  id: `estado-${row.id}`,
  tipo: 'estado_documento',
  categoria: 'estado',
  titulo: buildEstadoTitle(row.estado_nuevo),
  descripcion: buildTransitionDescription(row.estado_anterior, row.estado_nuevo, formatFacturaEstado),
  usuario: resolveActorLabel(row.usuario),
  creado_en: row.creado_en,
  motivo: row.motivo || '',
  referencia: '',
});

const mapTramiteHistorialTimelineRow = (row) => {
  if (row.accion === 'decision_gerencia' && !row.estado_nuevo) {
    return null;
  }

  return buildTimelineEvent({
    id: `tramite-h-${row.id}`,
    tipo: 'tramite_historial',
    categoria: resolveTramiteHistorialCategory(row.accion || ''),
    titulo: buildTramiteHistorialTitle(row),
    descripcion: buildTramiteHistorialDescription(row),
    usuario: resolveActorLabel(row.usuario),
    creado_en: row.creado_en,
    motivo: row.motivo || '',
    referencia: row.tramite_id ? `Tramite #${row.tramite_id}` : '',
  });
};

const mapGerenciaAprobacionTimelineRow = (row) => {
  const actorLabel = resolveActorLabel(
    row.usuario_aprobador_nombre,
    row.usuario_aprobador_email,
    row.usuario_aprobador_id ? `Usuario ${row.usuario_aprobador_id}` : ''
  );

  return buildTimelineEvent({
    id: `aprobacion-${row.id}`,
    tipo: 'aprobacion_gerencia',
    categoria: 'aprobacion',
    titulo: row.estado_gerencia === 'rechazado'
      ? 'Rechazo de gerencia registrado'
      : 'Aprobacion de gerencia registrada',
    descripcion: actorLabel,
    usuario: actorLabel,
    creado_en: row.decision_en || row.actualizado_en || row.creado_en,
    motivo: row.motivo_gerencia || '',
    referencia: row.tramite_id ? `Tramite #${row.tramite_id}` : '',
    sort_at: row.decision_en || row.actualizado_en || row.creado_en || null
  });
};

const mapTramiteDocumentoLinkTimelineRow = (row) => buildTimelineEvent({
  id: `tramite-doc-${row.id}`,
  tipo: 'tramite_documento',
  categoria: 'tramite',
  titulo: `Incluida en tramite #${row.tramite_id}`,
  descripcion: [
    row.tramite_estado ? `Etapa inicial: ${formatTramiteEstado(row.tramite_estado)}` : '',
    row.estado_factura_origen ? `Estado origen: ${formatFacturaEstado(row.estado_factura_origen)}` : ''
  ].filter(Boolean).join(' - '),
  usuario: resolveActorLabel(row.tramite_creado_por),
  creado_en: row.tramite_creado_en || row.actualizado_en,
  motivo: '',
  referencia: `Tramite #${row.tramite_id}`,
  sort_at: row.tramite_creado_en || row.actualizado_en || null
});

const mapPagoFacturaTimelineRow = (row) => buildTimelineEvent({
  id: `pago-principal-${row.id}`,
  tipo: 'pago_principal',
  categoria: 'pago',
  titulo: 'Pago principal registrado',
  descripcion: row.tramite_id ? `Tramite #${row.tramite_id}` : 'Pago registrado manualmente',
  usuario: resolveActorLabel(row.usuario),
  creado_en: row.fecha_pago || row.creado_en,
  motivo: row.notas || '',
  referencia: row.tramite_id ? `Tramite #${row.tramite_id}` : '',
  monto: Number(row.monto || 0),
  moneda: row.moneda || '',
  sort_at: row.creado_en || row.fecha_pago || null
});

const mapRetencionPagoTimelineRow = (row) => buildTimelineEvent({
  id: `pago-retencion-${row.id}`,
  tipo: 'pago_retencion',
  categoria: 'retencion',
  titulo: 'Pago de retencion registrado',
  descripcion: row.contabilizacion_id
    ? `Contabilizacion #${row.contabilizacion_id}`
    : 'Pago de retencion',
  usuario: resolveActorLabel(row.usuario),
  creado_en: row.fecha_pago || row.creado_en,
  motivo: row.notas || '',
  referencia: '',
  monto: Number(row.monto || 0),
  moneda: row.moneda || '',
  sort_at: row.creado_en || row.fecha_pago || null
});

module.exports = {
  mapAuditoriaRow,
  mapEstadoDocumentoRow,
  mapEstadoDocumentoTimelineRow,
  mapTramiteHistorialTimelineRow,
  mapGerenciaAprobacionTimelineRow,
  mapTramiteDocumentoLinkTimelineRow,
  mapPagoFacturaTimelineRow,
  mapRetencionPagoTimelineRow
};
