const { createTramitesPagoPolicyRegistry } = require('../services/tramitesPagoPolicyRegistry');
const {
  TRAMITE_ESTADOS,
  DOCUMENTO_DECISIONES,
  TESORERIA_ACCIONES
} = require('../domain/tramitesPago');

describe('tramitesPagoPolicyRegistry', () => {
  test('expone resolvers de workflow y tesoreria con politicas conocidas', () => {
    const registry = createTramitesPagoPolicyRegistry({ tramitesPagoRepo: {} });

    const createFacturas = registry.workflow.resolveCreateItemPolicy('facturas');
    const createRetenciones = registry.workflow.resolveCreateItemPolicy('retenciones');
    expect(createFacturas).toBeTruthy();
    expect(typeof createFacturas.fetchRows).toBe('function');
    expect(createRetenciones).toBeTruthy();
    expect(typeof createRetenciones.attachToTramite).toBe('function');
    expect(registry.workflow.resolveCreateItemPolicy('desconocido')).toBeNull();

    const estadoPagado = registry.workflow.resolveEstadoPolicy(TRAMITE_ESTADOS.PAGADO);
    const estadoInexistente = registry.workflow.resolveEstadoPolicy('estado_no_registrado');
    expect(typeof estadoPagado.validateBeforeUpdate).toBe('function');
    expect(typeof estadoPagado.runAfterUpdate).toBe('function');
    expect(typeof estadoInexistente.validateBeforeUpdate).toBe('function');
    expect(typeof estadoInexistente.runAfterUpdate).toBe('function');

    const etapaGerencia = registry.workflow.resolveEtapaPolicy('gerencia');
    expect(etapaGerencia).toBeTruthy();
    expect(etapaGerencia.columnas).toMatchObject({
      estado: 'estado_gerencia',
      motivo: 'motivo_gerencia',
      accion: 'decision_gerencia'
    });
    expect(registry.workflow.resolveEtapaPolicy('etapa_no_registrada')).toBeNull();

    const decisionRechazada = registry.workflow.resolveDecisionPolicy({
      decision: DOCUMENTO_DECISIONES.RECHAZADO,
      etapa: 'gerencia'
    });
    const decisionNoConfig = registry.workflow.resolveDecisionPolicy({
      decision: DOCUMENTO_DECISIONES.APROBADO,
      etapa: 'gerencia'
    });
    expect(typeof decisionRechazada.runAfterDecision).toBe('function');
    expect(typeof decisionNoConfig.runAfterDecision).toBe('function');

    const accionExcluir = registry.tesoreria.resolveActionPolicy(TESORERIA_ACCIONES.EXCLUIR);
    const accionDevolverContabilidad = registry.tesoreria.resolveActionPolicy(TESORERIA_ACCIONES.DEVOLVER_CONTABILIDAD);
    expect(accionExcluir).toMatchObject({ handlerType: 'exclude', requiresDestino: false });
    expect(accionDevolverContabilidad).toMatchObject({
      handlerType: 'returnToAccounting',
      requiresDestino: false,
      requiresMotivo: true
    });
    expect(registry.tesoreria.resolveActionPolicy('accion_no_registrada')).toBeNull();

    const handlerExclude = registry.tesoreria.resolveActionHandler('exclude');
    const handlerReturnToAccounting = registry.tesoreria.resolveActionHandler('returnToAccounting');
    const handlerReset = registry.tesoreria.resolveActionHandler('reset');
    expect(typeof handlerExclude).toBe('function');
    expect(typeof handlerReturnToAccounting).toBe('function');
    expect(typeof handlerReset).toBe('function');
    expect(registry.tesoreria.resolveActionHandler('handler_no_registrado')).toBeNull();

    expect(typeof registry.rules.resolveTesoreriaActionPolicy).toBe('function');
    expect(typeof registry.rules.hasEtapaDecisionPolicy).toBe('function');
    expect(Array.isArray(registry.rules.cambioEstadoInputRules)).toBe(true);
    expect(Array.isArray(registry.rules.sociedadResolutionRules)).toBe(true);
    expect(typeof registry.rules.transicionValidationPolicy.shouldSkipValidation).toBe('function');
  });
});
