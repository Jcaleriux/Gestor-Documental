const {
  normalizeEstado,
  validateDecisionDocumentoInput,
  validateCambioEstadoInput,
  validateTransicion
} = require('./tramitesPagoRules');
const { TRAMITE_ACCIONES, DOCUMENTO_DECISIONES, DOCUMENTO_ESTADOS } = require('../domain/tramitesPago');
const { createError, assertFound, throwIfValidationError } = require('../utils/errors');
const {
  normalizeUniquePositiveIds,
  parsePositiveIntOrThrow,
  toNormalizedLowerString
} = require('./tramitesPagoUseCases.helpers');
const {
  createCambioEstadoPolicies,
  resolveCambioEstadoPolicy
} = require('./tramitesPagoWorkflowStatePolicies');
const {
  createDecisionDocumentoPolicies,
  resolveDecisionDocumentoPolicy
} = require('./tramitesPagoWorkflowDecisionPolicies');
const { resolveEtapaDecisionPolicy } = require('./tramitesPagoWorkflowEtapaPolicies');
const { createTramiteWithPolicies } = require('./tramitesPagoWorkflowCreatePolicies');
const {
  ensureGerenciaApprovalSnapshots,
  validateGerenciaApproverActor,
  buildApprovalSummary,
  maybeAdvanceTramiteByStageApproval
} = require('./tramitesPagoGerenciaAprobaciones');
const { PERMISSIONS } = require('../domain/permissions');
const { permissionsService } = require('./permissionsService');

const ETAPA_LABELS = Object.freeze({
  gerencia: 'gerencia',
  gerencia_contable: 'gerencia contable',
  financiera: 'gerencia financiera'
});

const assertDocumentoPendienteEnEtapa = ({ documento, columnas, etapa }) => {
  assertFound(documento, 'Documento no encontrado en tramite');

  if (documento[columnas.estado] !== DOCUMENTO_ESTADOS.PENDIENTE) {
    throw createError(
      409,
      `Este documento ya no tiene una decision pendiente en ${ETAPA_LABELS[etapa] || etapa}`
    );
  }
};

