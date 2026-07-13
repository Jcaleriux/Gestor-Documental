import { useEffect, useMemo, useState } from 'react';
import { usuariosApi } from '../../services/usuariosApi';
import { isStrongPassword } from '../../utils/passwordPolicy';
import { buildRoleFormPayload, normalizePermissionNames } from '../../utils/rolesAdmin';
import { buildUsuariosAdminLoadState } from './usuariosAdminLoadState';

const EMPTY_FORM = {
  nombre: '',
  email: '',
  rol_id: '',
  activo: true,
  password: ''
};

const EMPTY_ROLE_FORM = {
  codigo: '',
  nombre: '',
  descripcion: '',
  nivel_jerarquia: 40,
  permisos: []
};

const toFormFromUser = (user) => ({
  nombre: user.nombre || '',
  email: user.email || '',
  rol_id: user.rol_id != null ? String(user.rol_id) : '',
  activo: Boolean(user.activo),
  password: ''
});

const toFormFromRole = (role) => ({
  codigo: role.codigo || '',
  nombre: role.nombre || '',
  descripcion: role.descripcion || '',
  nivel_jerarquia: role.nivel_jerarquia ?? 40,
  permisos: normalizePermissionNames(role.permisos)
});

export const useUsuariosAdminViewModel = () => {
  const [usuarios, setUsuarios] = useState([]);
  const [roles, setRoles] = useState([]);
  const [permisos, setPermisos] = useState([]);
  const [sociedades, setSociedades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingRole, setSavingRole] = useState(false);
  const [savingSociedades, setSavingSociedades] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingRoleId, setEditingRoleId] = useState(null);
  const [sociedadesUser, setSociedadesUser] = useState(null);
  const [sociedadesAsignadas, setSociedadesAsignadas] = useState([]);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [roleForm, setRoleForm] = useState(EMPTY_ROLE_FORM);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const isEditing = editingId != null;
  const isEditingRole = editingRoleId != null;

  const loadData = async ({ showLoader = true } = {}) => {
    try {
      if (showLoader) setLoading(true);
      const [usersResult, rolesResult, permisosResult, sociedadesResult] = await Promise.allSettled([
        usuariosApi.listUsuarios(),
        usuariosApi.listRoles(),
        usuariosApi.listPermisos(),
        usuariosApi.listSociedades()
      ]);
      const nextState = buildUsuariosAdminLoadState({
        usersResult,
        rolesResult,
        permisosResult,
        sociedadesResult
      });

      if (nextState.usuarios) {
        setUsuarios(nextState.usuarios);
      }
      if (nextState.roles) {
        setRoles(nextState.roles);
      }
      if (nextState.permisos) {
        setPermisos(nextState.permisos);
      }
      if (nextState.sociedades) {
        setSociedades(nextState.sociedades);
      }
      setError(nextState.error);
    } catch (err) {
      const apiError = err.response?.data?.error || 'No se pudo cargar la administracion de usuarios.';
      setError(apiError);
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial del modulo de administracion
    loadData();
  }, []);

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return usuarios;

    return usuarios.filter((user) => {
      const haystack = [
        user.nombre,
        user.email,
        user.rol_nombre,
        user.rol_codigo,
        user.id
      ].join(' ').toLowerCase();
      return haystack.includes(term);
    });
  }, [usuarios, search]);

  const setFormField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const resetRoleForm = () => {
    setEditingRoleId(null);
    setRoleForm(EMPTY_ROLE_FORM);
  };

  const startCreate = () => {
    resetForm();
    setError('');
    setMessage('');
  };

  const startEdit = (user) => {
    setEditingId(user.id);
    setForm(toFormFromUser(user));
    setError('');
    setMessage('');
  };

  const startCreateRole = () => {
    resetRoleForm();
    setError('');
    setMessage('');
  };

  const startEditRole = (role) => {
    setEditingRoleId(role.id);
    setRoleForm(toFormFromRole(role));
    setError('');
    setMessage('');
  };

  const handleFormSubmit = async (event) => {
    event.preventDefault();

    try {
      setSaving(true);
      setError('');
      setMessage('');

      const payload = {
        nombre: form.nombre.trim(),
        email: form.email.trim().toLowerCase(),
        rol_id: Number(form.rol_id),
        activo: Boolean(form.activo)
      };

      const password = form.password.trim();
      if (!isEditing && !password) {
        setError('La contrasena es requerida para crear el usuario.');
        return false;
      }

      if (password && !isStrongPassword(password)) {
        setError('La contrasena debe tener al menos 12 caracteres e incluir mayuscula, minuscula, numero y simbolo.');
        return false;
      }

      if (password) {
        payload.password = password;
      }

      if (isEditing) {
        await usuariosApi.updateUsuario(editingId, payload);
        setMessage('Usuario actualizado correctamente.');
      } else {
        await usuariosApi.createUsuario(payload);
        setMessage('Usuario creado correctamente.');
      }

      await loadData({ showLoader: false });
      resetForm();
      return true;
    } catch (err) {
      const apiError = err.response?.data?.error || 'No se pudo guardar el usuario.';
      setError(apiError);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const setRoleFormField = (field, value) => {
    setRoleForm((prev) => ({ ...prev, [field]: value }));
  };

  const toggleRolePermission = (permissionName) => {
    setRoleForm((prev) => {
      const current = new Set(normalizePermissionNames(prev.permisos));
      if (current.has(permissionName)) {
        current.delete(permissionName);
      } else {
        current.add(permissionName);
      }

      return {
        ...prev,
        permisos: normalizePermissionNames(Array.from(current))
      };
    });
  };

  const handleRoleFormSubmit = async (event) => {
    event.preventDefault();

    try {
      setSavingRole(true);
      setError('');
      setMessage('');

      const payload = buildRoleFormPayload(roleForm);
      if (isEditingRole) {
        const updatePayload = { ...payload };
        delete updatePayload.codigo;
        await usuariosApi.updateRole(editingRoleId, updatePayload);
        setMessage('Rol actualizado correctamente.');
      } else {
        await usuariosApi.createRole(payload);
        setMessage('Rol creado correctamente.');
      }

      await loadData({ showLoader: false });
      resetRoleForm();
      return true;
    } catch (err) {
      const apiError = err.response?.data?.error || 'No se pudo guardar el rol.';
      setError(apiError);
      return false;
    } finally {
      setSavingRole(false);
    }
  };

  const handleToggleActive = async (user) => {
    try {
      setSaving(true);
      setError('');
      setMessage('');

      await usuariosApi.updateUsuario(user.id, {
        nombre: user.nombre,
        email: user.email,
        rol_id: user.rol_id,
        activo: !user.activo
      });

      await loadData({ showLoader: false });
      setMessage(`Usuario ${!user.activo ? 'activado' : 'desactivado'} correctamente.`);
    } catch (err) {
      const apiError = err.response?.data?.error || 'No se pudo actualizar el estado del usuario.';
      setError(apiError);
    } finally {
      setSaving(false);
    }
  };

  const openSociedadesPanel = async (user) => {
    try {
      setSavingSociedades(true);
      setError('');
      setMessage('');
      setSociedadesUser(user);

      const res = await usuariosApi.getSociedadesUsuario(user.id);
      if (res.data?.success) {
        setSociedadesAsignadas(res.data.data?.sociedad_ids || []);
      } else {
        setSociedadesAsignadas([]);
      }
    } catch (err) {
      const apiError = err.response?.data?.error || 'No se pudieron cargar las sociedades del usuario.';
      setError(apiError);
      setSociedadesUser(null);
      setSociedadesAsignadas([]);
    } finally {
      setSavingSociedades(false);
    }
  };

  const closeSociedadesPanel = () => {
    setSociedadesUser(null);
    setSociedadesAsignadas([]);
  };

  const toggleSociedad = (sociedadId) => {
    setSociedadesAsignadas((prev) => (
      prev.includes(sociedadId)
        ? prev.filter((id) => id !== sociedadId)
        : [...prev, sociedadId]
    ));
  };

  const saveSociedades = async () => {
    if (!sociedadesUser) return false;

    try {
      setSavingSociedades(true);
      setError('');
      setMessage('');

      await usuariosApi.setSociedadesUsuario(sociedadesUser.id, {
        sociedad_ids: sociedadesAsignadas
      });

      setMessage('Sociedades asignadas correctamente.');
      return true;
    } catch (err) {
      const apiError = err.response?.data?.error || 'No se pudieron guardar las sociedades.';
      setError(apiError);
      return false;
    } finally {
      setSavingSociedades(false);
    }
  };

  return {
    roles,
    permisos,
    sociedades,
    loading,
    saving,
    savingRole,
    savingSociedades,
    editingId,
    editingRoleId,
    isEditing,
    isEditingRole,
    sociedadesUser,
    sociedadesAsignadas,
    search,
    setSearch,
    form,
    roleForm,
    message,
    error,
    filteredUsers,
    startCreate,
    startEdit,
    startCreateRole,
    startEditRole,
    resetForm,
    resetRoleForm,
    setFormField,
    setRoleFormField,
    handleFormSubmit,
    handleRoleFormSubmit,
    handleToggleActive,
    toggleRolePermission,
    openSociedadesPanel,
    closeSociedadesPanel,
    toggleSociedad,
    saveSociedades
  };
};
