import { useCallback, useEffect, useRef, useState } from 'react';
import {
  dashboardApi,
  extractDashboardRecentDocumentsPayload,
  extractDashboardStatsPayload,
  extractDashboardWorkQueuePayload,
} from '../services/dashboardApi.js';

export const useDashboard = ({
  sociedadId,
  dependencies = {},
} = {}) => {
  const {
    api = dashboardApi,
    extractStats = extractDashboardStatsPayload,
    extractWorkQueue = extractDashboardWorkQueuePayload,
    extractRecentDocuments = extractDashboardRecentDocumentsPayload,
  } = dependencies;

  const [stats, setStats] = useState({});
  const [workQueue, setWorkQueue] = useState({});
  const [recentDocs, setRecentDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const requestIdRef = useRef(0);

  const fetchDashboard = useCallback(async () => {
    if (!sociedadId) {
      setStats({});
      setWorkQueue({});
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
      const [statsRes, workQueueRes, recentRes] = await Promise.all([
        api.getStats(params),
        api.getWorkQueue(params),
        api.getRecentDocuments(params),
      ]);

      if (requestIdRef.current !== requestId) {
        return;
      }

      setStats(extractStats(statsRes));
      setWorkQueue(extractWorkQueue(workQueueRes));
      setRecentDocs(extractRecentDocuments(recentRes));
    } catch (err) {
      if (requestIdRef.current !== requestId) {
        return;
      }

      const apiError = err?.response?.data?.error || err?.message || 'No se pudo cargar el dashboard.';
      setError(apiError);
      setStats({});
      setWorkQueue({});
      setRecentDocs([]);
    } finally {
      if (requestIdRef.current === requestId) {
        setLoading(false);
      }
    }
  }, [api, extractRecentDocuments, extractStats, extractWorkQueue, sociedadId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hidrata el dashboard al entrar o cambiar de sociedad
    fetchDashboard();
  }, [fetchDashboard]);

  return {
    stats,
    workQueue,
    recentDocs,
    loading,
    error,
    refetch: fetchDashboard,
  };
};
