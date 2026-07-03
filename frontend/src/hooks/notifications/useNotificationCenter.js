import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  dashboardApi,
  extractDashboardWorkQueuePayload,
} from '../../services/dashboardApi.js';
import { buildNotificationCenterViewModel } from '../../components/notifications/notificationCenterViewModel.js';

const INITIAL_STATE = {
  workQueue: null,
  loading: false,
  error: '',
};

export const useNotificationCenter = ({
  sociedadId,
  dependencies = {},
} = {}) => {
  const {
    api = dashboardApi,
    extractWorkQueue = extractDashboardWorkQueuePayload,
  } = dependencies;
  const [state, setState] = useState(INITIAL_STATE);
  const requestIdRef = useRef(0);

  const fetchNotifications = useCallback(async () => {
    if (!sociedadId) {
      requestIdRef.current += 1;
      setState(INITIAL_STATE);
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    setState((previous) => ({
      ...previous,
      loading: true,
      error: '',
    }));

    try {
      const response = await api.getWorkQueue({ sociedadId });
      if (requestIdRef.current !== requestId) {
        return;
      }

      setState({
        workQueue: extractWorkQueue(response),
        loading: false,
        error: '',
      });
    } catch (error) {
      if (requestIdRef.current !== requestId) {
        return;
      }

      setState((previous) => ({
        ...previous,
        loading: false,
        error: error?.response?.data?.error || error?.message || 'No se pudieron cargar las notificaciones.',
      }));
    }
  }, [api, extractWorkQueue, sociedadId]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const viewModel = useMemo(
    () => buildNotificationCenterViewModel(state.workQueue || {}),
    [state.workQueue],
  );

  return {
    ...viewModel,
    loading: state.loading,
    error: state.error,
    refetch: fetchNotifications,
  };
};
