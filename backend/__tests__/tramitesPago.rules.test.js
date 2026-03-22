const {
  normalizeEstado,
  validateAccionTesoreriaInput,
  validateAccionTesoreriaEstado,
  validateFacturaNoPagada,
  validateDecisionDocumentoInput,
  validateCambioEstadoInput,
  validateTransicion,
  validatePagadoSinRechazos,
  validateFacturaIds,
  validateFacturasExistentes,
  resolveSociedadFinal
} = require('../services/tramitesPagoRules');

describe('tramitesPagoRules', () => {
  test('normalizeEstado normaliza valores', () => {
    expect(normalizeEstado(undefined)).toBe('');
    expect(normalizeEstado(null)).toBe('');
    expect(normalizeEstado('  PaGaDo  ')).toBe('pagado');
    expect(normalizeEstado(123)).toBe('123');
  });

  test('validateAccionTesoreriaInput valida accion y destino', () => {
    expect(validateAccionTesoreriaInput(undefined, undefined)).toMatchObject({
      status: 400,
      error: 'accion invalida'
    });

    expect(validateAccionTesoreriaInput('reenviar', 'otro')).toMatchObject({
      status: 400,
      error: 'destino invalido'
    });

    expect(validateAccionTesoreriaInput('excluir', undefined)).toBeNull();
    expect(validateAccionTesoreriaInput('reincluir', 'en_aprobacion_gerencia')).toBeNull();
  });

  test('validateAccionTesoreriaEstado valida estado tesoreria actual', () => {
    expect(validateAccionTesoreriaEstado('reincluir', 'pendiente')).toMatchObject({
      status: 400,
      error: 'Documento no esta excluido'
    });

    expect(validateAccionTesoreriaEstado('reenviar', 'excluido')).toMatchObject({
      status: 400,
      error: 'Documento excluido, use reincluir'
    });

    expect(validateAccionTesoreriaEstado('reenviar', 'pendiente')).toBeNull();
  });

  test('validateFacturaNoPagada bloquea pagado', () => {
    expect(validateFacturaNoPagada('pagado')).toMatchObject({
      status: 400,
      error: 'No se puede gestionar un documento pagado en tesoreria'
    });

    expect(validateFacturaNoPagada('en_revision')).toBeNull();
  });

  test('validateDecisionDocumentoInput valida etapa y decision', () => {
    expect(validateDecisionDocumentoInput('otra', 'aprobado')).toMatchObject({
      status: 400,
      error: 'etapa invalida'
    });

    expect(validateDecisionDocumentoInput('gerencia', 'otra')).toMatchObject({
      status: 400,
      error: 'decision invalida'
    });

    expect(validateDecisionDocumentoInput('gerencia', 'aprobado')).toBeNull();
  });

  test('validateCambioEstadoInput valida estado y override', () => {
    expect(validateCambioEstadoInput(undefined, false, undefined)).toMatchObject({
      status: 400,
      error: 'estado requerido'
    });

    expect(validateCambioEstadoInput('estado_invalido', false, undefined)).toMatchObject({
      status: 400,
      error: 'estado invalido'
    });

    expect(validateCambioEstadoInput('pagado', true, null)).toMatchObject({
      status: 400,
      error: 'motivo requerido para override'
    });

    const ok = validateCambioEstadoInput('Pagado', false, null);
    expect(ok).toMatchObject({ estadoNormalizado: 'pagado' });
  });

  test('validateTransicion respeta force y allowed', () => {
    expect(validateTransicion('en_aprobacion_gerencia', 'pagado', false)).toMatchObject({
      status: 400,
      error: 'Transicion no permitida: en_aprobacion_gerencia -> pagado'
    });

    expect(validateTransicion('en_aprobacion_gerencia', 'en_revision_tesoreria_1', false)).toBeNull();
    expect(validateTransicion('en_aprobacion_gerencia', 'pagado', true)).toBeNull();
  });

  test('validatePagadoSinRechazos bloquea si hay rechazados', () => {
    expect(validatePagadoSinRechazos(1)).toMatchObject({
      status: 400,
      error: 'No se puede marcar como pagado con documentos rechazados'
    });

    expect(validatePagadoSinRechazos(0)).toBeNull();
  });

  test('validateFacturaIds requiere array no vacio', () => {
    expect(validateFacturaIds(undefined)).toMatchObject({
      status: 400,
      error: 'factura_ids es requerido'
    });

    expect(validateFacturaIds([])).toMatchObject({
      status: 400,
      error: 'factura_ids es requerido'
    });

    expect(validateFacturaIds([1, 2])).toBeNull();
  });

  test('validateFacturasExistentes valida conteo', () => {
    expect(validateFacturasExistentes([1, 2], [{ id: 1 }])).toMatchObject({
      status: 400,
      error: 'Una o mas facturas no existen'
    });

    expect(validateFacturasExistentes([1, 2], [{ id: 1 }, { id: 2 }])).toBeNull();
  });

  test('resolveSociedadFinal valida reglas de sociedad', () => {
    const sinSoc = resolveSociedadFinal(null, [{ id: 1, sociedad_id: null }]);
    expect(sinSoc).toMatchObject({
      status: 400,
      error: 'Hay facturas sin sociedad receptora asignada'
    });
    expect(sinSoc.data).toMatchObject({ facturas: [1] });

    const varias = resolveSociedadFinal(null, [
      { id: 1, sociedad_id: 10 },
      { id: 2, sociedad_id: 20 }
    ]);
    expect(varias).toMatchObject({
      status: 400,
      error: 'Las facturas seleccionadas pertenecen a distintas sociedades receptoras'
    });
    expect(varias.data).toMatchObject({ sociedades: [10, 20] });

    const ok = resolveSociedadFinal(99, [{ id: 3, sociedad_id: 10 }]);
    expect(ok).toMatchObject({ sociedadFinal: 10 });
  });
});
