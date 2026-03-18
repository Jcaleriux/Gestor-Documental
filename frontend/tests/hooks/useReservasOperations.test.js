import test from 'node:test';
import assert from 'node:assert/strict';
import { useReservasOperations } from '../../src/hooks/reservas/useReservasOperations.js';
import { createHookHarness } from '../utils/hookHarness.js';
import { createMockFn } from '../utils/mockFn.js';

const useReservasOperationsHarness = (props) => useReservasOperations(props);

test('useReservasOperations carga reservas y expone items', async () => {
  const listOperaciones = createMockFn(async () => ({
    data: {
      success: true,
      data: [{ id: 1, estado: 'activa' }, { id: 2, estado: 'cerrada' }],
    },
  }));

  const hook = createHookHarness({
    hook: useReservasOperationsHarness,
    initialProps: {
      sociedadId: 10,
      estado: '',
      dependencies: {
        api: { listOperaciones },
      },
    },
  });

  await hook.flush({ cycles: 6 });

  assert.equal(listOperaciones.calls.length, 1);
  assert.deepEqual(hook.result.operations, [{ id: 1, estado: 'activa' }, { id: 2, estado: 'cerrada' }]);
  assert.equal(hook.result.error, '');
});

test('useReservasOperations expone error de carga y permite reintentar', async () => {
  let shouldFail = true;
  const listOperaciones = createMockFn(async () => {
    if (shouldFail) {
      const error = new Error('fallo');
      error.response = { data: { error: 'Backend reservas caido' } };
      throw error;
    }

    return {
      data: {
        success: true,
        data: [{ id: 8, estado: 'activa' }],
      },
    };
  });

  const hook = createHookHarness({
    hook: useReservasOperationsHarness,
    initialProps: {
      sociedadId: 10,
      estado: 'activa',
      dependencies: {
        api: { listOperaciones },
      },
    },
  });

  await hook.flush({ cycles: 6 });

  assert.equal(hook.result.error, 'Backend reservas caido');
  assert.deepEqual(hook.result.operations, []);

  shouldFail = false;
  await hook.result.refetch();
  await hook.flush({ cycles: 6 });

  assert.equal(hook.result.error, '');
  assert.deepEqual(hook.result.operations, [{ id: 8, estado: 'activa' }]);
});

test('useReservasOperations ejecuta transferOperation y refresca el listado', async () => {
  const listOperaciones = createMockFn(async () => ({
    data: {
      success: true,
      data: [{ id: 11, estado: 'trasladada' }],
    },
  }));
  const transferOperacion = createMockFn(async () => ({
    data: {
      success: true,
      data: {
        origen: { id: 10, estado: 'trasladada' },
        destino: { id: 11, estado: 'activa' },
      },
    },
  }));

  const hook = createHookHarness({
    hook: useReservasOperationsHarness,
    initialProps: {
      sociedadId: 10,
      dependencies: {
        api: { listOperaciones, transferOperacion },
      },
    },
  });

  await hook.flush({ cycles: 6 });
  await hook.result.transferOperation({
    operacionId: 10,
    payload: {
      destino_sociedad_id: 10,
      destino_proyecto_codigo: 'EDE',
      destino_unidad_codigo: 'A02',
    },
  });
  await hook.flush({ cycles: 6 });

  assert.equal(transferOperacion.calls.length, 1);
  assert.equal(listOperaciones.calls.length, 2);
  assert.equal(hook.result.message, 'Traslado aplicado correctamente.');
  assert.deepEqual(hook.result.operations, [{ id: 11, estado: 'trasladada' }]);
});

test('useReservasOperations propaga errores de transferOperation', async () => {
  const listOperaciones = createMockFn(async () => ({
    data: {
      success: true,
      data: [{ id: 10, estado: 'activa' }],
    },
  }));
  const transferOperacion = createMockFn(async () => {
    const error = new Error('conflicto');
    error.response = { data: { error: 'La unidad destino ya tiene una reserva activa' } };
    throw error;
  });

  const hook = createHookHarness({
    hook: useReservasOperationsHarness,
    initialProps: {
      sociedadId: 10,
      dependencies: {
        api: { listOperaciones, transferOperacion },
      },
    },
  });

  await hook.flush({ cycles: 6 });

  await assert.rejects(
    () => hook.result.transferOperation({
      operacionId: 10,
      payload: {
        destino_sociedad_id: 10,
        destino_proyecto_codigo: 'EDE',
        destino_unidad_codigo: 'A02',
      },
    }),
    /conflicto/,
  );

  await hook.flush({ cycles: 6 });

  assert.equal(hook.result.error, 'La unidad destino ya tiene una reserva activa');
});
