import { useEffect, useMemo, useState } from 'react';
import { proveedoresApi } from '../../services/proveedoresApi';
import { tablasPagoApi } from '../../services/tablasPagoApi';
import {
  MAX_TABLA_PAGO_BYTES,
  MAX_TABLA_PAGO_MB,
  proveedorLabel,
  toBase64
} from './utils';

export const useTablasPagoIngenieria = ({ sociedadId }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [proveedores, setProveedores] = useState([]);
  const [tablasPago, setTablasPago] = useState([]);
  const [proveedorQuery, setProveedorQuery] = useState('');
  const [showProveedorList, setShowProveedorList] = useState(false);
  const [selectedProveedor, setSelectedProveedor] = useState(null);
  const [tablaNombre, setTablaNombre] = useState('');
  const [tablaFile, setTablaFile] = useState(null);

  const validateFileSize = (file) => {
    if (!file) return true;
    if (file.size > MAX_TABLA_PAGO_BYTES) {
      setTablaFile(null);
      setError(`El archivo supera el tamano maximo permitido (${MAX_TABLA_PAGO_MB} MB).`);
      return false;
    }
    return true;
  };

  const loadData = async ({ showLoader = true } = {}) => {
    if (!sociedadId) {
      setProveedores([]);
      setTablasPago([]);
      setSelectedProveedor(null);
      if (showLoader) setLoading(false);
      return;
    }

    try {
      if (showLoader) setLoading(true);
      const [proveedoresRes, tablasRes] = await Promise.all([
        proveedoresApi.listProveedores(sociedadId),
        tablasPagoApi.listTablasPago({ sociedadId })
      ]);

      setProveedores(proveedoresRes.data?.data || []);
      setTablasPago(tablasRes.data?.data || []);
    } catch (err) {
      const apiError = err.response?.data?.error || 'No se pudieron cargar las tablas de pago.';
      setError(apiError);
    } finally {
      if (showLoader) setLoading(false);
    }
  };

  useEffect(() => {
    setProveedorQuery('');
    setSelectedProveedor(null);
    setTablaNombre('');
    setTablaFile(null);
    setMessage('');
    setError('');
    loadData();
  }, [sociedadId]);

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
  }, [proveedores, proveedorQuery]);

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
        tablas: [...tablas].sort((a, b) => new Date(b.creado_en) - new Date(a.creado_en))
      }))
      .sort((a, b) => {
        const nameA = (a.proveedor?.nombre || '').toLowerCase();
        const nameB = (b.proveedor?.nombre || '').toLowerCase();
        return nameA.localeCompare(nameB);
      });
  }, [proveedores, tablasPago]);

  const onProveedorSelect = (proveedor) => {
    setSelectedProveedor(proveedor);
    setProveedorQuery(proveedorLabel(proveedor));
    setShowProveedorList(false);
  };

  const onProveedorInputChange = (value) => {
    setProveedorQuery(value);
    setShowProveedorList(true);

    if (!selectedProveedor) {
      return;
    }

    if (value !== proveedorLabel(selectedProveedor)) {
      setSelectedProveedor(null);
    }
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
    if (!tablaFile) {
      setError('Seleccione un archivo PDF.');
      return;
    }
    if (!validateFileSize(tablaFile)) {
      return;
    }

    try {
      setSaving(true);
      setError('');
      setMessage('');

      const fileBase64 = await toBase64(tablaFile);
      await tablasPagoApi.createTablaPago({
        sociedad_id: Number(sociedadId),
        proveedor_id: Number(selectedProveedor.id),
        nombre: tablaNombre.trim() || tablaFile.name,
        filename: tablaFile.name,
        file_base64: fileBase64
      });

      setTablaNombre('');
      setTablaFile(null);
      setMessage('Tabla de pago cargada correctamente.');
      await loadData({ showLoader: false });
    } catch (err) {
      const apiError = err.response?.data?.error || 'No se pudo subir la tabla de pago.';
      setError(apiError);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTabla = async (tabla) => {
    if (!tabla?.id) {
      return;
    }

    if (!sociedadId) {
      setError('Seleccione una sociedad para continuar.');
      return;
    }

    const confirmDelete = window.confirm(`Desea eliminar la tabla de pago "${tabla.nombre}"?`);
    if (!confirmDelete) {
      return;
    }

    try {
      setDeletingId(tabla.id);
      setError('');
      setMessage('');

      await tablasPagoApi.deleteTablaPago({
        tablaPagoId: tabla.id,
        sociedadId: Number(sociedadId)
      });

      setMessage('Tabla de pago eliminada correctamente.');
      await loadData({ showLoader: false });
    } catch (err) {
      const apiError = err.response?.data?.error || 'No se pudo eliminar la tabla de pago.';
      setError(apiError);
    } finally {
      setDeletingId(null);
    }
  };

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
    validateFileSize
  };
};
