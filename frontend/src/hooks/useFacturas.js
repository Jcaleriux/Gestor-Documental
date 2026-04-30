import { useCallback, useEffect, useRef, useState } from 'react';
import { extractFacturasPagePayload, facturasApi } from '../services/facturasApi.js';

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
  byEstado: [],
  byMoneda: [],
});

export const useFacturas = ({
  sociedadId,
  query,
  dependencies = {},
}) => {
  const { api = facturasApi } = dependencies;

  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState(() => createEmptyMeta(query));
  const [summary, setSummary] = useState(() => createEmptySummary());
  const [loading, setLoading] = useState(false); // ✔ mejor UX (evita flicker inicial agresivo)
  const [error, setError] = useState('');

  const requestIdRef = useRef(0);

  const fetchFacturas = useCallback(async () => {
    if (!sociedadId) {
      setItems([]);
      setMeta(createEmptyMeta(query));
      setSummary(createEmptySummary());
      setError('');
      setLoading(false);
      return;
    }

    const requestId = ++requestIdRef.current;

    try {
      setLoading(true);
      setError('');

      const response = await api.listFacturas({
        sociedadId,
        ...(query || {}),
      });

      if (requestIdRef.current !== requestId) return;

      const payload = extractFacturasPagePayload(response);

      setItems(payload.items || []);

      setMeta(payload.meta || createEmptyMeta(query));

      setSummary({
        ...createEmptySummary(),
        ...(payload.summary || {}),
        byEstado: Array.isArray(payload.summary?.byEstado)
          ? payload.summary.byEstado
          : [],
        byMoneda: Array.isArray(payload.summary?.byMoneda)
          ? payload.summary.byMoneda
          : [],
      });
    } catch (err) {
      if (requestIdRef.current !== requestId) return;

      const apiError =
        err?.response?.data?.error ||
        err?.message ||
        'No se pudieron cargar las facturas.';

      setError(apiError);

      // ❌ IMPORTANTE: no limpiar items para evitar parpadeo
      setMeta(createEmptyMeta(query));
      setSummary(createEmptySummary());
    } finally {
      if (requestIdRef.current === requestId) {
        setLoading(false);
      }
    }
  }, [api, query, sociedadId]);

  useEffect(() => {
    fetchFacturas();
  }, [fetchFacturas]);

  return {
    items,
    meta,
    summary,
    loading,
    error,
    refetch: fetchFacturas,
  };
};
