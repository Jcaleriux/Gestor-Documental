const { createPermissionsService } = require('../services/permissionsService');
const { PERMISSIONS } = require('../domain/permissions');

const createRepository = (permissions = []) => ({
  getPermissionNamesByRolId: jest.fn().mockResolvedValue(permissions)
});

describe('permissionsService', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('normaliza permisos eliminando vacios y duplicados', () => {
    const service = createPermissionsService({ repository: createRepository() });

    expect(service.normalizePermissionList([
      ' documentos_ver ',
      '',
      null,
      'documentos_ver',
      PERMISSIONS.ACCESO_TOTAL
    ])).toEqual(['documentos_ver', 'acceso_total']);
    expect(service.normalizePermissionList(null)).toEqual([]);
  });

  test('lista permisos por rol usando cache hasta que expira', async () => {
    const now = jest.spyOn(Date, 'now');
    now.mockReturnValue(1000);
    const repository = createRepository(['documentos_ver', 'documentos_ver', ' tramites_ver ']);
    const service = createPermissionsService({
      repository,
      cacheTtlMs: 50
    });

    await expect(service.listPermissionsByRole('3')).resolves.toEqual([
      'documentos_ver',
      'tramites_ver'
    ]);
    await expect(service.listPermissionsByRole(3)).resolves.toEqual([
      'documentos_ver',
      'tramites_ver'
    ]);

    now.mockReturnValue(1060);
    repository.getPermissionNamesByRolId.mockResolvedValueOnce(['usuarios_administrar']);

    await expect(service.listPermissionsByRole(3)).resolves.toEqual(['usuarios_administrar']);
    expect(repository.getPermissionNamesByRolId).toHaveBeenCalledTimes(2);
    expect(repository.getPermissionNamesByRolId).toHaveBeenNthCalledWith(1, 3);
    expect(repository.getPermissionNamesByRolId).toHaveBeenNthCalledWith(2, 3);
  });

  test('ignora roles invalidos e invalida entradas de cache por rol', async () => {
    const repository = createRepository(['documentos_ver']);
    const service = createPermissionsService({
      repository,
      cacheTtlMs: 1000
    });

    await expect(service.listPermissionsByRole('abc')).resolves.toEqual([]);
    await expect(service.listPermissionsByRole(0)).resolves.toEqual([]);
    expect(repository.getPermissionNamesByRolId).not.toHaveBeenCalled();

    await expect(service.listPermissionsByRole(5)).resolves.toEqual(['documentos_ver']);
    service.invalidateRole(5);
    repository.getPermissionNamesByRolId.mockResolvedValueOnce(['tramites_ver']);
    await expect(service.listPermissionsByRole(5)).resolves.toEqual(['tramites_ver']);
    service.invalidateRole('no-valido');

    expect(repository.getPermissionNamesByRolId).toHaveBeenCalledTimes(2);
  });

  test('evalua acceso total, permisos especificos, any y all', () => {
    const service = createPermissionsService({ repository: createRepository() });
    const permissions = ['documentos_ver', 'tramites_ver'];
    const fullAccess = [PERMISSIONS.ACCESO_TOTAL];

    expect(service.hasAccesoTotal(fullAccess)).toBe(true);
    expect(service.hasAccesoTotal(permissions)).toBe(false);
    expect(service.hasPermission(permissions, 'documentos_ver')).toBe(true);
    expect(service.hasPermission(permissions, 'usuarios_administrar')).toBe(false);
    expect(service.hasPermission(fullAccess, 'usuarios_administrar')).toBe(true);
    expect(service.hasPermission(fullAccess, '')).toBe(false);
    expect(service.hasAnyPermission(permissions, ['usuarios_administrar', 'tramites_ver'])).toBe(true);
    expect(service.hasAnyPermission(permissions, ['usuarios_administrar'])).toBe(false);
    expect(service.hasAnyPermission(permissions, [])).toBe(true);
    expect(service.hasAnyPermission(fullAccess, ['usuarios_administrar'])).toBe(true);
    expect(service.hasAllPermissions(permissions, ['documentos_ver', 'tramites_ver'])).toBe(true);
    expect(service.hasAllPermissions(permissions, ['documentos_ver', 'usuarios_administrar'])).toBe(false);
    expect(service.hasAllPermissions(permissions, [])).toBe(true);
    expect(service.hasAllPermissions(fullAccess, ['usuarios_administrar', 'roles_ver'])).toBe(true);
  });

  test('exige repositorio compatible', () => {
    expect(() => createPermissionsService({ repository: {} })).toThrow(
      'repository.getPermissionNamesByRolId requerido'
    );
  });
});
