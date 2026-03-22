import { useCallback, useEffect, useRef, useState } from 'react';
import { tramitesApi } from '../services/tramitesApi.js';
import { facturasApi } from '../services/facturasApi.js';

const resolveFacturaEstadoOperativo = (factura) => (
  factura?.estado_workflow_pago
  || factura?.estado
  || factura?.estado_documental
  || ''
);

const buildListScopeKey = ({ sociedadId, estado }) => (
  sociedadId ? `${sociedadId}::${String(estado || '')}` : ''
);

const buildDocsScopeKey = ({ sociedadId }) => (
  sociedadId ? String(sociedadId) : ''
);

const readScopedValue = (state, scopeKey, field, fallback) => (
  state?.scopeKey === scopeKey ? state?.[field] ?? fallback : fallback
);

const resolveActionValue = (value, previousValue) => (
  typeof value === 'function' ? value(previousValue) : String(value || '')
);

const buildLoadErrorMessage = (result, {
  forbiddenMessage,
  fallbackMessage,
}) => {
  const status = result?.reason?.response?.status;
  if (status === 403) {
    return forbiddenMessage;
  }

  return result?.reason?.response?.data?.error || fallbackMessage;
};

export const useTramites = ({
  sociedadId,
  estado = '',
  dependencies = {},
} = {}) => {
  const {
    tramitesClient = tramitesApi,
    facturasClient = facturasApi,
  } = dependencies;
  const listScopeKey = buildListScopeKey({ sociedadId, estado });
  const docsScopeKey = buildDocsScopeKey({ sociedadId });
  const listRequestIdRef = useRef(0);
  const docsRequestIdRef = useRef(0);
  const [listState, setListState] = useState(() => ({
    scopeKey: '',
    tramites: [],
    loading: false,
  }));
  const [docsState, setDocsState] = useState(() => ({
    scopeKey: '',
    facturasDisponibles: [],
    retencionesDisponibles: [],
    loadingDocs: false,
  }));
  const [actionState, setActionState] = useState(() => ({
    scopeKey: '',
    actionMessage: '',
    actionError: '',
  }));

  const setActionMessage = useCallback((value) => {
    setActionState((previous) => ({
      scopeKey: docsScopeKey,
      actionMessage: resolveActionValue(
        value,
        readScopedValue(previous, docsScopeKey, 'actionMessage', ''),
      ),
      actionError: readScopedValue(previous, docsScopeKey, 'actionError', ''),
    }));
  }, [docsScopeKey]);

  const setActionError = useCallback((value) => {
    setActionState((previous) => ({
      scopeKey: docsScopeKey,
      actionMessage: readScopedValue(previous, docsScopeKey, 'actionMessage', ''),
      actionError: resolveActionValue(
        value,
        readScopedValue(previous, docsScopeKey, 'actionError', ''),
      ),
    }));
  }, [docsScopeKey]);

  const fetchTramites = useCallback(async (
    nextEstado = '',
    { targetScopeKey = buildListScopeKey({ sociedadId, estado: nextEstado }) } = {},
  ) => {
    if (!sociedadId) {
      return false;
    }

    listRequestIdRef.current += 1;
    const requestId = listRequestIdRef.current;

    try {
      const params = { sociedadId };
      if (nextEstado) params.estado = nextEstado;
      const res = await tramitesClient.listTramites(params);

      if (listRequestIdRef.current !== requestId) {
        return false;
      }

      setListState({
        scopeKey: targetScopeKey,
        tramites: res?.data?.success ? (res.data.data || []) : [],
        loading: false,
      });

      return Boolean(res?.data?.success);
    } catch (err) {
      if (listRequestIdRef.current === requestId) {
        setListState({
          scopeKey: targetScopeKey,
          tramites: [],
          loading: false,
        });
      }
      console.error(err);
      return false;
    }
  }, [sociedadId, tramitesClient]);

  useEffect(() => {
    listRequestIdRef.current += 1;
    docsRequestIdRef.current += 1;

    if (!sociedadId) {
      return;
    }

    let cancelled = false;

    queueMicrotask(() => {
      if (!cancelled) {
        void fetchTramites(estado, { targetScopeKey: listScopeKey });
      }
    });

    return () => {
      cancelled = true;
    };
  }, [estado, fetchTramites, listScopeKey, sociedadId]);

  const fetchFacturasDisponibles = useCallback(async () => {
    if (!sociedadId) {
      return false;
    }

    docsRequestIdRef.current += 1;
    const requestId = docsRequestIdRef.current;

    setDocsState((previous) => ({
      scopeKey: docsScopeKey,
      facturasDisponibles: readScopedValue(previous, docsScopeKey, 'facturasDisponibles', []),
      retencionesDisponibles: readScopedValue(previous, docsScopeKey, 'retencionesDisponibles', []),
      loadingDocs: true,
    }));
    setActionError('');

    const [facturasResult, retencionesResult] = await Promise.allSettled([
      facturasClient.listAllFacturas({ sociedadId }),
      tramitesClient.getRetencionesDisponibles({ sociedadId }),
    ]);

    if (docsRequestIdRef.current !== requestId) {
      return false;
    }

    const nextFacturasDisponibles = facturasResult.status === 'fulfilled'
      ? (facturasResult.value || []).filter((factura) => {
        const estadoOperativo = resolveFacturaEstadoOperativo(factura);
        return estadoOperativo === 'contabilizado'
          || estadoOperativo === 'pagado_parcialmente';
      })
      : [];

    const nextRetencionesDisponibles = retencionesResult.status === 'fulfilled'
      && retencionesResult.value?.data?.success
      ? (retencionesResult.value.data.data || [])
      : [];

    setDocsState({
      scopeKey: docsScopeKey,
      facturasDisponibles: nextFacturasDisponibles,
      retencionesDisponibles: nextRetencionesDisponibles,
      loadingDocs: false,
    });

    const loadErrors = [];

    if (facturasResult.status !== 'fulfilled') {
      loadErrors.push(buildLoadErrorMessage(facturasResult, {
        forbiddenMessage: 'No tienes permiso para ver facturas disponibles para tramite.',
        fallbackMessage: 'No se pudieron cargar las facturas disponibles.',
      }));
    }

    if (retencionesResult.status !== 'fulfilled' || !retencionesResult.value?.data?.success) {
      loadErrors.push(buildLoadErrorMessage(retencionesResult, {
        forbiddenMessage: 'No tienes permiso para ver retenciones pendientes.',
        fallbackMessage: 'No se pudieron cargar las retenciones pendientes.',
      }));
    }

    if (loadErrors.length > 0) {
      setActionError(loadErrors.join(' '));
    }

    return loadErrors.length === 0;
  }, [docsScopeKey, facturasClient, sociedadId, setActionError, tramitesClient]);

  const crearTramite = useCallback(async ({ facturaIds, retencionFacturaIds, usuario = 'admin' }) => {
    try {
      setActionMessage('');
      setActionError('');
      const payload = {
        sociedad_id: sociedadId,
        factura_ids: facturaIds,
        retencion_factura_ids: retencionFacturaIds,
        usuario,
      };
      const res = await tramitesClient.crearTramite(payload);
      if (res.data.success) {
        setActionMessage('Tramite creado correctamente.');
        await fetchTramites(estado, { targetScopeKey: listScopeKey });
        return true;
      }
      return false;
    } catch (err) {
      const apiError = err.response?.data?.error || 'No se pudo crear el tramite.';
      setActionError(apiError);
      return false;
    }
  }, [
    estado,
    fetchTramites,
    listScopeKey,
    setActionError,
    setActionMessage,
    sociedadId,
    tramitesClient,
  ]);

  const tramites = sociedadId
    ? readScopedValue(listState, listScopeKey, 'tramites', [])
    : [];
  const loading = sociedadId
    ? (
      readScopedValue(listState, listScopeKey, 'loading', false)
      || listState.scopeKey !== listScopeKey
    )
    : false;
  const facturasDisponibles = sociedadId
    ? readScopedValue(docsState, docsScopeKey, 'facturasDisponibles', [])
    : [];
  const retencionesDisponibles = sociedadId
    ? readScopedValue(docsState, docsScopeKey, 'retencionesDisponibles', [])
    : [];
  const loadingDocs = sociedadId
    ? readScopedValue(docsState, docsScopeKey, 'loadingDocs', false)
    : false;
  const actionMessage = sociedadId
    ? readScopedValue(actionState, docsScopeKey, 'actionMessage', '')
    : '';
  const actionError = sociedadId
    ? readScopedValue(actionState, docsScopeKey, 'actionError', '')
    : '';

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
    crearTramite,
  };
};
