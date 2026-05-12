import { useCallback, useEffect, useRef, useState } from 'react';
import {
  extractNotasCreditoPagePayload,
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
  totalSaldoDisponible: 0,
  byEstado: [],
  byMoneda: [],
});

export const useNotasCredito = ({
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

  const fetchNotasCredito = useCallback(async () => {
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

      const response = await api.listNotasCredito({
        sociedadId,
        ...(query || {}),
      });

      if (requestIdRef.current !== requestId) {
        return;
      }

      const payload = extractNotasCreditoPagePayload(response);
      setItems(payload.items);
      setMeta({
        ...createEmptyMeta(query),
        ...(payload.meta || {}),
      });
      setSummary({
        ...createEmptySummary(),
        ...(payload.summary || {}),
        byEstado: Array.isArray(payload.summary?.byEstado) ? payload.summary.byEstado : [],
        byMoneda: Array.isArray(payload.summary?.byMoneda) ? payload.summary.byMoneda : [],
      });
    } catch (err) {
      if (requestIdRef.current !== requestId) {
        return;
      }

      const apiError = err?.response?.data?.error || err?.message || 'No se pudieron cargar las notas de credito.';
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
    fetchNotasCredito();
  }, [fetchNotasCredito]);

  return {
    items,
    meta,
    summary,
    loading,
    error,
    refetch: fetchNotasCredito,
  };
};
