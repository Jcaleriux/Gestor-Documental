import { useState } from 'react';
import { createInitialContaState } from './utils.js';

export const useFacturaDetalleContabilizacionState = () => {
  const [proveedoresSociedad, setProveedoresSociedad] = useState([]);
  const [tablasPagoProveedor, setTablasPagoProveedor] = useState([]);
  const [tablaPagoActual, setTablaPagoActual] = useState(null);
  const [tablasModalOpen, setTablasModalOpen] = useState(false);
  const [tablasLoading, setTablasLoading] = useState(false);
  const [tablasError, setTablasError] = useState('');
  const [ordenesCompraProveedor, setOrdenesCompraProveedor] = useState([]);
  const [ordenCompraActual, setOrdenCompraActual] = useState(null);
  const [ordenesModalOpen, setOrdenesModalOpen] = useState(false);
  const [ordenesLoading, setOrdenesLoading] = useState(false);
  const [ordenesError, setOrdenesError] = useState('');
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

  return {
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
    ordenesCompraProveedor,
    setOrdenesCompraProveedor,
    ordenCompraActual,
    setOrdenCompraActual,
    ordenesModalOpen,
    setOrdenesModalOpen,
    ordenesLoading,
    setOrdenesLoading,
    ordenesError,
    setOrdenesError,
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
    setRetencionPagoMessage
  };
};
