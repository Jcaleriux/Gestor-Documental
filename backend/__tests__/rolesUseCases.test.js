const {
  REQUIRED_ADMIN_PERMISSIONS,
  createRolesUseCases
} = require('../services/rolesUseCases');

const createClient = () => ({
  query: jest.fn().mockResolvedValue(undefined),
  release: jest.fn(),
});

const createDeps = (overrides = {}) => ({
  rolesRepo: {
    getClient: jest.fn(),
    listRolesWithPermissions: jest.fn(),
    getRoleById: jest.fn(),
    getRoleByCodigo: jest.fn(),
    getRoleByNombre: jest.fn(),
    getRoleWithPermissionsById: jest.fn(),
    createRole: jest.fn(),
    updateRole: jest.fn(),
  },
  rolesPermisosRepo: {
    listPermisos: jest.fn(),
    listPermisosByNames: jest.fn(),
    replaceRolePermissions: jest.fn(),
  },
  permissionsService: {
    normalizePermissionList: jest.fn((permissions) => (
      Array.isArray(permissions)
        ? [...new Set(permissions.map((permission) => String(permission).trim()).filter(Boolean))]
        : []
    )),
    invalidateRole: jest.fn(),
  },
  ...overrides
});

describe('rolesUseCases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('lista roles con permisos y catalogo de permisos', async () => {
    const deps = createDeps();
    deps.rolesRepo.listRolesWithPermissions.mockResolvedValue([
      { id: 1, codigo: 'admin', nombre: 'Administrador', permisos: ['acceso_total'] },
      { id: 2, codigo: 'qa', nombre: 'QA', permisos: null },
    ]);
    deps.rolesPermisosRepo.listPermisos.mockResolvedValue([
      { id: 1, nombre: 'acceso_total' }
    ]);
    const useCases = createRolesUseCases(deps);

    await expect(useCases.listRoles()).resolves.toEqual([
      { id: 1, codigo: 'admin', nombre: 'Administrador', permisos: ['acceso_total'] },
      { id: 2, codigo: 'qa', nombre: 'QA', permisos: [] },
    ]);
    await expect(useCases.listPermisos()).resolves.toEqual([{ id: 1, nombre: 'acceso_total' }]);
  });

  test('crea rol normalizando codigo y reemplazando permisos dentro de transaccion', async () => {
    const client = createClient();
    const deps = createDeps();
    deps.rolesRepo.getClient.mockResolvedValue(client);
    deps.rolesRepo.getRoleByCodigo.mockResolvedValue(null);
    deps.rolesRepo.getRoleByNombre.mockResolvedValue(null);
    deps.rolesRepo.createRole.mockResolvedValue({
      id: 12,
      codigo: 'finanzas_supervisor',
      nombre: 'Finanzas supervisor',
    });
    deps.rolesPermisosRepo.listPermisosByNames.mockResolvedValue([
      { id: 1, nombre: 'documentos_ver' },
      { id: 2, nombre: 'usuarios_administrar' },
    ]);
    deps.rolesRepo.getRoleWithPermissionsById.mockResolvedValue({
      id: 12,
      codigo: 'finanzas_supervisor',
      nombre: 'Finanzas supervisor',
      permisos: ['documentos_ver', 'usuarios_administrar'],
    });
    const useCases = createRolesUseCases(deps);

    const result = await useCases.createRole({
      codigo: ' Finanzas_Supervisor ',
      nombre: ' Finanzas supervisor ',
      descripcion: '',
      nivel_jerarquia: '65',
      permisos: [' documentos_ver ', 'usuarios_administrar', 'documentos_ver'],
    });

    expect(client.query).toHaveBeenNthCalledWith(1, 'BEGIN');
    expect(deps.rolesRepo.createRole).toHaveBeenCalledWith({
      codigo: 'finanzas_supervisor',
      nombre: 'Finanzas supervisor',
      descripcion: null,
      nivelJerarquia: 65,
    }, client);
    expect(deps.rolesPermisosRepo.replaceRolePermissions).toHaveBeenCalledWith({
      roleId: 12,
      permissionIds: [1, 2],
    }, client);
    expect(deps.permissionsService.invalidateRole).toHaveBeenCalledWith(12);
    expect(client.query).toHaveBeenNthCalledWith(2, 'COMMIT');
    expect(client.release).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      id: 12,
      codigo: 'finanzas_supervisor',
      nombre: 'Finanzas supervisor',
      permisos: ['documentos_ver', 'usuarios_administrar'],
    });
  });

  test('actualiza metadatos del rol sin reemplazar permisos cuando no vienen en payload', async () => {
    const client = createClient();
    const deps = createDeps();
    deps.rolesRepo.getClient.mockResolvedValue(client);
    deps.rolesRepo.getRoleById.mockResolvedValue({ id: 8, codigo: 'qa' });
    deps.rolesRepo.getRoleByNombre.mockResolvedValue({ id: 8, nombre: 'QA operativo' });
    deps.rolesRepo.updateRole.mockResolvedValue({ id: 8, codigo: 'qa', nombre: 'QA operativo' });
    deps.rolesRepo.getRoleWithPermissionsById.mockResolvedValue({
      id: 8,
      codigo: 'qa',
      nombre: 'QA operativo',
      permisos: ['documentos_ver'],
    });
    const useCases = createRolesUseCases(deps);

    await expect(useCases.updateRole({
      id: '8',
      nombre: 'QA operativo',
      descripcion: 'Control',
      nivel_jerarquia: 45,
    })).resolves.toMatchObject({
      id: 8,
      permisos: ['documentos_ver'],
    });

    expect(deps.rolesPermisosRepo.listPermisosByNames).not.toHaveBeenCalled();
    expect(deps.rolesPermisosRepo.replaceRolePermissions).not.toHaveBeenCalled();
    expect(deps.permissionsService.invalidateRole).not.toHaveBeenCalled();
    expect(client.query).toHaveBeenNthCalledWith(2, 'COMMIT');
  });

  test('rechaza dejar el rol admin sin permisos administrativos obligatorios', async () => {
    const client = createClient();
    const deps = createDeps();
    deps.rolesRepo.getClient.mockResolvedValue(client);
    deps.rolesRepo.getRoleById.mockResolvedValue({ id: 1, codigo: 'admin' });
    const useCases = createRolesUseCases(deps);

    await expect(useCases.setRolePermissions({
      id: 1,
      permisos: ['documentos_ver'],
    })).rejects.toMatchObject({
      status: 400,
      data: { permisos_requeridos: REQUIRED_ADMIN_PERMISSIONS },
    });

    expect(deps.rolesPermisosRepo.replaceRolePermissions).not.toHaveBeenCalled();
    expect(deps.permissionsService.invalidateRole).not.toHaveBeenCalled();
    expect(client.query).toHaveBeenNthCalledWith(1, 'BEGIN');
    expect(client.query).toHaveBeenNthCalledWith(2, 'ROLLBACK');
    expect(client.release).toHaveBeenCalledTimes(1);
  });

  test('rechaza permisos inexistentes al reemplazar permisos de un rol', async () => {
    const client = createClient();
    const deps = createDeps();
    deps.rolesRepo.getClient.mockResolvedValue(client);
    deps.rolesRepo.getRoleById.mockResolvedValue({ id: 5, codigo: 'qa' });
    deps.rolesPermisosRepo.listPermisosByNames.mockResolvedValue([
      { id: 1, nombre: 'documentos_ver' },
    ]);
    const useCases = createRolesUseCases(deps);

    await expect(useCases.setRolePermissions({
      id: 5,
      permisos: ['documentos_ver', 'permiso_falso'],
    })).rejects.toMatchObject({
      status: 400,
      data: { permisos: ['permiso_falso'] },
    });

    expect(deps.rolesPermisosRepo.replaceRolePermissions).not.toHaveBeenCalled();
    expect(client.query).toHaveBeenNthCalledWith(2, 'ROLLBACK');
  });
});
