import { useState } from 'react';

export const useTramiteDetalleState = () => {
  const [tramite, setTramite] = useState(null);
  const [documentos, setDocumentos] = useState([]);
  const [retenciones, setRetenciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState('');
  const [actionError, setActionError] = useState('');
  const [historial, setHistorial] = useState([]);
  const [historialError, setHistorialError] = useState('');
  const [sociedadInfo, setSociedadInfo] = useState(null);

  return {
    tramite,
    setTramite,
    documentos,
    setDocumentos,
    retenciones,
    setRetenciones,
    loading,
    setLoading,
    actionMessage,
    setActionMessage,
    actionError,
    setActionError,
    historial,
    setHistorial,
    historialError,
    setHistorialError,
    sociedadInfo,
    setSociedadInfo
  };
};
