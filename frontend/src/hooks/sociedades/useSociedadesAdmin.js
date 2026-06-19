import { useCallback, useEffect, useMemo, useState } from 'react';
import { sociedadesApi as defaultSociedadesApi } from '../../services/sociedadesApi.js';

const EMPTY_FORM = {
  codigo: '',
  nombre_proyecto: '',
  razon_social: '',
  cedula_juridica: '',
  activo: true,
};

const toFormFromSociedad = (sociedad) => ({
  codigo: sociedad.codigo || '',
  nombre_proyecto: sociedad.nombre_proyecto || '',
  razon_social: sociedad.razon_social || '',
  cedula_juridica: sociedad.cedula_juridica || '',
  activo: sociedad.activo !== false,
});

const buildPayloadFromForm = (source) => ({
  codigo: source.codigo.trim() || null,
  nombre_proyecto: source.nombre_proyecto.trim() || null,
  razon_social: source.razon_social.trim(),
  cedula_juridica: source.cedula_juridica.trim(),
  activo: Boolean(source.activo),
});

export const useSociedadesAdmin = ({
  api = defaultSociedadesApi,
  onSociedadesChange,
} = {}) => {
  const [sociedades, setSociedades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const isEditing = editingId != null;

  const loadSociedades = useCallback(async ({ showLoader = true } = {}) => {
    try {
      if (showLoader) setLoading(true);
      const res = await api.listSociedadesAdmin();
      if (res.data?.success) {
        setSociedades(res.data.data || []);
      }
    } catch (err) {
      const apiError = err.response?.data?.error || 'No se pudo cargar la lista de sociedades.';
      setError(apiError);
    } finally {
      if (showLoader) setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    loadSociedades();
  }, [loadSociedades]);

  const filteredSociedades = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return sociedades;

    return sociedades.filter((sociedad) => (
      [
        sociedad.id,
        sociedad.codigo,
        sociedad.nombre_proyecto,
        sociedad.razon_social,
        sociedad.cedula_juridica,
      ].join(' ').toLowerCase().includes(term)
    ));
  }, [search, sociedades]);

  const resetForm = useCallback(() => {
    setEditingId(null);
    setForm(EMPTY_FORM);
  }, []);

  const startCreate = useCallback(() => {
    resetForm();
    setError('');
    setMessage('');
  }, [resetForm]);

  const startEdit = useCallback((sociedad) => {
    setEditingId(sociedad.id);
    setForm(toFormFromSociedad(sociedad));
    setError('');
    setMessage('');
  }, []);

  const setFormField = useCallback((field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const refreshAfterSave = useCallback(async () => {
    await loadSociedades({ showLoader: false });
    await onSociedadesChange?.();
  }, [loadSociedades, onSociedadesChange]);

  const handleSubmit = useCallback(async (event) => {
    event?.preventDefault?.();

    try {
      setSaving(true);
      setError('');
      setMessage('');

      const payload = buildPayloadFromForm(form);
      if (isEditing) {
        await api.updateSociedad(editingId, payload);
        setMessage('Sociedad actualizada correctamente.');
      } else {
        await api.createSociedad(payload);
        setMessage('Sociedad creada correctamente.');
      }

      await refreshAfterSave();
      resetForm();
    } catch (err) {
      const apiError = err.response?.data?.error || 'No se pudo guardar la sociedad.';
      setError(apiError);
    } finally {
      setSaving(false);
    }
  }, [api, editingId, form, isEditing, refreshAfterSave, resetForm]);

  const toggleActivo = useCallback(async (sociedad) => {
    try {
      setSaving(true);
      setError('');
      setMessage('');

      await api.updateSociedad(sociedad.id, {
        ...buildPayloadFromForm(toFormFromSociedad(sociedad)),
        activo: sociedad.activo === false,
      });

      await refreshAfterSave();
      setMessage(`Sociedad ${sociedad.activo === false ? 'activada' : 'desactivada'} correctamente.`);
      if (String(editingId) === String(sociedad.id)) {
        resetForm();
      }
    } catch (err) {
      const apiError = err.response?.data?.error || 'No se pudo actualizar el estado de la sociedad.';
      setError(apiError);
    } finally {
      setSaving(false);
    }
  }, [api, editingId, refreshAfterSave, resetForm]);

  return {
    sociedades,
    loading,
    saving,
    editingId,
    isEditing,
    search,
    setSearch,
    form,
    message,
    error,
    filteredSociedades,
    startCreate,
    startEdit,
    resetForm,
    setFormField,
    handleSubmit,
    toggleActivo,
  };
};
