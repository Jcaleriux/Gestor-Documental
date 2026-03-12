import { useCallback, useEffect, useState } from 'react';
import { facturasApi } from '../services/facturasApi';

export const useRetencionesPendientes = ({ sociedadId }) => {
  const [retenciones, setRetenciones] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchRetenciones = useCallback(async () => {
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
  }, [sociedadId]);

  useEffect(() => {
    if (!sociedadId) {
      setRetenciones([]);
      setLoading(false);
      return;
    }

    fetchRetenciones();
  }, [sociedadId, fetchRetenciones]);

  return {
    retenciones,
    loading,
    refetch: fetchRetenciones
  };
};
