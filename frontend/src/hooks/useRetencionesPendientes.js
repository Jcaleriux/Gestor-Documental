import { useEffect, useState } from 'react';
import { facturasApi } from '../services/facturasApi';

export const useRetencionesPendientes = ({ sociedadId }) => {
  const [retenciones, setRetenciones] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sociedadId) {
      setRetenciones([]);
      setLoading(false);
      return;
    }

    fetchRetenciones();
  }, [sociedadId]);

  const fetchRetenciones = async () => {
    try {
      setLoading(true);
      const res = await facturasApi.listRetencionesPendientes({ sociedadId });
      if (res.data.success) {
        setRetenciones(res.data.data || []);
      } else {
        setRetenciones([]);
      }
    } catch (err) {
      console.error(err);
      setRetenciones([]);
    } finally {
      setLoading(false);
    }
  };

  return {
    retenciones,
    loading,
    refetch: fetchRetenciones
  };
};
