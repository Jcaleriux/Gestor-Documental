import { useCallback, useEffect, useRef, useState } from 'react';
import {
  dashboardApi,
  extractDashboardRecentDocumentsPayload,
  extractDashboardStatsPayload,
} from '../services/dashboardApi.js';

export const useDashboard = ({
  sociedadId,
  dependencies = {},
} = {}) => {
  const {
    api = dashboardApi,
    extractStats = extractDashboardStatsPayload,
    extractRecentDocuments = extractDashboardRecentDocumentsPayload,
  } = dependencies;

  const [stats, setStats] = useState({});
  const [recentDocs, setRecentDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const requestIdRef = useRef(0);

  const fetchDashboard = useCallback(async () => {
    if (!sociedadId) {
      setStats({});
      setRecentDocs([]);
      setError('');
      setLoading(false);
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    try {
      setLoading(true);
      setError('');
      const params = { sociedadId };
      const [statsRes, recentRes] = await Promise.all([
        api.getStats(params),
        api.getRecentDocuments(params),
      ]);

      if (requestIdRef.current !== requestId) {
        return;
      }

      setStats(extractStats(statsRes));
      setRecentDocs(extractRecentDocuments(recentRes));
    } catch (err) {
      if (requestIdRef.current !== requestId) {
        return;
      }

      const apiError = err?.response?.data?.error || err?.message || 'No se pudo cargar el dashboard.';
      setError(apiError);
      setStats({});
      setRecentDocs([]);
    } finally {
      if (requestIdRef.current === requestId) {
        setLoading(false);
      }
    }
  }, [api, extractRecentDocuments, extractStats, sociedadId]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  return {
    stats,
    recentDocs,
    loading,
    error,
    refetch: fetchDashboard,
  };
};
