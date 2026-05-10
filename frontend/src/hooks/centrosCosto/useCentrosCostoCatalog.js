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
  usuario_aprobador_id: '',
  seleccionable_en_contabilizacion: true,
  activo: true,
  orden: '',
});

const toFormFromCentro = (centro) => ({
  id: centro?.id || null,
  codigo: centro?.codigo || '',
  nombre: centro?.nombre || '',
  centro_padre_id: centro?.centro_padre_id ? String(centro.centro_padre_id) : ROOT_PARENT_CODE,
  usuario_aprobador_id: centro?.usuario_aprobador_id != null ? String(centro.usuario_aprobador_id) : '',
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
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');
      const [centrosData, usuariosRes] = await Promise.all([
        centrosApi.listCentros({ sociedadId }),
        usuariosService.listUsuarios(),
      ]);

      const usuariosActivos = Array.isArray(usuariosRes.data?.data)
        ? usuariosRes.data.data.filter((usuario) => usuario.activo !== false)
        : [];

      setCentros(sortCentros(centrosData));
      setUsuarios(usuariosActivos);
    } catch (err) {
      const apiError = err.response?.data?.error || 'No se pudo cargar el catalogo de centros de costo.';
      setError(apiError);
    } finally {
      setLoading(false);
    }
  }, [centrosApi, sociedadId, usuariosService]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
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
    setForm((previous) => ({ ...previous, [field]: value }));
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
    const usuarioAprobadorId = form.usuario_aprobador_id ? Number(form.usuario_aprobador_id) : null;
    const aprobador = usuarios.find((usuario) => usuario.id === usuarioAprobadorId) || null;

    if (!codigo || !nombre || !form.centro_padre_id || !aprobador) {
      setError('Completa codigo, nombre, centro padre y usuario aprobador.');
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
          usuario_aprobador_id: aprobador.id,
          usuario_aprobador_nombre: aprobador.nombre,
          usuario_aprobador_email: aprobador.email,
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
  }, [centros, centrosApi, editingId, form, resetForm, sociedadId, usuarios]);

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
        const usuarioAprobadorId = approverFromCsv?.id ?? existing?.usuario_aprobador_id ?? null;

        if (row.email_aprobador && !approverFromCsv && !existing?.usuario_aprobador_id) {
          warnings.push(`Se omitio ${row.codigo}: no se encontro aprobador activo para ${row.email_aprobador}.`);
          skipped += 1;
          return;
        }

        if (!usuarioAprobadorId) {
          warnings.push(`Se omitio ${row.codigo}: no tiene usuario aprobador resoluble.`);
          skipped += 1;
          return;
        }

        if (row.email_aprobador && !approverFromCsv && existing?.usuario_aprobador_id) {
          warnings.push(`No se encontro aprobador activo para ${row.codigo} (${row.email_aprobador}); se mantuvo el aprobador existente.`);
        }

        const nextCentro = {
          ...existing,
          id: existing?.id || null,
          codigo: row.codigo,
          nombre: row.nombre,
          centro_padre_codigo: row.codigo_padre === ROOT_PARENT_CODE ? '' : row.codigo_padre,
          centro_padre_id: existing?.centro_padre_id || null,
          usuario_aprobador_id: usuarioAprobadorId,
          usuario_aprobador_nombre: approverFromCsv?.nombre ?? existing?.usuario_aprobador_nombre ?? '',
          usuario_aprobador_email: approverFromCsv?.email ?? existing?.usuario_aprobador_email ?? '',
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
  }, [centros, persistCentros, sociedadId, usuarios]);

  return {
    centros,
    usuarios,
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
