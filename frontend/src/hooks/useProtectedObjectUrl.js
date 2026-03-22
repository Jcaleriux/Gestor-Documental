import { useEffect, useMemo, useRef, useState } from 'react';
import { fetchProtectedResource } from '../utils/protectedResources.js';

const getUrlApi = () => (
  (typeof window !== 'undefined' && window.URL)
  || (typeof globalThis !== 'undefined' ? globalThis.URL : null)
);

const createIdleState = () => ({
  resourceUrl: '',
  objectUrl: '',
  error: '',
  loading: false,
});

const createLoadingState = (resourceUrl) => ({
  resourceUrl,
  objectUrl: '',
  error: '',
  loading: true,
});

export const useProtectedObjectUrl = (resourceUrl, dependencies = {}) => {
  const {
    fetchResource = fetchProtectedResource,
    getUrlApiImpl = getUrlApi,
  } = dependencies;

  const requestIdRef = useRef(0);
  const [resolvedState, setResolvedState] = useState(() => createIdleState());

  const state = useMemo(() => {
    if (!resourceUrl) {
      return createIdleState();
    }

    const urlApi = getUrlApiImpl();
    if (!urlApi?.createObjectURL) {
      return {
        resourceUrl,
        objectUrl: '',
        error: 'No se pudo crear la vista previa del recurso.',
        loading: false,
      };
    }

    if (resolvedState.resourceUrl !== resourceUrl) {
      return createLoadingState(resourceUrl);
    }

    return resolvedState;
  }, [getUrlApiImpl, resolvedState, resourceUrl]);

  useEffect(() => {
    const urlApi = getUrlApiImpl();
    let currentObjectUrl = '';
    const controller = new AbortController();
    const requestId = ++requestIdRef.current;

    if (!resourceUrl || !urlApi?.createObjectURL) {
      return undefined;
    }

    let active = true;

    fetchResource(resourceUrl, { signal: controller.signal })
      .then(({ blob }) => {
        if (!active || requestIdRef.current !== requestId) {
          return;
        }

        currentObjectUrl = urlApi.createObjectURL(blob);
        setResolvedState({
          resourceUrl,
          objectUrl: currentObjectUrl,
          error: '',
          loading: false,
        });
      })
      .catch((error) => {
        if (!active || error?.name === 'AbortError' || requestIdRef.current !== requestId) {
          return;
        }

        setResolvedState({
          resourceUrl,
          objectUrl: '',
          error: error?.message || 'No se pudo cargar el recurso.',
          loading: false,
        });
      });

    return () => {
      active = false;
      controller.abort();
      if (currentObjectUrl && urlApi?.revokeObjectURL) {
        urlApi.revokeObjectURL(currentObjectUrl);
      }
    };
  }, [fetchResource, getUrlApiImpl, resourceUrl]);

  return state;
};
