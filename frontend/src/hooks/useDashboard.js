import { useEffect, useState } from 'react';
import { dashboardApi } from '../services/dashboardApi';

export const useDashboard = ({ sociedadId }) => {
  const [stats, setStats] = useState({});
  const [recentDocs, setRecentDocs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sociedadId) {
      setStats({});
      setRecentDocs([]);
      setLoading(false);
      return;
    }
    fetchDashboard();
  }, [sociedadId]);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const params = { sociedadId };
      const [statsRes, recentRes] = await Promise.all([
        dashboardApi.getStats(params),
        dashboardApi.getRecentDocuments(params)
      ]);

      setStats(statsRes.data.data || {});
      setRecentDocs(recentRes.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return { stats, recentDocs, loading };
};
