import { useCallback, useEffect, useRef, useState } from 'react';
import {
  exploradorDocumentosApi,
  extractExploradorPayload,
} from '../services/exploradorDocumentosApi.js';

const EMPTY_DATA = Object.freeze({
  resumen: {
    totalDocumentos: 0,
    totalesPorMoneda: [],
    serieMensual: [],
    estados: [],
    topProveedores: [],
  },
  documentos: [],
  paginacion: {
    page: 1,
    pageSize: 25,
    totalItems: 0,
    totalPages: 1,
    hasPrev: false,
    hasNext: false,
  },
});

export const useExploradorDocumentos = ({
  sociedadId,
  filters,
  page,
  pageSize,
  dependencies = {},
}) => {
  const api = dependencies.api || exploradorDocumentosApi;
  const extractPayload = dependencies.extractPayload || extractExploradorPayload;
  const [data, setData] = useState(EMPTY_DATA);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const requestIdRef = useRef(0);

  const fetchData = useCallback(async () => {
    if (!sociedadId) {
      setData(EMPTY_DATA);
      setError('');
      setLoading(false);
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    try {
      setLoading(true);
      setError('');
      const response = await api.explorar({
        sociedadId,
        ...filters,
        page,
        pageSize,
      });
      if (requestIdRef.current === requestId) {
        setData(extractPayload(response));
      }
    } catch (err) {
      if (requestIdRef.current === requestId) {
        setError(err?.response?.data?.error || err?.message || 'No se pudo cargar el explorador.');
        setData(EMPTY_DATA);
      }
    } finally {
      if (requestIdRef.current === requestId) {
        setLoading(false);
      }
    }
  }, [api, extractPayload, filters, page, pageSize, sociedadId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- carga datos al cambiar filtros o sociedad
    fetchData();
  }, [fetchData]);

  return { ...data, loading, error, refetch: fetchData };
};
