import { useCallback, useEffect } from 'react';
import { tramitesApi } from '../services/tramitesApi';
import { useTramiteDetalleState } from './tramiteDetalle/useTramiteDetalleState.js';
import {
  fetchTramiteDetalleData,
  fetchTramiteHistorialData,
  fetchTramiteSociedadInfo
} from './tramiteDetalle/tramiteDetalleLoaders.js';
import { buildTramiteDetalleOutputContract } from './tramiteDetalle/tramiteDetalleOutputBuilders.js';

export const useTramiteDetalle = ({ id, sociedadId, dependencies = {} }) => {
  const { api = tramitesApi } = dependencies;
  const state = useTramiteDetalleState();

  const {
    setTramite,
    setDocumentos,
    setRetenciones,
    setLoading,
    setActionError,
    setHistorial,
    setHistorialError,
    setSociedadInfo
  } = state;

  const fetchDetalle = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchTramiteDetalleData({ api, id });
      setTramite(data.tramite);
      setDocumentos(data.documentos);
      setRetenciones(data.retenciones);
    } catch (err) {
      console.error(err);
      setActionError('No se pudo cargar el tramite.');
    } finally {
      setLoading(false);
    }
  }, [api, id, setActionError, setDocumentos, setLoading, setRetenciones, setTramite]);

  const fetchSociedad = useCallback(async () => {
    try {
      const sociedad = await fetchTramiteSociedadInfo({ api, sociedadId });
      setSociedadInfo(sociedad);
    } catch (err) {
      console.error(err);
      setSociedadInfo(null);
    }
  }, [api, sociedadId, setSociedadInfo]);

  useEffect(() => {
    if (!id) return;
    fetchDetalle();
  }, [id, fetchDetalle]);

  useEffect(() => {
    if (!sociedadId) return;
    fetchSociedad();
  }, [sociedadId, fetchSociedad]);

  const fetchHistorial = useCallback(async () => {
    try {
      setHistorialError('');
      const data = await fetchTramiteHistorialData({ api, id });
      setHistorial(data);
    } catch (err) {
      console.error(err);
      setHistorialError('No se pudo cargar el historial.');
    }
  }, [api, id, setHistorial, setHistorialError]);

  return buildTramiteDetalleOutputContract({
    state,
    fetchDetalle,
    fetchHistorial,
  });
};
