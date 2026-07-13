const PERMISSION_GROUP_LABELS = Object.freeze({
  acceso: 'Acceso general',
  auditoria: 'Auditoria',
  documentos: 'Documentos',
  reservas: 'Reservas',
  sociedades: 'Sociedades',
  usuarios: 'Usuarios'
});

const GROUP_ORDER = Object.freeze([
  'acceso',
  'usuarios',
  'sociedades',
  'documentos',
  'reservas',
  'auditoria'
]);

const collator = new Intl.Collator('es', {
  sensitivity: 'base',
  numeric: true
});

export const normalizePermissionNames = (permissions = []) => {
  if (!Array.isArray(permissions)) {
    return [];
  }

  return [...new Set(
    permissions
      .map((permission) => String(permission || '').trim())
      .filter(Boolean)
  )].sort(collator.compare);
};

export const getPermissionGroup = (permissionName) => {
  const [prefix] = String(permissionName || '').split('_');
  return prefix || 'otros';
};

export const getPermissionGroupLabel = (group) => (
  PERMISSION_GROUP_LABELS[group] || 'Otros permisos'
);

export const groupPermisosByPrefix = (permisos = []) => {
  const groups = new Map();

  permisos.forEach((permiso) => {
    const group = getPermissionGroup(permiso?.nombre);
    if (!groups.has(group)) {
      groups.set(group, []);
    }
    groups.get(group).push(permiso);
  });

  return Array.from(groups.entries())
    .map(([group, items]) => ({
      group,
      label: getPermissionGroupLabel(group),
      permisos: [...items].sort((left, right) => collator.compare(left.nombre, right.nombre))
    }))
    .sort((left, right) => {
      const leftIndex = GROUP_ORDER.indexOf(left.group);
      const rightIndex = GROUP_ORDER.indexOf(right.group);
      const safeLeft = leftIndex === -1 ? GROUP_ORDER.length : leftIndex;
      const safeRight = rightIndex === -1 ? GROUP_ORDER.length : rightIndex;

      if (safeLeft !== safeRight) {
        return safeLeft - safeRight;
      }

      return collator.compare(left.label, right.label);
    });
};

export const countRolePermissions = (role) => normalizePermissionNames(role?.permisos).length;

export const buildRoleFormPayload = (form) => ({
  codigo: String(form.codigo || '').trim().toLowerCase(),
  nombre: String(form.nombre || '').trim(),
  descripcion: String(form.descripcion || '').trim(),
  nivel_jerarquia: Number(form.nivel_jerarquia),
  permisos: normalizePermissionNames(form.permisos)
});
