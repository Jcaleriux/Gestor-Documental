import { useCallback, useEffect, useState } from 'react';
import { tramitesApi } from '../services/tramitesApi';
import { facturasApi } from '../services/facturasApi';

const resolveFacturaEstadoOperativo = (factura) => (
  factura?.estado_workflow_pago
  || factura?.estado
  || factura?.estado_documental
  || ''
);

export const useTramites = ({ sociedadId }) => {
  const [tramites, setTramites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [facturasDisponibles, setFacturasDisponibles] = useState([]);
  const [retencionesDisponibles, setRetencionesDisponibles] = useState([]);
  const [actionMessage, setActionMessage] = useState('');
  const [actionError, setActionError] = useState('');

  const fetchTramites = useCallback(async (estado) => {
    try {
      setLoading(true);
      const params = { sociedadId };
      if (estado) params.estado = estado;
      const res = await tramitesApi.listTramites(params);
      if (res.data.success) {
        setTramites(res.data.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [sociedadId]);

  useEffect(() => {
    if (!sociedadId) {
      setTramites([]);
      setFacturasDisponibles([]);
      setRetencionesDisponibles([]);
      setLoading(false);
      return;
    }
    fetchTramites();
  }, [sociedadId, fetchTramites]);

  const fetchFacturasDisponibles = async () => {
    setLoadingDocs(true);
    const loadErrors = [];
    setActionError('');

    const [facturasResult, retencionesResult] = await Promise.allSettled([
      facturasApi.listAllFacturas({ sociedadId }),
      tramitesApi.getRetencionesDisponibles({ sociedadId })
    ]);

    if (facturasResult.status === 'fulfilled') {
      const disponibles = (facturasResult.value || []).filter(
        (f) => {
          const estadoOperativo = resolveFacturaEstadoOperativo(f);
          return estadoOperativo === 'contabilizado'
            || estadoOperativo === 'pagado_parcialmente';
        }
      );
      setFacturasDisponibles(disponibles);
    } else {
      setFacturasDisponibles([]);
      const status = facturasResult.reason?.response?.status;
      if (status === 403) {
        loadErrors.push('No tienes permiso para ver facturas disponibles para tramite.');
      } else {
        const apiError = facturasResult.reason?.response?.data?.error;
        loadErrors.push(apiError || 'No se pudieron cargar las facturas disponibles.');
      }
    }

    if (retencionesResult.status === 'fulfilled' && retencionesResult.value?.data?.success) {
      setRetencionesDisponibles(retencionesResult.value.data.data || []);
    } else {
      setRetencionesDisponibles([]);
      const status = retencionesResult.reason?.response?.status;
      if (status === 403) {
        loadErrors.push('No tienes permiso para ver retenciones pendientes.');
      } else {
        const apiError = retencionesResult.reason?.response?.data?.error;
        loadErrors.push(apiError || 'No se pudieron cargar las retenciones pendientes.');
      }
    }

    if (loadErrors.length > 0) {
      setActionError(loadErrors.join(' '));
    }

    setLoadingDocs(false);
  };

  const crearTramite = async ({ facturaIds, retencionFacturaIds, usuario = 'admin' }) => {
    try {
      setActionMessage('');
      setActionError('');
      const payload = {
        sociedad_id: sociedadId,
        factura_ids: facturaIds,
        retencion_factura_ids: retencionFacturaIds,
        usuario
      };
      const res = await tramitesApi.crearTramite(payload);
      if (res.data.success) {
        setActionMessage('Tramite creado correctamente.');
        await fetchTramites();
        return true;
      }
      return false;
    } catch (err) {
      const apiError = err.response?.data?.error || 'No se pudo crear el tramite.';
      setActionError(apiError);
      return false;
    }
  };

  return {
    tramites,
    loading,
    loadingDocs,
    facturasDisponibles,
    retencionesDisponibles,
    actionMessage,
    setActionMessage,
    actionError,
    setActionError,
    fetchTramites,
    fetchFacturasDisponibles,
    crearTramite
  };
};
