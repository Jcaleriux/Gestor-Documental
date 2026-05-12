import { useCallback, useEffect, useRef, useState } from 'react';
import {
  extractTiquetesPagePayload,
  facturasApi,
} from '../services/facturasApi.js';

const createEmptyMeta = (query = {}) => ({
  page: Number(query?.page) || 1,
  pageSize: Number(query?.pageSize) || 50,
  totalItems: 0,
  totalPages: 0,
  hasNext: false,
  hasPrev: false,
  sortBy: query?.sortBy || 'fecha_emision',
  sortDir: query?.sortDir || 'desc',
});

const createEmptySummary = () => ({
  totalItems: 0,
  totalAmount: 0,
  byMoneda: [],
});

export const useTiquetesElectronicos = ({
  sociedadId,
  query,
  dependencies = {},
}) => {
  const {
    api = facturasApi,
  } = dependencies;

  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState(() => createEmptyMeta(query));
  const [summary, setSummary] = useState(() => createEmptySummary());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const requestIdRef = useRef(0);

  const fetchTiquetes = useCallback(async () => {
    if (!sociedadId) {
      setItems([]);
      setMeta(createEmptyMeta(query));
      setSummary(createEmptySummary());
      setError('');
      setLoading(false);
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    try {
      setLoading(true);
      setError('');

      const response = await api.listTiquetesElectronicos({
        sociedadId,
        ...(query || {}),
      });

      if (requestIdRef.current !== requestId) {
        return;
      }

      const payload = extractTiquetesPagePayload(response);
      setItems(payload.items);
      setMeta({
        ...createEmptyMeta(query),
        ...(payload.meta || {}),
      });
      setSummary({
        ...createEmptySummary(),
        ...(payload.summary || {}),
        byMoneda: Array.isArray(payload.summary?.byMoneda) ? payload.summary.byMoneda : [],
      });
    } catch (err) {
      if (requestIdRef.current !== requestId) {
        return;
      }

      const apiError = err?.response?.data?.error || err?.message || 'No se pudieron cargar los tiquetes electronicos.';
      setError(apiError);
      setItems([]);
      setMeta(createEmptyMeta(query));
      setSummary(createEmptySummary());
    } finally {
      if (requestIdRef.current === requestId) {
        setLoading(false);
      }
    }
  }, [api, query, sociedadId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- dispara la carga paginada al cambiar filtros o sociedad
    fetchTiquetes();
  }, [fetchTiquetes]);

  return {
    items,
    meta,
    summary,
    loading,
    error,
    refetch: fetchTiquetes,
  };
};
