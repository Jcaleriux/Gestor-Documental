import test from 'node:test';
import assert from 'node:assert/strict';
import { useSociedadesAdmin } from '../../src/hooks/sociedades/useSociedadesAdmin.js';
import { createHookHarness } from '../utils/hookHarness.js';
import { createMockFn } from '../utils/mockFn.js';

const createApi = ({ listData = [] } = {}) => ({
  listSociedadesAdmin: createMockFn(async () => ({
    data: {
      success: true,
      data: listData,
    },
  })),
  createSociedad: createMockFn(async () => ({ data: { success: true, data: { id: 99 } } })),
  updateSociedad: createMockFn(async () => ({ data: { success: true } })),
});

const useSociedadesAdminHarness = (props) => useSociedadesAdmin(props);

test('useSociedadesAdmin carga sociedades administrativas y filtra busqueda', async () => {
  const api = createApi({
    listData: [
      { id: 1, codigo: 'BSP', nombre_proyecto: 'Bio San Pablo', razon_social: 'Bio San Pablo SA', cedula_juridica: '3101887961', activo: true },
      { id: 2, codigo: 'INACT', nombre_proyecto: null, razon_social: 'Inactiva SA', cedula_juridica: '3101000000', activo: false },
    ],
  });

  const hook = createHookHarness({
    hook: useSociedadesAdminHarness,
    initialProps: { api },
  });

  await hook.flush({ cycles: 5 });

  assert.equal(hook.result.loading, false);
  assert.equal(hook.result.sociedades.length, 2);

  hook.result.setSearch('bio');
  await hook.flush({ cycles: 2 });

  assert.deepEqual(hook.result.filteredSociedades.map((sociedad) => sociedad.id), [1]);
});

test('useSociedadesAdmin crea sociedad y refresca selector global', async () => {
  const api = createApi();
  const onSociedadesChange = createMockFn(async () => {});

  const hook = createHookHarness({
    hook: useSociedadesAdminHarness,
    initialProps: { api, onSociedadesChange },
  });

  await hook.flush({ cycles: 5 });

  hook.result.setFormField('codigo', ' BSP ');
  hook.result.setFormField('nombre_proyecto', '');
  hook.result.setFormField('razon_social', ' Bio San Pablo SA ');
  hook.result.setFormField('cedula_juridica', ' 3101887961 ');
  await hook.flush({ cycles: 2 });

  await hook.result.handleSubmit({ preventDefault: createMockFn() });
  await hook.flush({ cycles: 5 });

  assert.deepEqual(api.createSociedad.calls.at(-1), [{
    codigo: 'BSP',
    nombre_proyecto: null,
    razon_social: 'Bio San Pablo SA',
    cedula_juridica: '3101887961',
    activo: true,
  }]);
  assert.equal(api.listSociedadesAdmin.calls.length, 2);
  assert.equal(onSociedadesChange.calls.length, 1);
  assert.equal(hook.result.message, 'Sociedad creada correctamente.');
});

test('useSociedadesAdmin edita e inactiva sociedades', async () => {
  const api = createApi({
    listData: [
      { id: 3, codigo: 'BSP', nombre_proyecto: 'Bio San Pablo', razon_social: 'Bio San Pablo SA', cedula_juridica: '3101887961', activo: true },
    ],
  });
  const onSociedadesChange = createMockFn(async () => {});

  const hook = createHookHarness({
    hook: useSociedadesAdminHarness,
    initialProps: { api, onSociedadesChange },
  });

  await hook.flush({ cycles: 5 });

  hook.result.startEdit(hook.result.sociedades[0]);
  await hook.flush({ cycles: 2 });
  hook.result.setFormField('razon_social', 'Bio San Pablo Sociedad Anonima');
  await hook.flush({ cycles: 2 });

  await hook.result.handleSubmit({ preventDefault: createMockFn() });
  await hook.flush({ cycles: 5 });

  assert.deepEqual(api.updateSociedad.calls.at(-1), [3, {
    codigo: 'BSP',
    nombre_proyecto: 'Bio San Pablo',
    razon_social: 'Bio San Pablo Sociedad Anonima',
    cedula_juridica: '3101887961',
    activo: true,
  }]);

  await hook.result.toggleActivo(hook.result.sociedades[0]);
  await hook.flush({ cycles: 5 });

  assert.deepEqual(api.updateSociedad.calls.at(-1), [3, {
    codigo: 'BSP',
    nombre_proyecto: 'Bio San Pablo',
    razon_social: 'Bio San Pablo SA',
    cedula_juridica: '3101887961',
    activo: false,
  }]);
  assert.equal(onSociedadesChange.calls.length, 2);
  assert.equal(hook.result.message, 'Sociedad desactivada correctamente.');
});
