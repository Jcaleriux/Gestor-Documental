import { useEffect, useMemo, useState } from 'react';
import { usuariosApi } from '../../services/usuariosApi';

const EMPTY_FORM = {
  nombre: '',
  email: '',
  rol_id: '',
  activo: true,
  password: ''
};

const toFormFromUser = (user) => ({
  nombre: user.nombre || '',
  email: user.email || '',
  rol_id: user.rol_id != null ? String(user.rol_id) : '',
  activo: Boolean(user.activo),
  password: ''
});

export const useUsuariosAdminViewModel = () => {
  const [usuarios, setUsuarios] = useState([]);
  const [roles, setRoles] = useState([]);
  const [sociedades, setSociedades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingSociedades, setSavingSociedades] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [sociedadesUser, setSociedadesUser] = useState(null);
  const [sociedadesAsignadas, setSociedadesAsignadas] = useState([]);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const isEditing = editingId != null;

  const loadData = async ({ showLoader = true } = {}) => {
    try {
      if (showLoader) setLoading(true);
      const [usersRes, rolesRes, sociedadesRes] = await Promise.all([
        usuariosApi.listUsuarios(),
        usuariosApi.listRoles(),
        usuariosApi.listSociedades()
      ]);

      if (usersRes.data?.success) {
        setUsuarios(usersRes.data.data || []);
      }
      if (rolesRes.data?.success) {
        setRoles(rolesRes.data.data || []);
      }
      if (sociedadesRes.data?.success) {
        setSociedades(sociedadesRes.data.data || []);
      }
    } catch (err) {
      const apiError = err.response?.data?.error || 'No se pudo cargar la administracion de usuarios.';
      setError(apiError);
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  useEffect(() => {
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
        setError('Password es requerido para crear el usuario.');
        return;
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
    } catch (err) {
      const apiError = err.response?.data?.error || 'No se pudo guardar el usuario.';
      setError(apiError);
    } finally {
      setSaving(false);
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
    if (!sociedadesUser) return;

    try {
      setSavingSociedades(true);
      setError('');
      setMessage('');

      await usuariosApi.setSociedadesUsuario(sociedadesUser.id, {
        sociedad_ids: sociedadesAsignadas
      });

      setMessage('Sociedades asignadas correctamente.');
    } catch (err) {
      const apiError = err.response?.data?.error || 'No se pudieron guardar las sociedades.';
      setError(apiError);
    } finally {
      setSavingSociedades(false);
    }
  };

  return {
    roles,
    sociedades,
    loading,
    saving,
    savingSociedades,
    editingId,
    isEditing,
    sociedadesUser,
    sociedadesAsignadas,
    search,
    setSearch,
    form,
    message,
    error,
    filteredUsers,
    startCreate,
    startEdit,
    resetForm,
    setFormField,
    handleFormSubmit,
    handleToggleActive,
    openSociedadesPanel,
    closeSociedadesPanel,
    toggleSociedad,
    saveSociedades
  };
};
