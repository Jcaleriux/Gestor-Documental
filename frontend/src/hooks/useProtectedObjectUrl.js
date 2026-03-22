import { useEffect, useState } from 'react';
import { fetchProtectedResource } from '../utils/protectedResources.js';

const getUrlApi = () => (
  (typeof window !== 'undefined' && window.URL)
  || (typeof globalThis !== 'undefined' ? globalThis.URL : null)
);

export const useProtectedObjectUrl = (resourceUrl) => {
  const [state, setState] = useState({
    objectUrl: '',
    error: '',
    loading: false,
  });

  useEffect(() => {
    const urlApi = getUrlApi();
    let currentObjectUrl = '';
    const controller = new AbortController();

    if (!resourceUrl) {
      setState({
        objectUrl: '',
        error: '',
        loading: false,
      });
      return undefined;
    }

    if (!urlApi?.createObjectURL) {
      setState({
        objectUrl: '',
        error: 'No se pudo crear la vista previa del recurso.',
        loading: false,
      });
      return undefined;
    }

    let active = true;
    setState({
      objectUrl: '',
      error: '',
      loading: true,
    });

    fetchProtectedResource(resourceUrl, { signal: controller.signal })
      .then(({ blob }) => {
        if (!active) {
          return;
        }

        currentObjectUrl = urlApi.createObjectURL(blob);
        setState({
          objectUrl: currentObjectUrl,
          error: '',
          loading: false,
        });
      })
      .catch((error) => {
        if (!active || error?.name === 'AbortError') {
          return;
        }

        setState({
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
  }, [resourceUrl]);

  return state;
};
