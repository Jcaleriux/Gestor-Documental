import { useCallback, useEffect, useState } from 'react';
import { facturaDetalleApi } from '../../services/facturaDetalleApi.js';
import {
  buildContaState,
  buildNotaCreditoActual,
  buildTablaPagoActual,
  createInitialContaState,
  inferirProveedorDesdeFactura,
  toInputDate
} from './utils.js';

const defaultNowProvider = () => new Date();

export const useFacturaDetalleData = ({ id, sociedadId, dependencies = {} }) => {
  const {
    facturaApi = facturaDetalleApi,
    nowProvider = defaultNowProvider
  } = dependencies;

  const [factura, setFactura] = useState(null);
  const [comentarios, setComentarios] = useState([]);
  const [estados, setEstados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [commentUser, setCommentUser] = useState('admin');
  const [commentText, setCommentText] = useState('');
  const [estadoNuevo, setEstadoNuevo] = useState('');
  const [estadoUser, setEstadoUser] = useState('admin');
  const [estadoMotivo, setEstadoMotivo] = useState('');
  const [error, setError] = useState('');
  const [mhLoading, setMhLoading] = useState(false);
  const [mhError, setMhError] = useState('');
  const [proveedoresSociedad, setProveedoresSociedad] = useState([]);
  const [tablasPagoProveedor, setTablasPagoProveedor] = useState([]);
  const [tablaPagoActual, setTablaPagoActual] = useState(null);
  const [tablasModalOpen, setTablasModalOpen] = useState(false);
  const [tablasLoading, setTablasLoading] = useState(false);
  const [tablasError, setTablasError] = useState('');
  const [notasCreditoProveedor, setNotasCreditoProveedor] = useState([]);
  const [notaCreditoActual, setNotaCreditoActual] = useState(null);
  const [notasModalOpen, setNotasModalOpen] = useState(false);
  const [notasLoading, setNotasLoading] = useState(false);
  const [notasError, setNotasError] = useState('');
  const [retencionPagos, setRetencionPagos] = useState([]);
  const [conta, setConta] = useState(createInitialContaState);
  const [contaSaving, setContaSaving] = useState(false);
  const [contaMessage, setContaMessage] = useState('');
  const [contaError, setContaError] = useState('');
  const [retencionPagoMonto, setRetencionPagoMonto] = useState('');
  const [retencionPagoFecha, setRetencionPagoFecha] = useState('');
  const [retencionPagoNotas, setRetencionPagoNotas] = useState('');
  const [retencionPagoSaving, setRetencionPagoSaving] = useState(false);
  const [retencionPagoError, setRetencionPagoError] = useState('');
  const [retencionPagoMessage, setRetencionPagoMessage] = useState('');

  const fetchAll = useCallback(async () => {
    if (!id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');
      const [facturaRes, comentariosRes, estadosRes, contaRes] = await Promise.all([
        facturaApi.getFactura(id),
        facturaApi.getComentarios(id),
        facturaApi.getEstados(id),
        facturaApi.getContabilizacion(id)
      ]);

      const facturaData = facturaRes.data.data || null;
      const contaData = contaRes.data.data || {};

      setFactura(facturaData);
      setComentarios(comentariosRes.data.data || []);
      setEstados(estadosRes.data.data || []);
      setRetencionPagos(Array.isArray(contaData.retencion_pagos) ? contaData.retencion_pagos : []);

      let proveedoresData = [];
      if (facturaData?.sociedad_id) {
        try {
          const proveedoresRes = await facturaApi.getProveedores(facturaData.sociedad_id);
          proveedoresData = proveedoresRes.data?.data || [];
        } catch {
          proveedoresData = [];
        }
      }
      setProveedoresSociedad(proveedoresData);

      const proveedorInferido = inferirProveedorDesdeFactura(facturaData, proveedoresData);
      const tablaActual = buildTablaPagoActual(contaData);
      const notaActual = buildNotaCreditoActual(contaData);

      setTablaPagoActual(tablaActual);
      setNotaCreditoActual(notaActual);
      setConta(buildContaState({
        contaData,
        facturaData,
        proveedorInferido,
        notaActual
      }));
      setRetencionPagoFecha(toInputDate(nowProvider()));
    } catch (err) {
      console.error(err);
      setError('No se pudo cargar el detalle.');
    } finally {
      setLoading(false);
    }
  }, [id, facturaApi, nowProvider]);

  useEffect(() => {
    if (!sociedadId) {
      setLoading(false);
      return;
    }
    fetchAll();
  }, [fetchAll, id, sociedadId]);

  return {
    factura,
    setFactura,
    comentarios,
    setComentarios,
    estados,
    setEstados,
    loading,
    setLoading,
    commentUser,
    setCommentUser,
    commentText,
    setCommentText,
    estadoNuevo,
    setEstadoNuevo,
    estadoUser,
    setEstadoUser,
    estadoMotivo,
    setEstadoMotivo,
    error,
    setError,
    mhLoading,
    setMhLoading,
    mhError,
    setMhError,
    proveedoresSociedad,
    setProveedoresSociedad,
    tablasPagoProveedor,
    setTablasPagoProveedor,
    tablaPagoActual,
    setTablaPagoActual,
    tablasModalOpen,
    setTablasModalOpen,
    tablasLoading,
    setTablasLoading,
    tablasError,
    setTablasError,
    notasCreditoProveedor,
    setNotasCreditoProveedor,
    notaCreditoActual,
    setNotaCreditoActual,
    notasModalOpen,
    setNotasModalOpen,
    notasLoading,
    setNotasLoading,
    notasError,
    setNotasError,
    retencionPagos,
    setRetencionPagos,
    conta,
    setConta,
    contaSaving,
    setContaSaving,
    contaMessage,
    setContaMessage,
    contaError,
    setContaError,
    retencionPagoMonto,
    setRetencionPagoMonto,
    retencionPagoFecha,
    setRetencionPagoFecha,
    retencionPagoNotas,
    setRetencionPagoNotas,
    retencionPagoSaving,
    setRetencionPagoSaving,
    retencionPagoError,
    setRetencionPagoError,
    retencionPagoMessage,
    setRetencionPagoMessage,
    fetchAll
  };
};
