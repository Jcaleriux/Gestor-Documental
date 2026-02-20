import { useEffect, useState } from 'react';
import { tramitesApi } from '../services/tramitesApi';

export const useTramiteDetalle = ({ id, sociedadId }) => {
  const [tramite, setTramite] = useState(null);
  const [documentos, setDocumentos] = useState([]);
  const [retenciones, setRetenciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState('');
  const [actionError, setActionError] = useState('');
  const [historial, setHistorial] = useState([]);
  const [historialError, setHistorialError] = useState('');
  const [sociedadInfo, setSociedadInfo] = useState(null);

  useEffect(() => {
    if (!id) return;
    fetchDetalle();
  }, [id]);

  useEffect(() => {
    if (!sociedadId) return;
    fetchSociedad();
  }, [sociedadId]);

  const fetchDetalle = async () => {
    try {
      setLoading(true);
      const res = await tramitesApi.getDetalle(id);
      if (res.data.success) {
        setTramite(res.data.data.tramite);
        setDocumentos(res.data.data.documentos || []);
        setRetenciones(res.data.data.retenciones || []);
      }
    } catch (err) {
      console.error(err);
      setActionError('No se pudo cargar el tramite.');
    } finally {
      setLoading(false);
    }
  };

  const fetchHistorial = async () => {
    try {
      setHistorialError('');
      const res = await tramitesApi.getHistorial(id);
      if (res.data.success) {
        setHistorial(res.data.data || []);
      }
    } catch (err) {
      console.error(err);
      setHistorialError('No se pudo cargar el historial.');
    }
  };

  const fetchSociedad = async () => {
    try {
      const res = await tramitesApi.getSociedades();
      if (res.data.success) {
        const sociedad = (res.data.data || []).find((item) => item.id === Number(sociedadId));
        setSociedadInfo(sociedad || null);
      }
    } catch (err) {
      console.error(err);
      setSociedadInfo(null);
    }
  };

  return {
    tramite,
    documentos,
    retenciones,
    loading,
    actionMessage,
    setActionMessage,
    actionError,
    setActionError,
    historial,
    historialError,
    fetchDetalle,
    fetchHistorial,
    sociedadInfo
  };
};
