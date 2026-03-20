import { useCallback, useEffect, useState } from 'react';
import {
  extractMensajeHaciendaXmlPath,
  facturasApi,
} from '../../services/facturasApi.js';
import {
  createProtectedResourceOpener,
  openProtectedInNewTab,
} from '../../utils/protectedResources.js';

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

      const url = `/api/files/xml?path=${encodeURIComponent(rutaXml)}`;
      await resolvedOpenProtectedResource(url);
    } catch (error) {
      const apiError = error?.response?.data?.error || 'Mensaje Hacienda no encontrado.';
      setActionError(apiError);
    } finally {
      setMhLoadingId(null);
    }
  }, [api, extractXmlPath, resolvedOpenProtectedResource]);

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
