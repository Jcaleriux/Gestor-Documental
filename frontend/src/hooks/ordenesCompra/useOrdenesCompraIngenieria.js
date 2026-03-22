import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { readScopedValue } from '../shared/listScope.js';
import { proveedoresApi } from '../../services/proveedoresApi.js';
import { ordenesCompraApi } from '../../services/ordenesCompraApi.js';
import {
  MAX_ORDEN_COMPRA_BYTES,
  MAX_ORDEN_COMPRA_MB,
  MONEDAS_OPCIONES,
  toBase64,
} from './utils.js';

const initialMoneda = MONEDAS_OPCIONES[0] || 'CRC';
const buildAutoResultKey = (file, index) => `${file?.webkitRelativePath || file?.name || 'archivo'}::${index}`;
const buildScopeKey = ({ sociedadId }) => (sociedadId ? String(sociedadId) : '');
const buildTodayIso = (nowProvider) => nowProvider().toISOString().slice(0, 10);

const createFormState = ({ scopeKey, nowProvider }) => ({
  scopeKey,
  estadoFilter: '',
  selectedProveedorId: '',
  ordenNumero: '',
  ordenMonto: '',
  ordenMoneda: initialMoneda,
  ordenFecha: buildTodayIso(nowProvider),
  ordenFile: null,
});

const createDataState = ({ scopeKey }) => ({
  scopeKey,
  loading: false,
  proveedores: [],
  ordenesCompra: [],
});

const createStatusState = ({ scopeKey }) => ({
  scopeKey,
  saving: false,
  deletingId: null,
  updatingEstadoId: null,
  message: '',
  error: '',
});

const createAutoState = ({ scopeKey }) => ({
  scopeKey,
  autoFiles: [],
  autoImporting: false,
  autoResults: [],
});

const resolveScopedState = (state, scopeKey, factory) => (
  state?.scopeKey === scopeKey ? state : factory({ scopeKey })
);

const resolveActionValue = (value, previousValue) => (
  typeof value === 'function' ? value(previousValue) : value
);

