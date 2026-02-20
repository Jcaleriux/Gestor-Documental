import { useEffect, useState } from 'react';
import { facturasApi } from '../services/facturasApi';

export const useFacturas = ({ sociedadId }) => {
  const [facturas, setFacturas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sociedadId) {
      setFacturas([]);
      setLoading(false);
      return;
    }
    fetchFacturas();
  }, [sociedadId]);

  const fetchFacturas = async () => {
    try {
      setLoading(true);
      const res = await facturasApi.listFacturas({ sociedadId });
      if (res.data.success) {
        setFacturas(res.data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return { facturas, loading };
};
