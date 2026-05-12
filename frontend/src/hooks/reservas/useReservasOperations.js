import { useCallback, useEffect, useState } from 'react';
import {
  extractReservaActionPayload,
  extractReservasListPayload,
  reservasApi,
} from '../../services/reservasApi.js';

const getErrorMessage = (error, fallbackMessage) => (
  error?.response?.data?.error || error?.message || fallbackMessage
);

export const useReservasOperations = ({
  sociedadId,
  estado = '',
  dependencies = {},
}) => {
  const {
    api = reservasApi,
  } = dependencies;

  const [operations, setOperations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const clearFeedback = useCallback(() => {
    setError('');
    setMessage('');
  }, []);

  const refetch = useCallback(async ({ showLoader = true } = {}) => {
    if (!sociedadId) {
      setOperations([]);
      setLoading(false);
      setError('');
      return [];
    }

    try {
      if (showLoader) setLoading(true);
      setError('');
      const response = await api.listOperaciones({
        sociedad_id: sociedadId,
        estado: estado || undefined,
      });
      const items = extractReservasListPayload(response);
      setOperations(items);
      return items;
    } catch (requestError) {
      setOperations([]);
      setError(getErrorMessage(requestError, 'No se pudieron cargar las reservas.'));
      throw requestError;
    } finally {
      if (showLoader) setLoading(false);
    }
  }, [api, estado, sociedadId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- limpia feedback stale antes de refrescar el scope activo
    setMessage('');
    refetch().catch(() => {});
  }, [refetch]);

  const runAction = useCallback(async ({
    request,
    successMessage,
    errorMessage,
  }) => {
    try {
      setSaving(true);
      setError('');
      setMessage('');
      const response = await request();
      const payload = extractReservaActionPayload(response, errorMessage);
      await refetch({ showLoader: false });
      setMessage(successMessage);
      return payload;
    } catch (requestError) {
      setError(getErrorMessage(requestError, errorMessage));
      throw requestError;
    } finally {
      setSaving(false);
    }
  }, [refetch]);

  const createOperation = useCallback(async (payload) => runAction({
    request: () => api.createOperacion(payload),
    successMessage: 'Reserva creada correctamente.',
    errorMessage: 'No se pudo crear la reserva.',
  }), [api, runAction]);

  const cancelOperation = useCallback(async ({ operacionId, motivo = null }) => runAction({
    request: () => api.cancelOperacion(operacionId, { motivo }),
    successMessage: 'Reserva cancelada correctamente.',
    errorMessage: 'No se pudo cancelar la reserva.',
  }), [api, runAction]);

  const closeOperation = useCallback(async ({ operacionId, motivo = null }) => runAction({
    request: () => api.closeOperacion(operacionId, { motivo }),
    successMessage: 'Reserva cerrada correctamente.',
    errorMessage: 'No se pudo cerrar la reserva.',
  }), [api, runAction]);

  const transferOperation = useCallback(async ({ operacionId, payload }) => runAction({
    request: () => api.transferOperacion(operacionId, payload),
    successMessage: 'Traslado aplicado correctamente.',
    errorMessage: 'No se pudo trasladar la reserva.',
  }), [api, runAction]);

  return {
    clearFeedback,
    closeOperation,
    createOperation,
    error,
    loading,
    message,
    operations,
    refetch,
    saving,
    transferOperation,
    cancelOperation,
  };
};
