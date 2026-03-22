import { useCallback, useEffect, useState } from 'react';
import {
  extractMensajeHaciendaXmlPath,
  facturasApi,
} from '../../services/facturasApi.js';
import {
  createProtectedResourceOpener,
  openProtectedInNewTab,
} from '../../utils/protectedResources.js';
import { buildListScopeKey, readScopedValue } from '../shared/listScope.js';

const getDefaultEventTarget = () => (
  typeof document !== 'undefined' ? document : null
);

export const useFacturaRowActions = ({
  items = [],
  resetKey = '',
  dependencies = {},
} = {}) => {
  const {
    api = facturasApi,
    buildAuthUrl,
    eventTarget = getDefaultEventTarget(),
    openWindow,
    openProtectedResource = openProtectedInNewTab,
    extractXmlPath = extractMensajeHaciendaXmlPath,
  } = dependencies;
  const resolvedOpenProtectedResource = createProtectedResourceOpener({
    openProtectedResource,
    buildAuthUrl,
    openWindow,
  });
  const scopeKey = buildListScopeKey({ items, resetKey });

  const [uiState, setUiState] = useState(() => ({
    scopeKey,
    openMenuId: null,
    mhLoadingId: null,
    actionError: '',
  }));
  const openMenuId = readScopedValue(uiState, scopeKey, 'openMenuId', null);
  const mhLoadingId = readScopedValue(uiState, scopeKey, 'mhLoadingId', null);
  const actionError = readScopedValue(uiState, scopeKey, 'actionError', '');

  useEffect(() => {
    if (!openMenuId || !eventTarget?.addEventListener || !eventTarget?.removeEventListener) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (event.target?.closest?.('[data-factura-menu="true"]')) {
        return;
      }
      setUiState((previous) => ({
        ...previous,
        scopeKey,
        openMenuId: null,
      }));
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setUiState((previous) => ({
          ...previous,
          scopeKey,
          openMenuId: null,
        }));
      }
    };

    eventTarget.addEventListener('mousedown', handlePointerDown);
    eventTarget.addEventListener('keydown', handleEscape);

    return () => {
      eventTarget.removeEventListener('mousedown', handlePointerDown);
      eventTarget.removeEventListener('keydown', handleEscape);
    };
  }, [eventTarget, openMenuId, scopeKey]);

  const closeMenu = useCallback(() => {
    setUiState((previous) => ({
      ...previous,
      scopeKey,
      openMenuId: null,
    }));
  }, [scopeKey]);

  const toggleMenu = useCallback((facturaId) => {
    setUiState((previous) => ({
      ...previous,
      scopeKey,
      openMenuId: readScopedValue(previous, scopeKey, 'openMenuId', null) === facturaId ? null : facturaId,
    }));
  }, [scopeKey]);

  const clearActionError = useCallback(() => {
    setUiState((previous) => ({
      ...previous,
      scopeKey,
      actionError: '',
    }));
  }, [scopeKey]);

  const viewMensajeHacienda = useCallback(async (factura) => {
    if (!factura?.id || !factura?.has_mensaje_hacienda) {
      return;
    }

    try {
      setUiState((previous) => ({
        ...previous,
        scopeKey,
        mhLoadingId: factura.id,
        actionError: '',
      }));

      const response = await api.getMensajeHacienda(factura.id);
      const rutaXml = extractXmlPath(response);

      if (!rutaXml) {
        setUiState((previous) => ({
          ...previous,
          scopeKey,
          actionError: 'Mensaje Hacienda sin XML.',
          mhLoadingId: null,
        }));
        return;
      }

      const url = `/api/files/xml?path=${encodeURIComponent(rutaXml)}`;
      await resolvedOpenProtectedResource(url);
    } catch (error) {
      const apiError = error?.response?.data?.error || 'Mensaje Hacienda no encontrado.';
      setUiState((previous) => ({
        ...previous,
        scopeKey,
        actionError: apiError,
      }));
    } finally {
      setUiState((previous) => ({
        ...previous,
        scopeKey,
        mhLoadingId: null,
      }));
    }
  }, [api, extractXmlPath, resolvedOpenProtectedResource, scopeKey]);

  return {
    actionError,
    clearActionError,
    closeMenu,
    mhLoadingId,
    openMenuId,
    setActionError: (value) => {
      setUiState((previous) => ({
        ...previous,
        scopeKey,
        actionError: String(value || ''),
      }));
    },
    toggleMenu,
    viewMensajeHacienda,
  };
};
