import { useCallback, useEffect, useState } from 'react';

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

  const [openMenuId, setOpenMenuId] = useState(null);

  useEffect(() => {
    setOpenMenuId(null);
  }, [items]);

  useEffect(() => {
    setOpenMenuId(null);
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

  const toggleMenu = useCallback((notaId) => {
    setOpenMenuId((current) => (current === notaId ? null : notaId));
  }, []);

  return {
    closeMenu,
    openMenuId,
    toggleMenu,
  };
};
