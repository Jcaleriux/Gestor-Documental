import { useEffect, useState } from 'react';
import { facturasApi } from '../services/facturasApi';

export const useNotasCredito = ({ sociedadId }) => {
  const [notasCredito, setNotasCredito] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sociedadId) {
      setNotasCredito([]);
      setLoading(false);
      return;
    }
    fetchNotasCredito();
  }, [sociedadId]);

  const fetchNotasCredito = async () => {
    try {
      setLoading(true);
      const res = await facturasApi.listNotasCredito({ sociedadId });
      if (res.data.success) {
        setNotasCredito(res.data.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return { notasCredito, loading };
};
