import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { readScopedValue } from '../shared/listScope.js';
import { proveedoresApi } from '../../services/proveedoresApi.js';
import { tablasPagoApi } from '../../services/tablasPagoApi.js';
import {
  MAX_TABLA_PAGO_BYTES,
  MAX_TABLA_PAGO_MB,
  proveedorLabel,
  toBase64,
} from './utils.js';

const buildScopeKey = ({ sociedadId }) => (sociedadId ? String(sociedadId) : '');

const createFormState = ({ scopeKey }) => ({
  scopeKey,
  proveedorQuery: '',
  showProveedorList: false,
  selectedProveedor: null,
  tablaNombre: '',
  tablaFile: null,
});

const createDataState = ({ scopeKey }) => ({
  scopeKey,
  loading: false,
  proveedores: [],
  tablasPago: [],
});

const createStatusState = ({ scopeKey }) => ({
  scopeKey,
  saving: false,
  deletingId: null,
  message: '',
  error: '',
});

const resolveScopedState = (state, scopeKey, factory) => (
  state?.scopeKey === scopeKey ? state : factory({ scopeKey })
);

const resolveActionValue = (value, previousValue) => (
  typeof value === 'function' ? value(previousValue) : value
);

export const useTablasPagoIngenieria = ({
  sociedadId,
  dependencies = {},
}) => {
  const {
    proveedoresClient = proveedoresApi,
    tablasPagoClient = tablasPagoApi,
    fileToBase64 = toBase64,
    confirmDelete = (message) => window.confirm(message),
  } = dependencies;

  const currentScopeKey = buildScopeKey({ sociedadId });
  const requestIdRef = useRef(0);
  const [formState, setFormState] = useState(() => createFormState({ scopeKey: currentScopeKey }));
  const [dataState, setDataState] = useState(() => createDataState({ scopeKey: currentScopeKey }));
  const [statusState, setStatusState] = useState(() => createStatusState({ scopeKey: currentScopeKey }));

  const proveedorQuery = sociedadId
    ? readScopedValue(formState, currentScopeKey, 'proveedorQuery', '')
    : '';
  const showProveedorList = sociedadId
    ? readScopedValue(formState, currentScopeKey, 'showProveedorList', false)
    : false;
  const selectedProveedor = sociedadId
    ? readScopedValue(formState, currentScopeKey, 'selectedProveedor', null)
    : null;
  const tablaNombre = sociedadId
    ? readScopedValue(formState, currentScopeKey, 'tablaNombre', '')
    : '';
  const tablaFile = sociedadId
    ? readScopedValue(formState, currentScopeKey, 'tablaFile', null)
    : null;
  const loading = sociedadId
    ? (
      readScopedValue(dataState, currentScopeKey, 'loading', false)
      || dataState.scopeKey !== currentScopeKey
    )
    : false;
  const proveedores = useMemo(() => (
    sociedadId ? readScopedValue(dataState, currentScopeKey, 'proveedores', []) : []
  ), [currentScopeKey, dataState, sociedadId]);
  const tablasPago = useMemo(() => (
    sociedadId ? readScopedValue(dataState, currentScopeKey, 'tablasPago', []) : []
  ), [currentScopeKey, dataState, sociedadId]);
  const saving = sociedadId
    ? readScopedValue(statusState, currentScopeKey, 'saving', false)
    : false;
  const deletingId = sociedadId
    ? readScopedValue(statusState, currentScopeKey, 'deletingId', null)
    : null;
  const message = sociedadId
    ? readScopedValue(statusState, currentScopeKey, 'message', '')
    : '';
  const error = sociedadId
    ? readScopedValue(statusState, currentScopeKey, 'error', '')
    : '';

  const setError = useCallback((value) => {
    setStatusState((previous) => {
      const current = resolveScopedState(previous, currentScopeKey, createStatusState);
      return {
        ...current,
        scopeKey: currentScopeKey,
        error: String(resolveActionValue(value, current.error) || ''),
      };
    });
  }, [currentScopeKey]);

  const setMessage = useCallback((value) => {
    setStatusState((previous) => {
      const current = resolveScopedState(previous, currentScopeKey, createStatusState);
      return {
        ...current,
        scopeKey: currentScopeKey,
        message: String(resolveActionValue(value, current.message) || ''),
      };
    });
  }, [currentScopeKey]);

  const setShowProveedorList = useCallback((value) => {
    setFormState((previous) => {
      const current = resolveScopedState(previous, currentScopeKey, createFormState);
      return {
        ...current,
        scopeKey: currentScopeKey,
        showProveedorList: Boolean(resolveActionValue(value, current.showProveedorList)),
      };
    });
  }, [currentScopeKey]);

  const setTablaNombre = useCallback((value) => {
    setFormState((previous) => {
      const current = resolveScopedState(previous, currentScopeKey, createFormState);
      return {
        ...current,
        scopeKey: currentScopeKey,
        tablaNombre: String(resolveActionValue(value, current.tablaNombre) || ''),
      };
    });
  }, [currentScopeKey]);

  const setTablaFile = useCallback((value) => {
    setFormState((previous) => {
      const current = resolveScopedState(previous, currentScopeKey, createFormState);
      return {
        ...current,
        scopeKey: currentScopeKey,
        tablaFile: resolveActionValue(value, current.tablaFile),
      };
    });
  }, [currentScopeKey]);

  const validateFileSize = useCallback((file) => {
    if (!file) return true;
    if (file.size > MAX_TABLA_PAGO_BYTES) {
      setTablaFile(null);
      setError(`El archivo supera el tamano maximo permitido (${MAX_TABLA_PAGO_MB} MB).`);
      return false;
    }
    return true;
  }, [setError, setTablaFile]);

  const loadData = useCallback(async ({
    showLoader = true,
    targetScopeKey = currentScopeKey,
  } = {}) => {
    const requestId = ++requestIdRef.current;
    const targetSociedadId = Number(targetScopeKey || 0);

    if (!targetScopeKey || !targetSociedadId) {
      return;
    }

    if (showLoader) {
      setDataState((previous) => {
        const current = resolveScopedState(previous, targetScopeKey, createDataState);
        return {
          ...current,
          scopeKey: targetScopeKey,
          loading: true,
        };
      });
    }

    try {
      const [proveedoresRes, tablasRes] = await Promise.all([
        proveedoresClient.listProveedores(targetSociedadId),
        tablasPagoClient.listTablasPago({ sociedadId: targetSociedadId }),
      ]);

      if (requestIdRef.current !== requestId) {
        return;
      }

      setDataState({
        scopeKey: targetScopeKey,
        loading: false,
        proveedores: proveedoresRes.data?.data || [],
        tablasPago: tablasRes.data?.data || [],
      });
    } catch (err) {
      if (requestIdRef.current !== requestId) {
        return;
      }

      const apiError = err.response?.data?.error || 'No se pudieron cargar las tablas de pago.';
      setStatusState((previous) => {
        const current = resolveScopedState(previous, targetScopeKey, createStatusState);
        return {
          ...current,
          scopeKey: targetScopeKey,
          error: apiError,
        };
      });
      setDataState((previous) => {
        const current = resolveScopedState(previous, targetScopeKey, createDataState);
        return {
          ...current,
          scopeKey: targetScopeKey,
          loading: false,
        };
      });
    }
  }, [currentScopeKey, proveedoresClient, tablasPagoClient]);

  useEffect(() => {
    requestIdRef.current += 1;
    if (!sociedadId) {
      return;
    }

    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) {
        void loadData({ showLoader: true, targetScopeKey: currentScopeKey });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [currentScopeKey, loadData, sociedadId]);

  const filteredProveedores = useMemo(() => {
    const term = proveedorQuery.trim().toLowerCase();
    if (!term) {
      return proveedores.slice(0, 10);
    }

    return proveedores
      .filter((proveedor) => (
        `${proveedor.nombre} ${proveedor.identificacion_numero} ${proveedor.nombre_comercial || ''}`
          .toLowerCase()
          .includes(term)
      ))
      .slice(0, 15);
  }, [proveedorQuery, proveedores]);

  const proveedoresConTablas = useMemo(() => {
    const byId = new Map(proveedores.map((proveedor) => [Number(proveedor.id), proveedor]));
    const grouped = new Map();

    tablasPago.forEach((tabla) => {
      const proveedorId = Number(tabla.proveedor_id);
      if (!grouped.has(proveedorId)) {
        grouped.set(proveedorId, []);
      }
      grouped.get(proveedorId).push(tabla);
    });

    return Array.from(grouped.entries())
      .map(([proveedorId, tablas]) => ({
        proveedorId,
        proveedor: byId.get(proveedorId) || null,
        tablas: [...tablas].sort((a, b) => new Date(b.creado_en) - new Date(a.creado_en)),
      }))
      .sort((a, b) => {
        const nameA = (a.proveedor?.nombre || '').toLowerCase();
        const nameB = (b.proveedor?.nombre || '').toLowerCase();
        return nameA.localeCompare(nameB);
      });
  }, [proveedores, tablasPago]);

  const onProveedorSelect = useCallback((proveedor) => {
    setFormState((previous) => {
      const current = resolveScopedState(previous, currentScopeKey, createFormState);
      return {
        ...current,
        scopeKey: currentScopeKey,
        selectedProveedor: proveedor,
        proveedorQuery: proveedorLabel(proveedor),
        showProveedorList: false,
      };
    });
  }, [currentScopeKey]);

  const onProveedorInputChange = useCallback((value) => {
    setFormState((previous) => {
      const current = resolveScopedState(previous, currentScopeKey, createFormState);
      const nextValue = String(value || '');
      const shouldClearSelected = current.selectedProveedor
        && nextValue !== proveedorLabel(current.selectedProveedor);

      return {
        ...current,
        scopeKey: currentScopeKey,
        proveedorQuery: nextValue,
        showProveedorList: true,
        selectedProveedor: shouldClearSelected ? null : current.selectedProveedor,
      };
    });
  }, [currentScopeKey]);

  const handleUpload = useCallback(async (e) => {
    e.preventDefault();
    if (!sociedadId) {
      setError('Seleccione una sociedad para continuar.');
      return;
    }
    if (!selectedProveedor) {
      setError('Seleccione un proveedor.');
      return;
    }
    if (!tablaFile) {
      setError('Seleccione un archivo PDF.');
      return;
    }
    if (!validateFileSize(tablaFile)) {
      return;
    }

    try {
      setStatusState((previous) => {
        const current = resolveScopedState(previous, currentScopeKey, createStatusState);
        return {
          ...current,
          scopeKey: currentScopeKey,
          saving: true,
          error: '',
          message: '',
        };
      });

      const fileBase64 = await fileToBase64(tablaFile);
      await tablasPagoClient.createTablaPago({
        sociedad_id: Number(sociedadId),
        proveedor_id: Number(selectedProveedor.id),
        nombre: tablaNombre.trim() || tablaFile.name,
        filename: tablaFile.name,
        file_base64: fileBase64,
      });

      setFormState((previous) => {
        const current = resolveScopedState(previous, currentScopeKey, createFormState);
        return {
          ...current,
          scopeKey: currentScopeKey,
          tablaNombre: '',
          tablaFile: null,
        };
      });
      setMessage('Tabla de pago cargada correctamente.');
      await loadData({ showLoader: false, targetScopeKey: currentScopeKey });
    } catch (err) {
      const apiError = err.response?.data?.error || 'No se pudo subir la tabla de pago.';
      setError(apiError);
    } finally {
      setStatusState((previous) => {
        const current = resolveScopedState(previous, currentScopeKey, createStatusState);
        return {
          ...current,
          scopeKey: currentScopeKey,
          saving: false,
        };
      });
    }
  }, [
    currentScopeKey,
    fileToBase64,
    loadData,
    selectedProveedor,
    setError,
    setMessage,
    sociedadId,
    tablaFile,
    tablaNombre,
    tablasPagoClient,
    validateFileSize,
  ]);

  const handleDeleteTabla = useCallback(async (tabla) => {
    if (!tabla?.id) {
      return;
    }

    if (!sociedadId) {
      setError('Seleccione una sociedad para continuar.');
      return;
    }

    const isConfirmed = confirmDelete(`Desea eliminar la tabla de pago "${tabla.nombre}"?`);
    if (!isConfirmed) {
      return;
    }

    try {
      setStatusState((previous) => {
        const current = resolveScopedState(previous, currentScopeKey, createStatusState);
        return {
          ...current,
          scopeKey: currentScopeKey,
          deletingId: tabla.id,
          error: '',
          message: '',
        };
      });

      await tablasPagoClient.deleteTablaPago({
        tablaPagoId: tabla.id,
        sociedadId: Number(sociedadId),
      });

      setMessage('Tabla de pago eliminada correctamente.');
      await loadData({ showLoader: false, targetScopeKey: currentScopeKey });
    } catch (err) {
      const apiError = err.response?.data?.error || 'No se pudo eliminar la tabla de pago.';
      setError(apiError);
    } finally {
      setStatusState((previous) => {
        const current = resolveScopedState(previous, currentScopeKey, createStatusState);
        return {
          ...current,
          scopeKey: currentScopeKey,
          deletingId: null,
        };
      });
    }
  }, [
    confirmDelete,
    currentScopeKey,
    loadData,
    setError,
    setMessage,
    sociedadId,
    tablasPagoClient,
  ]);

  return {
    loading,
    saving,
    deletingId,
    message,
    error,
    proveedorQuery,
    showProveedorList,
    selectedProveedor,
    tablaNombre,
    tablaFile,
    filteredProveedores,
    proveedoresConTablas,
    setShowProveedorList,
    setTablaNombre,
    setTablaFile,
    setError,
    onProveedorSelect,
    onProveedorInputChange,
    handleUpload,
    handleDeleteTabla,
    validateFileSize,
  };
};
