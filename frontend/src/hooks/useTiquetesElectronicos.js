import { useEffect, useState } from 'react';
import { facturasApi } from '../services/facturasApi';

export const useTiquetesElectronicos = ({ sociedadId }) => {
  const [tiquetes, setTiquetes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sociedadId) {
      setTiquetes([]);
      setLoading(false);
      return;
    }
    fetchTiquetes();
  }, [sociedadId]);

  const fetchTiquetes = async () => {
    try {
      setLoading(true);
      const res = await facturasApi.listTiquetesElectronicos({ sociedadId });
      if (res.data.success) {
        setTiquetes(res.data.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return { tiquetes, loading };
};
