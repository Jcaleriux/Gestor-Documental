import { useCallback, useEffect, useState } from 'react';
import {
  extractMensajeHaciendaXmlPath,
  facturasApi,
} from '../../services/facturasApi.js';
import { withAuthToken } from '../../utils/auth.js';

const NEW_TAB_TARGET = '_blank';
const NEW_TAB_FEATURES = 'noopener,noreferrer';

const defaultOpenWindow = (url, target, features) => {
  if (typeof window !== 'undefined' && typeof window.open === 'function') {
    window.open(url, target, features);
  }
};

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
    buildAuthUrl = withAuthToken,
    eventTarget = getDefaultEventTarget(),
    openWindow = defaultOpenWindow,
    extractXmlPath = extractMensajeHaciendaXmlPath,
  } = dependencies;

  const [openMenuId, setOpenMenuId] = useState(null);
  const [mhLoadingId, setMhLoadingId] = useState(null);
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    setOpenMenuId(null);
  }, [items]);

  useEffect(() => {
    setOpenMenuId(null);
    setMhLoadingId(null);
    setActionError('');
  }, [resetKey]);

  useEffect(() => {
    if (!openMenuId || !eventTarget?.addEventListener || !eventTarget?.removeEventListener) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (event.target?.closest?.('[data-factura-menu="true"]')) {
        return;
      }
      setOpenMenuId(null);
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setOpenMenuId(null);
      }
    };

    eventTarget.addEventListener('mousedown', handlePointerDown);
    eventTarget.addEventListener('keydown', handleEscape);

    return () => {
      eventTarget.removeEventListener('mousedown', handlePointerDown);
      eventTarget.removeEventListener('keydown', handleEscape);
    };
  }, [eventTarget, openMenuId]);

  const closeMenu = useCallback(() => {
    setOpenMenuId(null);
  }, []);

  const toggleMenu = useCallback((facturaId) => {
    setOpenMenuId((current) => (current === facturaId ? null : facturaId));
  }, []);

  const clearActionError = useCallback(() => {
    setActionError('');
  }, []);

  const viewMensajeHacienda = useCallback(async (factura) => {
    if (!factura?.id || !factura?.has_mensaje_hacienda) {
      return;
    }

    try {
      setMhLoadingId(factura.id);
      setActionError('');

      const response = await api.getMensajeHacienda(factura.id);
      const rutaXml = extractXmlPath(response);

      if (!rutaXml) {
        setActionError('Mensaje Hacienda sin XML.');
        return;
      }

      const url = buildAuthUrl(`/api/files/xml?path=${encodeURIComponent(rutaXml)}`);
      openWindow(url, NEW_TAB_TARGET, NEW_TAB_FEATURES);
    } catch (error) {
      const apiError = error?.response?.data?.error || 'Mensaje Hacienda no encontrado.';
      setActionError(apiError);
    } finally {
      setMhLoadingId(null);
    }
  }, [api, buildAuthUrl, extractXmlPath, openWindow]);

  return {
    actionError,
    clearActionError,
    closeMenu,
    mhLoadingId,
    openMenuId,
    setActionError,
    toggleMenu,
    viewMensajeHacienda,
  };
};