const createTramitesPagoWorkflowUseCases = ({ tramitesPagoRepo, runInTransaction, policyRegistry }) => {
  const cambioEstadoPolicies = createCambioEstadoPolicies({ tramitesPagoRepo });
  const decisionDocumentoPolicies = createDecisionDocumentoPolicies({ tramitesPagoRepo });
  const resolveCreateItemPolicy = policyRegistry?.workflow?.resolveCreateItemPolicy;
  const resolveEstadoPolicy = policyRegistry?.workflow?.resolveEstadoPolicy
    || ((estadoDestino) => resolveCambioEstadoPolicy({
      policies: cambioEstadoPolicies,
      estadoDestino
    }));
  const resolveEtapaPolicy = policyRegistry?.workflow?.resolveEtapaPolicy || resolveEtapaDecisionPolicy;
  const resolveDecisionPolicy = policyRegistry?.workflow?.resolveDecisionPolicy
    || (({ decision, etapa }) => resolveDecisionDocumentoPolicy({
      policies: decisionDocumentoPolicies,
      decision,
      etapa
    }));

  const crearTramite = async ({ sociedad_id, factura_ids, retencion_factura_ids, usuario }) => {
    const facturaIds = normalizeUniquePositiveIds(factura_ids);
    const retencionFacturaIds = normalizeUniquePositiveIds(retencion_factura_ids);

    if (facturaIds.length === 0 && retencionFacturaIds.length === 0) {
      throw createError(400, 'Seleccione al menos una factura o una retencion');
    }

    return runInTransaction(async (client) => {
      const sociedadInput = sociedad_id !== undefined && sociedad_id !== null && sociedad_id !== ''
        ? Number(sociedad_id)
        : null;

      return createTramiteWithPolicies({
        tramitesPagoRepo,
        itemEntries: [
          { type: 'facturas', ids: facturaIds },
          { type: 'retenciones', ids: retencionFacturaIds }
        ].filter((entry) => entry.ids.length > 0),
        resolveItemPolicy: resolveCreateItemPolicy,
        sociedadInput,
        usuario,
        client
      });
    });
  };

  const cambiarEstado = async ({ id, estado, usuario, motivo, force, pagos_documentos, actorPermissions }) => {
    const tramiteId = parsePositiveIntOrThrow(id, 'id');
    const estadoNormalizadoInput = toNormalizedLowerString(estado);
    const estadoCheck = validateCambioEstadoInput(estadoNormalizadoInput, force, motivo);
    throwIfValidationError(estadoCheck);
    const { estadoNormalizado } = estadoCheck;
    const estadoPolicy = resolveEstadoPolicy(estadoNormalizado);

    return runInTransaction(async (client) => {
      const tramite = await tramitesPagoRepo.getTramiteById(tramiteId, client);
      assertFound(tramite, 'Tramite no encontrado');

      const actualRaw = tramite.estado;
      const actual = normalizeEstado(actualRaw);
      const sameNormalized = actual === estadoNormalizado;
      if (sameNormalized && actualRaw === estadoNormalizado) {
        return tramite;
      }

      if (!sameNormalized) {
        throwIfValidationError(validateTransicion(actual, estadoNormalizado, force));
      }

      await estadoPolicy.validateBeforeUpdate({
        tramiteId,
        sameNormalized,
        actorPermissions,
        client
      });

      const updateRes = await tramitesPagoRepo.updateTramiteEstado({
        tramiteId,
        estado: estadoNormalizado
      }, client);

      await tramitesPagoRepo.insertHistorialConEstados({
        tramiteId,
        accion: force ? TRAMITE_ACCIONES.OVERRIDE_ESTADO : TRAMITE_ACCIONES.CAMBIAR_ESTADO,
        estadoAnterior: actualRaw,
        estadoNuevo: estadoNormalizado,
        usuario,
        motivo
      }, client);

      await estadoPolicy.runAfterUpdate({
        tramiteId,
        usuario,
        pagosDocumentos: pagos_documentos,
        client
      });

      return updateRes;
    });
  };

  const decisionDocumento = async ({
    id,
    facturaId,
    etapa,
    decision,
    motivo,
    usuario,
    actorUserId,
    actorUserName,
    actorUserEmail,
    actorRoleId,
    actorPermissions
  }) => {
    const tramiteId = parsePositiveIntOrThrow(id, 'id');
    const normalizedFacturaId = parsePositiveIntOrThrow(facturaId, 'facturaId');
    const etapaNormalizada = toNormalizedLowerString(etapa);
    const decisionNormalizada = toNormalizedLowerString(decision);
    const normalizedPermissions = permissionsService.normalizePermissionList(actorPermissions);

    throwIfValidationError(validateDecisionDocumentoInput(etapaNormalizada, decisionNormalizada));

    const etapaPolicy = resolveEtapaPolicy(etapaNormalizada);
    if (!etapaPolicy) {
      throwIfValidationError({ status: 400, error: 'etapa invalida' });
    }

    const columnas = etapaPolicy.columnas;
    const decisionPolicy = resolveDecisionPolicy({
      decision: decisionNormalizada,
      etapa: etapaNormalizada
    });

    return runInTransaction(async (client) => {
      const documento = await tramitesPagoRepo.getTramiteDocumentoByFacturaIdForUpdate({
        tramiteId,
        facturaId: normalizedFacturaId
      }, client);
      assertDocumentoPendienteEnEtapa({
        documento,
        columnas,
        etapa: etapaNormalizada
      });

      if (etapaNormalizada === 'gerencia') {
        const approvalRows = await ensureGerenciaApprovalSnapshots({
          tramitesPagoRepo,
          tramiteId,
          facturaIds: [normalizedFacturaId],
          client
        });
        const documentApprovalRows = approvalRows.filter((row) => Number(row.factura_id) === normalizedFacturaId);

        if (documentApprovalRows.length > 0) {
          await tramitesPagoRepo.listTramiteDocumentoAprobadoresForUpdate({
            tramiteId,
            facturaId: normalizedFacturaId
          }, client);

          const lockedApprovalRows = await tramitesPagoRepo.listTramiteDocumentoAprobadores({
            tramiteId,
            facturaIds: [normalizedFacturaId]
          }, client);
          const lockedDocumentApprovalRows = lockedApprovalRows.filter(
            (row) => Number(row.factura_id) === normalizedFacturaId
          );
          const actorApprovalRow = validateGerenciaApproverActor({
            approvalRows: lockedDocumentApprovalRows,
            actorUserId,
            actorRoleId
          });

          assertFound(actorApprovalRow, 'Aprobador de gerencia no encontrado para este documento');
          if (actorApprovalRow.estado_gerencia !== DOCUMENTO_ESTADOS.PENDIENTE) {
            throw createError(409, 'Tu decision de gerencia ya fue registrada para este documento');
          }

          await tramitesPagoRepo.updateTramiteDocumentoAprobadorEstado({
            tramiteId,
            facturaId: normalizedFacturaId,
            usuarioAprobadorId: actorApprovalRow.usuario_aprobador_id,
            rolAprobadorId: actorApprovalRow.rol_aprobador_id,
            estado: decisionNormalizada,
            motivo,
            decisionUsuarioId: actorUserId,
            decisionUsuarioNombre: actorUserName || null,
            decisionUsuarioEmail: actorUserEmail || null
          }, client);

          const updatedApprovalRows = await tramitesPagoRepo.listTramiteDocumentoAprobadores({
            tramiteId,
            facturaIds: [normalizedFacturaId]
          }, client);
          const approvalSummary = buildApprovalSummary(
            updatedApprovalRows.filter((row) => Number(row.factura_id) === normalizedFacturaId)
          );

          const finalDecision = decisionNormalizada === DOCUMENTO_DECISIONES.RECHAZADO
            || approvalSummary.pendientes === 0
            ? decisionNormalizada
            : null;

          let result = null;
          if (finalDecision) {
            result = await tramitesPagoRepo.updateDocumentoDecision({
              tramiteId,
              facturaId: normalizedFacturaId,
              columnas,
              decision: finalDecision,
              motivo
            }, client);
            assertFound(result, 'Documento no encontrado en tramite');
          } else {
            result = { factura_id: normalizedFacturaId, estado_gerencia: 'pendiente' };
          }

          if (finalDecision) {
            await tramitesPagoRepo.insertHistorialDocumentoConEstados({
              tramiteId,
              facturaId: normalizedFacturaId,
              accion: etapaPolicy.historialAccion,
              estadoAnterior: documento[columnas.estado],
              estadoNuevo: finalDecision,
              usuario,
              motivo
            }, client);
          } else {
            await tramitesPagoRepo.insertHistorialDocumento({
              tramiteId,
              facturaId: normalizedFacturaId,
              accion: etapaPolicy.historialAccion,
              usuario,
              motivo
            }, client);
          }

          await tramitesPagoRepo.touchTramite(tramiteId, client);

          if (finalDecision === DOCUMENTO_DECISIONES.RECHAZADO) {
            await decisionPolicy.runAfterDecision({
              tramiteId,
              facturaId: normalizedFacturaId,
              usuario,
              motivo,
              client
            });
            return result;
          }

          if (finalDecision === DOCUMENTO_DECISIONES.APROBADO) {
            await maybeAdvanceTramiteByStageApproval({
              tramitesPagoRepo,
              tramiteId,
              etapa: etapaNormalizada,
              usuario,
              client
            });
          }

          return result;
        }

        if (!permissionsService.hasPermission(normalizedPermissions, PERMISSIONS.DOCUMENTOS_APROBAR_GERENCIA)) {
          throw createError(403, `Permiso requerido: ${PERMISSIONS.DOCUMENTOS_APROBAR_GERENCIA}`);
        }
      } else if (
        etapaNormalizada === 'gerencia_contable'
        && !permissionsService.hasPermission(normalizedPermissions, PERMISSIONS.DOCUMENTOS_APROBAR_GERENCIA_CONTABLE)
      ) {
        throw createError(403, `Permiso requerido: ${PERMISSIONS.DOCUMENTOS_APROBAR_GERENCIA_CONTABLE}`);
      } else if (
        etapaNormalizada === 'financiera'
        && !permissionsService.hasPermission(normalizedPermissions, PERMISSIONS.DOCUMENTOS_APROBAR_GERENCIA_FINANCIERA)
      ) {
        throw createError(403, `Permiso requerido: ${PERMISSIONS.DOCUMENTOS_APROBAR_GERENCIA_FINANCIERA}`);
      }

      const result = await tramitesPagoRepo.updateDocumentoDecision({
        tramiteId,
        facturaId: normalizedFacturaId,
        columnas,
        decision: decisionNormalizada,
        motivo
      }, client);

      assertFound(result, 'Documento no encontrado en tramite');

      await tramitesPagoRepo.insertHistorialDocumentoConEstados({
        tramiteId,
        facturaId: normalizedFacturaId,
        accion: etapaPolicy.historialAccion,
        estadoAnterior: documento[columnas.estado],
        estadoNuevo: decisionNormalizada,
        usuario,
        motivo
      }, client);

      await tramitesPagoRepo.touchTramite(tramiteId, client);

      await decisionPolicy.runAfterDecision({
        tramiteId,
        facturaId: normalizedFacturaId,
        usuario,
        motivo,
        client
      });

      if (decisionNormalizada === DOCUMENTO_DECISIONES.APROBADO) {
        await maybeAdvanceTramiteByStageApproval({
          tramitesPagoRepo,
          tramiteId,
          etapa: etapaNormalizada,
          usuario,
          client
        });
      }

      return result;
    });
  };

  return {
    crearTramite,
    cambiarEstado,
    decisionDocumento
  };
};

module.exports = { createTramitesPagoWorkflowUseCases };