export const useOrdenesCompraIngenieria = ({
  sociedadId,
  dependencies = {},
}) => {
  const {
    proveedoresClient = proveedoresApi,
    ordenesClient = ordenesCompraApi,
    fileToBase64 = toBase64,
    nowProvider = () => new Date(),
    confirmDelete = (message) => window.confirm(message),
  } = dependencies;

  const currentScopeKey = buildScopeKey({ sociedadId });
  const requestIdRef = useRef(0);
  const lastLoadedScopeKeyRef = useRef('');
  const lastLoadedFilterRef = useRef('');
  const [formState, setFormState] = useState(() => createFormState({ scopeKey: currentScopeKey, nowProvider }));
  const [dataState, setDataState] = useState(() => createDataState({ scopeKey: currentScopeKey }));
  const [statusState, setStatusState] = useState(() => createStatusState({ scopeKey: currentScopeKey }));
  const [autoState, setAutoState] = useState(() => createAutoState({ scopeKey: currentScopeKey }));

  const estadoFilter = sociedadId
    ? readScopedValue(formState, currentScopeKey, 'estadoFilter', '')
    : '';
  const selectedProveedorId = sociedadId
    ? readScopedValue(formState, currentScopeKey, 'selectedProveedorId', '')
    : '';
  const ordenNumero = sociedadId
    ? readScopedValue(formState, currentScopeKey, 'ordenNumero', '')
    : '';
  const ordenMonto = sociedadId
    ? readScopedValue(formState, currentScopeKey, 'ordenMonto', '')
    : '';
  const ordenMoneda = sociedadId
    ? readScopedValue(formState, currentScopeKey, 'ordenMoneda', initialMoneda)
    : initialMoneda;
  const ordenFecha = sociedadId
    ? readScopedValue(formState, currentScopeKey, 'ordenFecha', buildTodayIso(nowProvider))
    : buildTodayIso(nowProvider);
  const ordenFile = sociedadId
    ? readScopedValue(formState, currentScopeKey, 'ordenFile', null)
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
  const ordenesCompra = useMemo(() => (
    sociedadId ? readScopedValue(dataState, currentScopeKey, 'ordenesCompra', []) : []
  ), [currentScopeKey, dataState, sociedadId]);
  const saving = sociedadId
    ? readScopedValue(statusState, currentScopeKey, 'saving', false)
    : false;
  const deletingId = sociedadId
    ? readScopedValue(statusState, currentScopeKey, 'deletingId', null)
    : null;
  const updatingEstadoId = sociedadId
    ? readScopedValue(statusState, currentScopeKey, 'updatingEstadoId', null)
    : null;
  const message = sociedadId
    ? readScopedValue(statusState, currentScopeKey, 'message', '')
    : '';
  const error = sociedadId
    ? readScopedValue(statusState, currentScopeKey, 'error', '')
    : '';
  const autoFiles = useMemo(() => (
    sociedadId ? readScopedValue(autoState, currentScopeKey, 'autoFiles', []) : []
  ), [autoState, currentScopeKey, sociedadId]);
  const autoImporting = sociedadId
    ? readScopedValue(autoState, currentScopeKey, 'autoImporting', false)
    : false;
  const autoResults = useMemo(() => (
    sociedadId ? readScopedValue(autoState, currentScopeKey, 'autoResults', []) : []
  ), [autoState, currentScopeKey, sociedadId]);

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

  const setEstadoFilter = useCallback((value) => {
    setFormState((previous) => {
      const current = resolveScopedState(previous, currentScopeKey, ({ scopeKey }) => (
        createFormState({ scopeKey, nowProvider })
      ));
      return {
        ...current,
        scopeKey: currentScopeKey,
        estadoFilter: String(resolveActionValue(value, current.estadoFilter) || ''),
      };
    });
  }, [currentScopeKey, nowProvider]);

  const setSelectedProveedorId = useCallback((value) => {
    setFormState((previous) => {
      const current = resolveScopedState(previous, currentScopeKey, ({ scopeKey }) => (
        createFormState({ scopeKey, nowProvider })
      ));
      return {
        ...current,
        scopeKey: currentScopeKey,
        selectedProveedorId: String(resolveActionValue(value, current.selectedProveedorId) || ''),
      };
    });
  }, [currentScopeKey, nowProvider]);

  const setOrdenNumero = useCallback((value) => {
    setFormState((previous) => {
      const current = resolveScopedState(previous, currentScopeKey, ({ scopeKey }) => (
        createFormState({ scopeKey, nowProvider })
      ));
      return {
        ...current,
        scopeKey: currentScopeKey,
        ordenNumero: String(resolveActionValue(value, current.ordenNumero) || ''),
      };
    });
  }, [currentScopeKey, nowProvider]);

  const setOrdenMonto = useCallback((value) => {
    setFormState((previous) => {
      const current = resolveScopedState(previous, currentScopeKey, ({ scopeKey }) => (
        createFormState({ scopeKey, nowProvider })
      ));
      return {
        ...current,
        scopeKey: currentScopeKey,
        ordenMonto: String(resolveActionValue(value, current.ordenMonto) || ''),
      };
    });
  }, [currentScopeKey, nowProvider]);

  const setOrdenMoneda = useCallback((value) => {
    setFormState((previous) => {
      const current = resolveScopedState(previous, currentScopeKey, ({ scopeKey }) => (
        createFormState({ scopeKey, nowProvider })
      ));
      return {
        ...current,
        scopeKey: currentScopeKey,
        ordenMoneda: String(resolveActionValue(value, current.ordenMoneda) || initialMoneda),
      };
    });
  }, [currentScopeKey, nowProvider]);

  const setOrdenFecha = useCallback((value) => {
    setFormState((previous) => {
      const current = resolveScopedState(previous, currentScopeKey, ({ scopeKey }) => (
        createFormState({ scopeKey, nowProvider })
      ));
      return {
        ...current,
        scopeKey: currentScopeKey,
        ordenFecha: String(resolveActionValue(value, current.ordenFecha) || buildTodayIso(nowProvider)),
      };
    });
  }, [currentScopeKey, nowProvider]);

  const setOrdenFile = useCallback((value) => {
    setFormState((previous) => {
      const current = resolveScopedState(previous, currentScopeKey, ({ scopeKey }) => (
        createFormState({ scopeKey, nowProvider })
      ));
      return {
        ...current,
        scopeKey: currentScopeKey,
        ordenFile: resolveActionValue(value, current.ordenFile),
      };
    });
  }, [currentScopeKey, nowProvider]);

  const setAutoFiles = useCallback((value) => {
    setAutoState((previous) => {
      const current = resolveScopedState(previous, currentScopeKey, createAutoState);
      return {
        ...current,
        scopeKey: currentScopeKey,
        autoFiles: resolveActionValue(value, current.autoFiles) || [],
      };
    });
  }, [currentScopeKey]);

  const setAutoResults = useCallback((value) => {
    setAutoState((previous) => {
      const current = resolveScopedState(previous, currentScopeKey, createAutoState);
      return {
        ...current,
        scopeKey: currentScopeKey,
        autoResults: resolveActionValue(value, current.autoResults) || [],
      };
    });
  }, [currentScopeKey]);

  const resetForm = useCallback(() => {
    setFormState((previous) => {
      const current = resolveScopedState(previous, currentScopeKey, ({ scopeKey }) => (
        createFormState({ scopeKey, nowProvider })
      ));
      return {
        ...current,
        scopeKey: currentScopeKey,
        selectedProveedorId: '',
        ordenNumero: '',
        ordenMonto: '',
        ordenMoneda: initialMoneda,
        ordenFecha: buildTodayIso(nowProvider),
        ordenFile: null,
      };
    });
  }, [currentScopeKey, nowProvider]);

  const validateFileSize = useCallback((file) => {
    if (!file) return true;
    if (file.size > MAX_ORDEN_COMPRA_BYTES) {
      setOrdenFile(null);
      setError(`El archivo supera el tamano maximo permitido (${MAX_ORDEN_COMPRA_MB} MB).`);
      return false;
    }
    return true;
  }, [setError, setOrdenFile]);

  const loadData = useCallback(async ({
    showLoader = true,
    targetScopeKey = currentScopeKey,
    estadoOverride = '',
  } = {}) => {
    if (!sociedadId) {
      return false;
    }

    requestIdRef.current += 1;
    const requestId = requestIdRef.current;

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
      const [proveedoresRes, ordenesRes] = await Promise.all([
        proveedoresClient.listProveedores(sociedadId),
        ordenesClient.listOrdenesCompra({
          sociedadId,
          estado: estadoOverride || undefined,
        }),
      ]);

      if (requestIdRef.current !== requestId) {
        return false;
      }

      setDataState({
        scopeKey: targetScopeKey,
        loading: false,
        proveedores: proveedoresRes.data?.data || [],
        ordenesCompra: ordenesRes.data?.data || [],
      });
      lastLoadedScopeKeyRef.current = targetScopeKey;
      lastLoadedFilterRef.current = String(estadoOverride || '');

      return true;
    } catch (err) {
      if (requestIdRef.current === requestId) {
        setDataState((previous) => {
          const current = resolveScopedState(previous, targetScopeKey, createDataState);
          return {
            ...current,
            scopeKey: targetScopeKey,
            loading: false,
          };
        });
        setError(err.response?.data?.error || 'No se pudieron cargar las ordenes de compra.');
      }
      return false;
    }
  }, [currentScopeKey, ordenesClient, proveedoresClient, setError, sociedadId]);

  useEffect(() => {
    requestIdRef.current += 1;

    if (!sociedadId) {
      return;
    }

    let cancelled = false;

    queueMicrotask(() => {
      if (!cancelled) {
        void loadData({
          showLoader: true,
          targetScopeKey: currentScopeKey,
          estadoOverride: '',
        });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [currentScopeKey, loadData, sociedadId]);

  useEffect(() => {
    if (
      !sociedadId
      || lastLoadedScopeKeyRef.current !== currentScopeKey
      || lastLoadedFilterRef.current === String(estadoFilter || '')
    ) {
      return;
    }

    let cancelled = false;

    queueMicrotask(() => {
      if (!cancelled) {
        void loadData({
          showLoader: false,
          targetScopeKey: currentScopeKey,
          estadoOverride: estadoFilter,
        });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [currentScopeKey, estadoFilter, loadData, sociedadId]);

  const proveedoresOrdenados = useMemo(
    () => [...proveedores].sort((a, b) => String(a.nombre || '').localeCompare(String(b.nombre || ''))),
    [proveedores],
  );

  const selectedProveedor = useMemo(
    () => proveedores.find((proveedor) => String(proveedor.id) === String(selectedProveedorId)) || null,
    [proveedores, selectedProveedorId],
  );

  const proveedoresConOrdenes = useMemo(() => {
    const byId = new Map(proveedores.map((proveedor) => [Number(proveedor.id), proveedor]));
    const grouped = new Map();

    ordenesCompra.forEach((orden) => {
      const proveedorId = Number(orden.proveedor_id);
      if (!grouped.has(proveedorId)) {
        grouped.set(proveedorId, []);
      }
      grouped.get(proveedorId).push(orden);
    });

    return Array.from(grouped.entries())
      .map(([proveedorId, ordenes]) => ({
        proveedorId,
        proveedor: byId.get(proveedorId) || null,
        ordenes: [...ordenes].sort((a, b) => new Date(b.creado_en) - new Date(a.creado_en)),
      }))
      .sort((a, b) => {
        const nameA = (a.proveedor?.nombre || '').toLowerCase();
        const nameB = (b.proveedor?.nombre || '').toLowerCase();
        return nameA.localeCompare(nameB);
      });
  }, [proveedores, ordenesCompra]);

  const onProveedorChange = useCallback((value) => {
    setSelectedProveedorId(value);
  }, [setSelectedProveedorId]);

  const handleAutoFilesChange = useCallback((fileList) => {
    const files = Array.from(fileList || [])
      .filter((file) => /\.pdf$/i.test(file?.name || ''));
    setAutoFiles(files);
    setAutoResults([]);
  }, [setAutoFiles, setAutoResults]);

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
    if (!ordenFile) {
      setError('Seleccione un archivo PDF.');
      return;
    }
    if (!validateFileSize(ordenFile)) {
      return;
    }

    const montoValue = Number(ordenMonto);
    if (!Number.isFinite(montoValue) || montoValue <= 0) {
      setError('Ingrese un monto valido mayor a 0.');
      return;
    }

    if (!ordenNumero.trim()) {
      setError('Ingrese el numero de OC.');
      return;
    }

    if (!ordenFecha) {
      setError('Seleccione una fecha.');
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

      const fileBase64 = await fileToBase64(ordenFile);
      await ordenesClient.createOrdenCompra({
        sociedad_id: Number(sociedadId),
        proveedor_id: Number(selectedProveedor.id),
        numero_oc: ordenNumero.trim(),
        monto: montoValue,
        moneda: ordenMoneda,
        fecha: ordenFecha,
        filename: ordenFile.name,
        file_base64: fileBase64,
      });

      resetForm();
      setMessage('Orden de compra cargada correctamente.');
      await loadData({ showLoader: false, estadoOverride: estadoFilter });
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo subir la orden de compra.');
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
    ordenFecha,
    ordenFile,
    ordenMoneda,
    ordenNumero,
    ordenMonto,
    ordenesClient,
    resetForm,
    selectedProveedor,
    estadoFilter,
    setError,
    setMessage,
    sociedadId,
    validateFileSize,
  ]);

  const handleDeleteOrden = useCallback(async (orden) => {
    if (!orden?.id) {
      return;
    }

    if (!sociedadId) {
      setError('Seleccione una sociedad para continuar.');
      return;
    }

    const confirmDeleteResult = confirmDelete(`Desea eliminar la orden de compra "${orden.nombre}"?`);
    if (!confirmDeleteResult) {
      return;
    }

    try {
      setStatusState((previous) => {
        const current = resolveScopedState(previous, currentScopeKey, createStatusState);
        return {
          ...current,
          scopeKey: currentScopeKey,
          deletingId: orden.id,
          error: '',
          message: '',
        };
      });

      await ordenesClient.deleteOrdenCompra({
        ordenCompraId: orden.id,
        sociedadId: Number(sociedadId),
      });

      setMessage('Orden de compra eliminada correctamente.');
      await loadData({ showLoader: false, estadoOverride: estadoFilter });
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo eliminar la orden de compra.');
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
  }, [confirmDelete, currentScopeKey, estadoFilter, loadData, ordenesClient, setError, setMessage, sociedadId]);

  const handleToggleEstadoManual = useCallback(async (orden) => {
    if (!orden?.id) {
      return;
    }

    if (!sociedadId) {
      setError('Seleccione una sociedad para continuar.');
      return;
    }

    const estadoActual = String(orden.estado || '').toLowerCase();
    const nextEstado = estadoActual === 'cerrada' ? 'abierta' : 'cerrada';

    try {
      setStatusState((previous) => {
        const current = resolveScopedState(previous, currentScopeKey, createStatusState);
        return {
          ...current,
          scopeKey: currentScopeKey,
          updatingEstadoId: orden.id,
          error: '',
          message: '',
        };
      });

      await ordenesClient.updateEstadoManual({
        ordenCompraId: orden.id,
        sociedadId: Number(sociedadId),
        estado: nextEstado,
      });

      setMessage(`Orden de compra ${nextEstado} manualmente.`);
      await loadData({ showLoader: false, estadoOverride: estadoFilter });
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo actualizar el estado de la orden de compra.');
    } finally {
      setStatusState((previous) => {
        const current = resolveScopedState(previous, currentScopeKey, createStatusState);
        return {
          ...current,
          scopeKey: currentScopeKey,
          updatingEstadoId: null,
        };
      });
    }
  }, [currentScopeKey, estadoFilter, loadData, ordenesClient, setError, setMessage, sociedadId]);

  const handleAutoImport = useCallback(async () => {
    if (!sociedadId) {
      setError('Seleccione una sociedad para continuar.');
      return;
    }

    if (!Array.isArray(autoFiles) || autoFiles.length === 0) {
      setError('Seleccione una carpeta con archivos PDF.');
      return;
    }

    try {
      setAutoState((previous) => {
        const current = resolveScopedState(previous, currentScopeKey, createAutoState);
        return {
          ...current,
          scopeKey: currentScopeKey,
          autoImporting: true,
          autoResults: [],
        };
      });
      setError('');
      setMessage('');

      const results = [];

      for (const [fileIndex, file] of autoFiles.entries()) {
        const rowKey = buildAutoResultKey(file, fileIndex);

        try {
          if (!validateFileSize(file)) {
            results.push({
              rowKey,
              filename: file.webkitRelativePath || file.name,
              status: 'error',
              error: `El archivo supera ${MAX_ORDEN_COMPRA_MB} MB`,
            });
            continue;
          }

          const fileBase64 = await fileToBase64(file);
          const response = await ordenesClient.autoImportOrdenCompra({
            sociedad_id: Number(sociedadId),
            filename: file.name,
            file_base64: fileBase64,
          });
          const data = response.data?.data || {};
          results.push({
            rowKey,
            filename: file.webkitRelativePath || file.name,
            status: 'ok',
            numero_oc: data.extraido?.numero_oc || data.orden?.nombre || '',
            proveedor: data.extraido?.proveedor_nombre || '',
            moneda: data.extraido?.moneda || '',
            monto: data.extraido?.monto ?? null,
            fecha: data.extraido?.fecha || '',
          });
        } catch (err) {
          results.push({
            rowKey,
            filename: file.webkitRelativePath || file.name,
            status: 'error',
            error: err.response?.data?.error || 'No se pudo importar este archivo',
          });
        }
      }

      setAutoResults(results);

      const okCount = results.filter((item) => item.status === 'ok').length;
      const errorCount = results.length - okCount;
      setMessage(`Importacion automatica finalizada. Exitosas: ${okCount}. Errores: ${errorCount}.`);
      await loadData({ showLoader: false, estadoOverride: estadoFilter });
    } finally {
      setAutoState((previous) => {
        const current = resolveScopedState(previous, currentScopeKey, createAutoState);
        return {
          ...current,
          scopeKey: currentScopeKey,
          autoImporting: false,
        };
      });
    }
  }, [
    autoFiles,
    currentScopeKey,
    estadoFilter,
    fileToBase64,
    loadData,
    ordenesClient,
    setAutoResults,
    setError,
    setMessage,
    sociedadId,
    validateFileSize,
  ]);

  return {
    loading,
    saving,
    deletingId,
    updatingEstadoId,
    message,
    error,
    estadoFilter,
    proveedoresOrdenados,
    selectedProveedor,
    ordenNumero,
    ordenMonto,
    ordenMoneda,
    ordenFecha,
    ordenFile,
    autoFiles,
    autoImporting,
    autoResults,
    proveedoresConOrdenes,
    setEstadoFilter,
    setOrdenNumero,
    setOrdenMonto,
    setOrdenMoneda,
    setOrdenFecha,
    setOrdenFile,
    setError,
    onProveedorChange,
    handleAutoFilesChange,
    handleAutoImport,
    handleUpload,
    handleDeleteOrden,
    handleToggleEstadoManual,
    validateFileSize,
  };
};
