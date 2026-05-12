import { useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { centrosCostoApi } from '../../services/centrosCostoApi.js';
import { usuariosApi } from '../../services/usuariosApi.js';
import {
  ROOT_PARENT_CODE,
  buildCentrosCostoTemplateCsv,
  buildCentrosCostoTree,
  collectDescendantIds,
  filterCentrosCosto,
  normalizeCode,
  normalizeComparableText,
  normalizeText,
  parseCentrosCostoCsv,
  suggestParentByCode,
} from '../../utils/centrosCosto.js';

const EMPTY_FORM = Object.freeze({
  id: null,
  codigo: '',
  nombre: '',
  centro_padre_id: ROOT_PARENT_CODE,
  aprobador_tipo: 'usuario',
  usuario_aprobador_id: '',
  rol_aprobador_id: '',
  seleccionable_en_contabilizacion: true,
  activo: true,
  orden: '',
});

const toFormFromCentro = (centro) => ({
  id: centro?.id || null,
  codigo: centro?.codigo || '',
  nombre: centro?.nombre || '',
  centro_padre_id: centro?.centro_padre_id ? String(centro.centro_padre_id) : ROOT_PARENT_CODE,
  aprobador_tipo: centro?.rol_aprobador_id != null ? 'rol' : 'usuario',
  usuario_aprobador_id: centro?.usuario_aprobador_id != null ? String(centro.usuario_aprobador_id) : '',
  rol_aprobador_id: centro?.rol_aprobador_id != null ? String(centro.rol_aprobador_id) : '',
  seleccionable_en_contabilizacion: centro?.seleccionable_en_contabilizacion !== false,
  activo: centro?.activo !== false,
  orden: centro?.orden != null ? String(centro.orden) : '',
});

const sortCentros = (centros = []) => [...centros].sort((left, right) => {
  const leftOrden = Number.isFinite(Number(left?.orden)) ? Number(left.orden) : Number.MAX_SAFE_INTEGER;
  const rightOrden = Number.isFinite(Number(right?.orden)) ? Number(right.orden) : Number.MAX_SAFE_INTEGER;
  if (leftOrden !== rightOrden) {
    return leftOrden - rightOrden;
  }

  return normalizeCode(left?.codigo).localeCompare(normalizeCode(right?.codigo), 'es');
});

const filterTreeNodes = (nodes, query, includeInactive, onlySelectable) => {
  const normalizedQuery = normalizeComparableText(query);

  return nodes.flatMap((node) => {
    if (!includeInactive && node.activo === false) {
      return [];
    }

    const filteredChildren = filterTreeNodes(node.children || [], query, includeInactive, onlySelectable);

    if (onlySelectable && node.seleccionable_en_contabilizacion === false && filteredChildren.length === 0) {
      return [];
    }

    if (!normalizedQuery) {
      return [{ ...node, children: filteredChildren }];
    }

    const haystack = [
      node.codigo,
      node.nombre,
      node.usuario_aprobador_nombre,
      node.usuario_aprobador_email,
      node.rol_aprobador_codigo,
      node.rol_aprobador_nombre,
    ].join(' ').toLowerCase();

    if (haystack.includes(normalizedQuery) || filteredChildren.length > 0) {
      return [{ ...node, children: filteredChildren }];
    }

    return [];
  });
};

const downloadTextFile = ({ filename, contents }) => {
  if (typeof window === 'undefined') {
    return;
  }

  const blob = new Blob(['\uFEFF', contents], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.URL.revokeObjectURL(url);
};

export const useCentrosCostoCatalog = ({ sociedadId, dependencies = {} }) => {
  const {
    centrosApi = centrosCostoApi,
    usuariosService = usuariosApi,
  } = dependencies;

  const [centros, setCentros] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [showInactive, setShowInactive] = useState(true);
  const [onlySelectable, setOnlySelectable] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [importSummary, setImportSummary] = useState(null);
  const deferredSearch = useDeferredValue(search);

  const loadData = useCallback(async () => {
    if (!sociedadId) {
      setCentros([]);
      setUsuarios([]);
      setRoles([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');
      const [centrosData, usuariosRes, rolesRes] = await Promise.all([
        centrosApi.listCentros({ sociedadId }),
        usuariosService.listUsuarios(),
        usuariosService.listRoles(),
      ]);

      const usuariosActivos = Array.isArray(usuariosRes.data?.data)
        ? usuariosRes.data.data.filter((usuario) => usuario.activo !== false)
        : [];
      const rolesData = Array.isArray(rolesRes.data?.data)
        ? rolesRes.data.data
        : [];

      setCentros(sortCentros(centrosData));
      setUsuarios(usuariosActivos);
      setRoles(rolesData);
    } catch (err) {
      const apiError = err.response?.data?.error || 'No se pudo cargar el catalogo de centros de costo.';
      setError(apiError);
    } finally {
      setLoading(false);
    }
  }, [centrosApi, sociedadId, usuariosService]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga inicial del catalogo al montar o cambiar dependencias
    loadData();
  }, [loadData]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resetea el formulario al cambiar de sociedad
    setForm(EMPTY_FORM);
    setEditingId(null);
    setImportSummary(null);
  }, [sociedadId]);

  const stats = useMemo(() => ({
    total: centros.length,
    activos: centros.filter((centro) => centro.activo !== false).length,
    inactivos: centros.filter((centro) => centro.activo === false).length,
    seleccionables: centros.filter((centro) => centro.seleccionable_en_contabilizacion !== false).length,
  }), [centros]);

  const filteredCentros = useMemo(() => filterCentrosCosto(centros, {
    query: deferredSearch,
    includeInactive: showInactive,
    onlySelectable,
  }), [centros, deferredSearch, onlySelectable, showInactive]);

  const treeNodes = useMemo(() => filterTreeNodes(
    buildCentrosCostoTree(centros),
    deferredSearch,
    showInactive,
    onlySelectable
  ), [centros, deferredSearch, onlySelectable, showInactive]);

  const suggestedParent = useMemo(() => suggestParentByCode(centros, form.codigo, editingId), [
    centros,
    editingId,
    form.codigo,
  ]);

  const blockedParentIds = useMemo(() => collectDescendantIds(centros, editingId), [centros, editingId]);

  const parentOptions = useMemo(() => sortCentros(
    centros.filter((centro) => (
      String(centro.id) !== String(editingId || '')
      && !blockedParentIds.has(String(centro.id))
    ))
  ), [blockedParentIds, centros, editingId]);

  const setFormField = useCallback((field, value) => {
    setForm((previous) => {
      if (field === 'aprobador_tipo') {
        return {
          ...previous,
          aprobador_tipo: value === 'rol' ? 'rol' : 'usuario',
          usuario_aprobador_id: value === 'rol' ? '' : previous.usuario_aprobador_id,
          rol_aprobador_id: value === 'usuario' ? '' : previous.rol_aprobador_id,
        };
      }

      return { ...previous, [field]: value };
    });
  }, []);

  const resetForm = useCallback(() => {
    setEditingId(null);
    setForm(EMPTY_FORM);
  }, []);

  const startEdit = useCallback((centro) => {
    setEditingId(centro.id);
    setForm(toFormFromCentro(centro));
    setMessage('');
    setError('');
  }, []);

  const startCreate = useCallback(() => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setMessage('');
    setError('');
  }, []);

  const persistCentros = useCallback(async (nextCentros) => {
    const orderedCentros = sortCentros(nextCentros);
    const savedCentros = await centrosApi.setCentros({ sociedadId, centros: orderedCentros });
    const normalizedSaved = sortCentros(savedCentros);
    setCentros(normalizedSaved);
    return normalizedSaved;
  }, [centrosApi, sociedadId]);

  const handleSubmit = useCallback(async (event) => {
    event.preventDefault();

    const codigo = normalizeCode(form.codigo);
    const nombre = normalizeText(form.nombre);
    const usuarioAprobadorId = form.aprobador_tipo === 'usuario' && form.usuario_aprobador_id
      ? Number(form.usuario_aprobador_id)
      : null;
    const rolAprobadorId = form.aprobador_tipo === 'rol' && form.rol_aprobador_id
      ? Number(form.rol_aprobador_id)
      : null;
    const aprobadorUsuario = usuarios.find((usuario) => usuario.id === usuarioAprobadorId) || null;
    const aprobadorRol = roles.find((rol) => rol.id === rolAprobadorId) || null;

    if (!codigo || !nombre || !form.centro_padre_id || (!aprobadorUsuario && !aprobadorRol)) {
      setError('Completa codigo, nombre, centro padre y un aprobador por usuario o rol.');
      return;
    }

    const duplicate = centros.find((centro) => (
      normalizeCode(centro.codigo) === codigo
      && String(centro.id) !== String(editingId || '')
    ));

    if (duplicate) {
      setError(`Ya existe un centro con el codigo ${codigo} en esta sociedad.`);
      return;
    }

    const centroPadre = form.centro_padre_id === ROOT_PARENT_CODE
      ? null
      : centros.find((centro) => String(centro.id) === String(form.centro_padre_id));

    if (form.centro_padre_id !== ROOT_PARENT_CODE && !centroPadre) {
      setError('Selecciona un centro padre valido.');
      return;
    }

    try {
      setSaving(true);
      setError('');
      setMessage('');

      const existing = centros.find((centro) => String(centro.id) === String(editingId || ''));
      const saved = await centrosApi.upsertCentro({
        sociedadId,
        centro: {
          ...existing,
          id: editingId || existing?.id || null,
          codigo,
          nombre,
          centro_padre_id: centroPadre?.id ? String(centroPadre.id) : null,
          centro_padre_codigo: centroPadre?.codigo || '',
          usuario_aprobador_id: aprobadorUsuario?.id ?? null,
          usuario_aprobador_nombre: aprobadorUsuario?.nombre ?? '',
          usuario_aprobador_email: aprobadorUsuario?.email ?? '',
          rol_aprobador_id: aprobadorRol?.id ?? null,
          rol_aprobador_codigo: aprobadorRol?.codigo ?? '',
          rol_aprobador_nombre: aprobadorRol?.nombre ?? '',
          seleccionable_en_contabilizacion: Boolean(form.seleccionable_en_contabilizacion),
          activo: Boolean(form.activo),
          orden: form.orden === '' ? centros.length + 1 : Number(form.orden),
        },
      });

      const nextCentros = sortCentros([
        ...centros.filter((centro) => String(centro.id) !== String(saved.id)),
        saved,
      ]);
      setCentros(nextCentros);
      setMessage(editingId ? 'Centro de costo actualizado.' : 'Centro de costo creado.');
      resetForm();
    } catch (err) {
      const apiError = err.response?.data?.error || 'No se pudo guardar el centro de costo.';
      setError(apiError);
    } finally {
      setSaving(false);
    }
  }, [centros, centrosApi, editingId, form, resetForm, roles, sociedadId, usuarios]);

  const toggleActivo = useCallback(async (centro) => {
    try {
      setSaving(true);
      setError('');
      setMessage('');

      const nextCentros = centros.map((item) => (
        String(item.id) === String(centro.id)
          ? { ...item, activo: !(item.activo !== false) }
          : item
      ));

      await persistCentros(nextCentros);
      setMessage(`Centro ${centro.activo === false ? 'activado' : 'inactivado'} correctamente.`);
    } catch (err) {
      const apiError = err.response?.data?.error || 'No se pudo actualizar el estado del centro.';
      setError(apiError);
    } finally {
      setSaving(false);
    }
  }, [centros, persistCentros]);

  const downloadTemplate = useCallback(() => {
    downloadTextFile({
      filename: 'centros_costo_template.csv',
      contents: buildCentrosCostoTemplateCsv(centros),
    });
  }, [centros]);

  const importCsv = useCallback(async (file) => {
    if (!file || !sociedadId) {
      return;
    }

    try {
      setSaving(true);
      setError('');
      setMessage('');
      setImportSummary(null);

      const text = await file.text();
      const importedRows = parseCentrosCostoCsv(text);
      if (importedRows.length === 0) {
        setError('El CSV no trae filas validas para importar.');
        return;
      }

      const usersByEmail = new Map(
        usuarios.map((usuario) => [normalizeComparableText(usuario.email), usuario])
      );
      const rolesByCode = new Map(
        roles.map((rol) => [normalizeCode(rol.codigo), rol])
      );
      const existingByCode = new Map(
        centros.map((centro) => [normalizeCode(centro.codigo), centro])
      );
      const nextByCode = new Map(existingByCode);
      const warnings = [];
      let skipped = 0;
      let created = 0;
      let updated = 0;

      importedRows.forEach((row, index) => {
        const existing = existingByCode.get(row.codigo);
        const approverFromCsv = row.email_aprobador ? usersByEmail.get(row.email_aprobador) : null;
        const roleFromCsv = row.rol_aprobador ? rolesByCode.get(row.rol_aprobador) : null;
        const existingUsesRole = existing?.rol_aprobador_id != null;

        if (row.email_aprobador && row.rol_aprobador) {
          warnings.push(`Se omitio ${row.codigo}: indique solo email_aprobador o rol_aprobador, no ambos.`);
          skipped += 1;
          return;
        }

        if (row.email_aprobador && !approverFromCsv && !existing?.usuario_aprobador_id) {
          warnings.push(`Se omitio ${row.codigo}: no se encontro aprobador activo para ${row.email_aprobador}.`);
          skipped += 1;
          return;
        }

        if (row.rol_aprobador && !roleFromCsv && !existing?.rol_aprobador_id) {
          warnings.push(`Se omitio ${row.codigo}: no se encontro rol aprobador para ${row.rol_aprobador}.`);
          skipped += 1;
          return;
        }

        if (row.email_aprobador && !approverFromCsv && existing?.usuario_aprobador_id) {
          warnings.push(`No se encontro aprobador activo para ${row.codigo} (${row.email_aprobador}); se mantuvo el aprobador existente.`);
        }

        if (row.rol_aprobador && !roleFromCsv && existing?.rol_aprobador_id) {
          warnings.push(`No se encontro rol aprobador para ${row.codigo} (${row.rol_aprobador}); se mantuvo el aprobador existente.`);
        }

        const nextUsesRole = row.rol_aprobador
          ? Boolean(roleFromCsv || existing?.rol_aprobador_id)
          : row.email_aprobador
            ? false
            : existingUsesRole;

        const usuarioAprobadorId = nextUsesRole
          ? null
          : approverFromCsv?.id ?? existing?.usuario_aprobador_id ?? null;
        const rolAprobadorId = nextUsesRole
          ? roleFromCsv?.id ?? existing?.rol_aprobador_id ?? null
          : null;

        if (!usuarioAprobadorId && !rolAprobadorId) {
          warnings.push(`Se omitio ${row.codigo}: no tiene aprobador resoluble por usuario o rol.`);
          skipped += 1;
          return;
        }

        const nextCentro = {
          ...existing,
          id: existing?.id || null,
          codigo: row.codigo,
          nombre: row.nombre,
          centro_padre_codigo: row.codigo_padre === ROOT_PARENT_CODE ? '' : row.codigo_padre,
          centro_padre_id: existing?.centro_padre_id || null,
          usuario_aprobador_id: usuarioAprobadorId,
          usuario_aprobador_nombre: nextUsesRole ? '' : (approverFromCsv?.nombre ?? existing?.usuario_aprobador_nombre ?? ''),
          usuario_aprobador_email: nextUsesRole ? '' : (approverFromCsv?.email ?? existing?.usuario_aprobador_email ?? ''),
          rol_aprobador_id: rolAprobadorId,
          rol_aprobador_codigo: nextUsesRole ? (roleFromCsv?.codigo ?? existing?.rol_aprobador_codigo ?? '') : '',
          rol_aprobador_nombre: nextUsesRole ? (roleFromCsv?.nombre ?? existing?.rol_aprobador_nombre ?? '') : '',
          seleccionable_en_contabilizacion: row.seleccionable_en_contabilizacion,
          activo: row.activo,
          orden: row.orden || existing?.orden || index + 1,
          creado_en: existing?.creado_en,
        };

        if (existing) {
          updated += 1;
        } else {
          created += 1;
        }

        nextByCode.set(row.codigo, nextCentro);
      });

      const finalCentros = Array.from(nextByCode.values()).map((centro) => {
        const parentCode = normalizeCode(centro.centro_padre_codigo);
        if (!parentCode || parentCode === ROOT_PARENT_CODE) {
          return {
            ...centro,
            centro_padre_id: null,
            centro_padre_codigo: '',
          };
        }

        const parent = nextByCode.get(parentCode);
        if (!parent) {
          warnings.push(`No se encontro padre ${parentCode} para ${centro.codigo}; se importo en raiz.`);
          return {
            ...centro,
            centro_padre_id: null,
            centro_padre_codigo: '',
          };
        }

        return {
          ...centro,
          centro_padre_id: String(parent.id),
          centro_padre_codigo: parent.codigo,
        };
      });

      await persistCentros(finalCentros);
      setImportSummary({
        filename: file.name,
        created,
        updated,
        skipped,
        warnings,
      });
      setMessage('Importacion completada.');
    } catch (err) {
      const apiError = err.response?.data?.error || err.message || 'No se pudo importar el CSV.';
      setError(apiError);
    } finally {
      setSaving(false);
    }
  }, [centros, persistCentros, roles, sociedadId, usuarios]);

  return {
    centros,
    usuarios,
    roles,
    loading,
    saving,
    message,
    error,
    search,
    showInactive,
    onlySelectable,
    filteredCentros,
    treeNodes,
    stats,
    form,
    editingId,
    parentOptions,
    suggestedParent,
    importSummary,
    setSearch,
    setShowInactive,
    setOnlySelectable,
    setFormField,
    startCreate,
    startEdit,
    resetForm,
    handleSubmit,
    toggleActivo,
    downloadTemplate,
    importCsv,
  };
};
