import { useCallback, useEffect, useMemo, useState } from 'react';
import { proveedoresApi } from '../../services/proveedoresApi';
import { ordenesCompraApi } from '../../services/ordenesCompraApi';
import {
  MAX_ORDEN_COMPRA_BYTES,
  MAX_ORDEN_COMPRA_MB,
  MONEDAS_OPCIONES,
  toBase64
} from './utils';

const initialMoneda = MONEDAS_OPCIONES[0] || 'CRC';
const buildAutoResultKey = (file, index) => `${file?.webkitRelativePath || file?.name || 'archivo'}::${index}`;

export const useOrdenesCompraIngenieria = ({ sociedadId }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [updatingEstadoId, setUpdatingEstadoId] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('');
  const [proveedores, setProveedores] = useState([]);
  const [ordenesCompra, setOrdenesCompra] = useState([]);
  const [selectedProveedorId, setSelectedProveedorId] = useState('');
  const [ordenNumero, setOrdenNumero] = useState('');
  const [ordenMonto, setOrdenMonto] = useState('');
  const [ordenMoneda, setOrdenMoneda] = useState(initialMoneda);
  const [ordenFecha, setOrdenFecha] = useState(new Date().toISOString().slice(0, 10));
  const [ordenFile, setOrdenFile] = useState(null);
  const [autoFiles, setAutoFiles] = useState([]);
  const [autoImporting, setAutoImporting] = useState(false);
  const [autoResults, setAutoResults] = useState([]);

  const validateFileSize = (file) => {
    if (!file) return true;
    if (file.size > MAX_ORDEN_COMPRA_BYTES) {
      setOrdenFile(null);
      setError(`El archivo supera el tamano maximo permitido (${MAX_ORDEN_COMPRA_MB} MB).`);
      return false;
    }
    return true;
  };

  const resetForm = () => {
    setSelectedProveedorId('');
    setOrdenNumero('');
    setOrdenMonto('');
    setOrdenMoneda(initialMoneda);
    setOrdenFecha(new Date().toISOString().slice(0, 10));
    setOrdenFile(null);
  };

  const loadData = useCallback(async ({ showLoader = true } = {}) => {
    if (!sociedadId) {
      setProveedores([]);
      setOrdenesCompra([]);
      if (showLoader) setLoading(false);
      return;
    }

    try {
      if (showLoader) setLoading(true);
      const [proveedoresRes, ordenesRes] = await Promise.all([
        proveedoresApi.listProveedores(sociedadId),
        ordenesCompraApi.listOrdenesCompra({
          sociedadId,
          estado: estadoFilter || undefined
        })
      ]);

      setProveedores(proveedoresRes.data?.data || []);
      setOrdenesCompra(ordenesRes.data?.data || []);
    } catch (err) {
      const apiError = err.response?.data?.error || 'No se pudieron cargar las ordenes de compra.';
      setError(apiError);
    } finally {
      if (showLoader) setLoading(false);
    }
  }, [sociedadId, estadoFilter]);

  useEffect(() => {
    resetForm();
    setMessage('');
    setError('');
    setEstadoFilter('');
    setAutoFiles([]);
    setAutoResults([]);
    loadData();
  }, [sociedadId, loadData]);

  useEffect(() => {
    if (!sociedadId) return;
    loadData({ showLoader: false });
  }, [estadoFilter, sociedadId, loadData]);

  const proveedoresOrdenados = useMemo(
    () => [...proveedores].sort((a, b) => String(a.nombre || '').localeCompare(String(b.nombre || ''))),
    [proveedores]
  );

  const selectedProveedor = useMemo(
    () => proveedores.find((proveedor) => String(proveedor.id) === String(selectedProveedorId)) || null,
    [proveedores, selectedProveedorId]
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
        ordenes: [...ordenes].sort((a, b) => new Date(b.creado_en) - new Date(a.creado_en))
      }))
      .sort((a, b) => {
        const nameA = (a.proveedor?.nombre || '').toLowerCase();
        const nameB = (b.proveedor?.nombre || '').toLowerCase();
        return nameA.localeCompare(nameB);
      });
  }, [proveedores, ordenesCompra]);

  const onProveedorChange = (value) => {
    setSelectedProveedorId(value);
  };

  const handleAutoFilesChange = (fileList) => {
    const files = Array.from(fileList || [])
      .filter((file) => /\.pdf$/i.test(file?.name || ''));
    setAutoFiles(files);
    setAutoResults([]);
  };

  const handleUpload = async (e) => {
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
      setSaving(true);
      setError('');
      setMessage('');

      const fileBase64 = await toBase64(ordenFile);
      await ordenesCompraApi.createOrdenCompra({
        sociedad_id: Number(sociedadId),
        proveedor_id: Number(selectedProveedor.id),
        numero_oc: ordenNumero.trim(),
        monto: montoValue,
        moneda: ordenMoneda,
        fecha: ordenFecha,
        filename: ordenFile.name,
        file_base64: fileBase64
      });

      resetForm();
      setMessage('Orden de compra cargada correctamente.');
      await loadData({ showLoader: false });
    } catch (err) {
      const apiError = err.response?.data?.error || 'No se pudo subir la orden de compra.';
      setError(apiError);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteOrden = async (orden) => {
    if (!orden?.id) {
      return;
    }

    if (!sociedadId) {
      setError('Seleccione una sociedad para continuar.');
      return;
    }

    const confirmDelete = window.confirm(`Desea eliminar la orden de compra "${orden.nombre}"?`);
    if (!confirmDelete) {
      return;
    }

    try {
      setDeletingId(orden.id);
      setError('');
      setMessage('');

      await ordenesCompraApi.deleteOrdenCompra({
        ordenCompraId: orden.id,
        sociedadId: Number(sociedadId)
      });

      setMessage('Orden de compra eliminada correctamente.');
      await loadData({ showLoader: false });
    } catch (err) {
      const apiError = err.response?.data?.error || 'No se pudo eliminar la orden de compra.';
      setError(apiError);
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleEstadoManual = async (orden) => {
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
      setUpdatingEstadoId(orden.id);
      setError('');
      setMessage('');

      await ordenesCompraApi.updateEstadoManual({
        ordenCompraId: orden.id,
        sociedadId: Number(sociedadId),
        estado: nextEstado
      });

      setMessage(`Orden de compra ${nextEstado} manualmente.`);
      await loadData({ showLoader: false });
    } catch (err) {
      const apiError = err.response?.data?.error || 'No se pudo actualizar el estado de la orden de compra.';
      setError(apiError);
    } finally {
      setUpdatingEstadoId(null);
    }
  };

  const handleAutoImport = async () => {
    if (!sociedadId) {
      setError('Seleccione una sociedad para continuar.');
      return;
    }

    if (!Array.isArray(autoFiles) || autoFiles.length === 0) {
      setError('Seleccione una carpeta con archivos PDF.');
      return;
    }

    try {
      setAutoImporting(true);
      setError('');
      setMessage('');
      setAutoResults([]);

      const results = [];

      for (const [fileIndex, file] of autoFiles.entries()) {
        const rowKey = buildAutoResultKey(file, fileIndex);

        try {
          if (!validateFileSize(file)) {
            results.push({
              rowKey,
              filename: file.webkitRelativePath || file.name,
              status: 'error',
              error: `El archivo supera ${MAX_ORDEN_COMPRA_MB} MB`
            });
            continue;
          }

          const fileBase64 = await toBase64(file);
          const response = await ordenesCompraApi.autoImportOrdenCompra({
            sociedad_id: Number(sociedadId),
            filename: file.name,
            file_base64: fileBase64
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
            fecha: data.extraido?.fecha || ''
          });
        } catch (err) {
          results.push({
            rowKey,
            filename: file.webkitRelativePath || file.name,
            status: 'error',
            error: err.response?.data?.error || 'No se pudo importar este archivo'
          });
        }
      }

      setAutoResults(results);

      const okCount = results.filter((item) => item.status === 'ok').length;
      const errorCount = results.length - okCount;
      setMessage(`Importacion automatica finalizada. Exitosas: ${okCount}. Errores: ${errorCount}.`);
      await loadData({ showLoader: false });
    } finally {
      setAutoImporting(false);
    }
  };

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
    validateFileSize
  };
};
