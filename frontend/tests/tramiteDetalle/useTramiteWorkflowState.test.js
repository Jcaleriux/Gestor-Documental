import test from 'node:test';
import assert from 'node:assert/strict';
import { createMockFn } from '../utils/mockFn.js';
import { createHookHarness } from '../utils/hookHarness.js';
import { useTramiteWorkflowState } from '../../src/hooks/tramiteDetalle/useTramiteWorkflowState.js';

const useTramiteWorkflowStateHarness = (props) => useTramiteWorkflowState(props);

const createBaseProps = () => ({
  id: 33,
  tramite: { estado: 'en_aprobacion_gerencia' },
  documentosActivos: [
    { factura_id: 1, total_a_pagar: 120.5, monto_pago_programado: 75.25 },
    { factura_id: 2, total_a_pagar: 0 },
    { factura_id: 3, total_a_pagar: 50 }
  ],
  fetchHistorial: createMockFn(async () => {})
});

test('useTramiteWorkflowState solicita historial cuando historialVisible cambia a true', async () => {
  const props = createBaseProps();
  const hook = createHookHarness({
    hook: useTramiteWorkflowStateHarness,
    initialProps: props
  });

  assert.equal(props.fetchHistorial.calls.length, 0);

  hook.result.setHistorialVisible(true);
  await hook.flush({ cycles: 3 });

  assert.equal(props.fetchHistorial.calls.length, 1);
});

test('useTramiteWorkflowState calcula pagos sugeridos y permite cambios por factura', async () => {
  const hook = createHookHarness({
    hook: useTramiteWorkflowStateHarness,
    initialProps: createBaseProps()
  });

  assert.equal(hook.result.pagosFacturas[1], '75.25');
  assert.equal(hook.result.pagosFacturas[3], '50.00');
  assert.equal(hook.result.pagosFacturas[2], undefined);
  assert.equal(hook.result.accionSiguiente.estado, 'en_revision_tesoreria_1');

  hook.result.handlePagoFacturaChange(1, '45.75');
  hook.result.handleTesoreriaDestinoChange(1, 'en_aprobacion_gerencia_contable');
  await hook.flush({ cycles: 2 });

  assert.equal(hook.result.pagosFacturas[1], '45.75');
  assert.equal(hook.result.tesoreriaDestino[1], 'en_aprobacion_gerencia_contable');
});

test('useTramiteWorkflowState resincroniza overrideUser con actorUsuario sin effect de reset', async () => {
  const hook = createHookHarness({
    hook: useTramiteWorkflowStateHarness,
    initialProps: {
      ...createBaseProps(),
      actorUsuario: 'ana@novogar.local',
    },
  });

  assert.equal(hook.result.overrideUser, 'ana@novogar.local');

  hook.result.setOverrideUser('operador-manual');
  await hook.flush({ cycles: 2 });
  assert.equal(hook.result.overrideUser, 'operador-manual');

  hook.rerender({
    ...createBaseProps(),
    actorUsuario: 'gerencia@novogar.local',
  });
  await hook.flush({ cycles: 2 });

  assert.equal(hook.result.overrideUser, 'gerencia@novogar.local');
});
