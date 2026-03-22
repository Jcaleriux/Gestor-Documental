import { useCallback, useEffect, useState } from 'react';
import { buildListScopeKey, readScopedValue } from '../shared/listScope.js';

const getDefaultEventTarget = () => (
  typeof document !== 'undefined' ? document : null
);

export const useNotaCreditoRowActions = ({
  items = [],
  resetKey = '',
  dependencies = {},
} = {}) => {
  const {
    eventTarget = getDefaultEventTarget(),
  } = dependencies;
  const scopeKey = buildListScopeKey({ items, resetKey });

  const [uiState, setUiState] = useState(() => ({
    scopeKey,
    openMenuId: null,
  }));
  const openMenuId = readScopedValue(uiState, scopeKey, 'openMenuId', null);

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

  const toggleMenu = useCallback((notaId) => {
    setUiState((previous) => ({
      ...previous,
      scopeKey,
      openMenuId: readScopedValue(previous, scopeKey, 'openMenuId', null) === notaId ? null : notaId,
    }));
  }, [scopeKey]);

  return {
    closeMenu,
    openMenuId,
    toggleMenu,
  };
};
