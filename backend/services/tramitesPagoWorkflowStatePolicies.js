const { TRAMITE_ESTADOS, TESORERIA_ESTADOS, TRAMITE_ACCIONES } = require('../domain/tramitesPago');
const { PERMISSIONS } = require('../domain/permissions');
const { validatePagadoSinRechazos } = require('./tramitesPagoRules');
const { createError, throwIfValidationError } = require('../utils/errors');
const { ensureEtapaReadyForAdvance } = require('./tramitesPagoGerenciaAprobaciones');
const { summarizeStoredTramiteCaratula } = require('./tramitesPagoCaratulasSupport');
const {
  normalizePagosDocumentos,
  buildSaldosByFactura,
  validatePagosInputBySaldos,
  registrarPagosPrincipales
} = require('./tramitesPagoUseCases.helpers');
const { permissionsService } = require('./permissionsService');

const NO_OP_STATE_POLICY = Object.freeze({
  validateBeforeUpdate: async () => {},
  runAfterUpdate: async () => {}
});

const validateTramiteCaratulasReady = async ({ tramitesPagoRepo, tramiteId, client }) => {
  const [caratulaRow, documents] = await Promise.all([
    tramitesPagoRepo.getTramiteCaratulaByTramiteId(tramiteId, client),
    tramitesPagoRepo.listDocumentosByTramite(tramiteId, client)
  ]);

  if (!caratulaRow) {
    throw createError(400, 'Debe cargar las caratulas del tramite antes de continuar');
  }

  const summary = summarizeStoredTramiteCaratula({
    row: caratulaRow,
    documents
  });
  const caratula = summary.caratula;

  if (!caratula) {
    throw createError(400, 'Debe cargar las caratulas del tramite antes de continuar');
  }

  if (caratula.estado === 'sociedad_invalida') {
    const societyWarning = summary.warnings.find((warning) => /^Caratulas no corresponden a sociedad/i.test(warning));
    throw createError(400, societyWarning || 'Caratulas no corresponden a la sociedad seleccionada');
  }

  if (Number(caratula.unresolved_groups_count || 0) > 0 || Number(caratula.unresolved_lines_count || 0) > 0) {
    const blockingWarning = summary.warnings.find(Boolean);
    throw createError(400, blockingWarning || 'Debe resolver todas las caratulas del tramite antes de continuar');
  }
};

const createStageAdvanceValidationPolicy = ({ tramitesPagoRepo, etapa }) => ({
  validateBeforeUpdate: async ({ tramiteId, sameNormalized, client }) => {
    if (sameNormalized) {
      return;
    }

    await ensureEtapaReadyForAdvance({
      tramitesPagoRepo,
      tramiteId,
      etapa,
      client
    });

    if (etapa === 'gerencia') {
      await validateTramiteCaratulasReady({
        tramitesPagoRepo,
        tramiteId,
        client
      });
    }
  },
  runAfterUpdate: async () => {}
});

const createPagadoStatePolicy = ({ tramitesPagoRepo }) => ({
  validateBeforeUpdate: async ({ tramiteId, sameNormalized, actorPermissions, client }) => {
    if (sameNormalized) {
      return;
    }

    if (!permissionsService.hasPermission(actorPermissions, PERMISSIONS.DOCUMENTOS_TRAMITAR_PAGO)) {
      throw createError(403, `Permiso requerido: ${PERMISSIONS.DOCUMENTOS_TRAMITAR_PAGO}`);
    }

    await ensureEtapaReadyForAdvance({
      tramitesPagoRepo,
      tramiteId,
      etapa: 'financiera',
      client
    });

    const totalRechazados = await tramitesPagoRepo.countRechazadosActivos(tramiteId, client);
    throwIfValidationError(validatePagadoSinRechazos(totalRechazados));
  },
  runAfterUpdate: async ({ tramiteId, usuario, pagosDocumentos, client }) => {
    const saldosRows = await tramitesPagoRepo.listSaldosPagoPrincipalByTramite(tramiteId, client);
    const saldosByFactura = buildSaldosByFactura(saldosRows);
    const pagosInput = normalizePagosDocumentos(pagosDocumentos);
    validatePagosInputBySaldos(pagosInput, saldosByFactura);

    await registrarPagosPrincipales({
      tramitesPagoRepo,
      tramiteId,
      usuario,
      pagosInput,
      saldosByFactura,
      client
    });

    const facturaStateRows = await tramitesPagoRepo.updateFacturasEstadoPorSaldoByTramite(tramiteId, client);
    for (const row of facturaStateRows) {
      if (!row?.id || row.estado_anterior === row.estado_nuevo) {
        continue;
      }

      await tramitesPagoRepo.insertHistorialDocumentoConEstados({
        tramiteId,
        facturaId: row.id,
        accion: TRAMITE_ACCIONES.CAMBIAR_ESTADO,
        estadoAnterior: row.estado_anterior,
        estadoNuevo: row.estado_nuevo,
        usuario,
        motivo: null
      }, client);
    }

    await tramitesPagoRepo.applyRetencionesPagadasByTramite({
      tramiteId,
      usuario
    }, client);
    await tramitesPagoRepo.updateDocumentosTesoreriaEstadoByTramite({
      tramiteId,
      estadoTesoreria: TESORERIA_ESTADOS.PAGADO
    }, client);
    await tramitesPagoRepo.updateRetencionesTesoreriaEstadoByTramite({
      tramiteId,
      estadoTesoreria: TESORERIA_ESTADOS.PAGADO
    }, client);
  }
});

const createCambioEstadoPolicies = ({ tramitesPagoRepo }) => Object.freeze({
  [TRAMITE_ESTADOS.EN_APROBACION_GERENCIA_CONTABLE]: createStageAdvanceValidationPolicy({
    tramitesPagoRepo,
    etapa: 'gerencia'
  }),
  [TRAMITE_ESTADOS.EN_APROBACION_GERENCIA_FINANCIERA]: createStageAdvanceValidationPolicy({
    tramitesPagoRepo,
    etapa: 'gerencia_contable'
  }),
  [TRAMITE_ESTADOS.EN_REVISION_TESORERIA_2]: createStageAdvanceValidationPolicy({
    tramitesPagoRepo,
    etapa: 'financiera'
  }),
  [TRAMITE_ESTADOS.PAGADO]: createPagadoStatePolicy({ tramitesPagoRepo })
});

const resolveCambioEstadoPolicy = ({ policies, estadoDestino }) => (
  policies[estadoDestino] || NO_OP_STATE_POLICY
);

module.exports = {
  createCambioEstadoPolicies,
  resolveCambioEstadoPolicy
};
