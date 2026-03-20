import { getAuthToken } from './auth.js';

const NEW_TAB_TARGET = '_blank';
const NEW_TAB_FEATURES = 'noopener,noreferrer';

const getUrlApi = () => (
  (typeof window !== 'undefined' && window.URL)
  || (typeof globalThis !== 'undefined' ? globalThis.URL : null)
);

const getOpenWindow = (openWindow) => {
  if (typeof openWindow === 'function') {
    return openWindow;
  }

  if (typeof window !== 'undefined' && typeof window.open === 'function') {
    return window.open.bind(window);
  }

  return null;
};

const buildAuthHeaders = (headers = {}) => {
  const token = getAuthToken();
  if (!token) {
    return { ...headers };
  }

  return {
    ...headers,
    Authorization: `Bearer ${token}`,
  };
};

const buildProtectedResourceUrl = (url) => String(url || '');

const readErrorMessage = async (response) => {
  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    try {
      const payload = await response.clone().json();
      return payload?.error || payload?.message || '';
    } catch {
      return '';
    }
  }

  try {
    return (await response.clone().text()).trim();
  } catch {
    return '';
  }
};

const fetchProtectedResource = async (url, options = {}) => {
  if (!url) {
    throw new Error('URL requerida');
  }

  const response = await fetch(url, {
    ...options,
    method: options.method || 'GET',
    credentials: options.credentials || 'same-origin',
    headers: buildAuthHeaders(options.headers),
  });

  if (!response.ok) {
    const message = await readErrorMessage(response);
    throw new Error(message || `No se pudo abrir el recurso (${response.status})`);
  }

  return {
    blob: await response.blob(),
    response,
  };
};

const openProtectedInNewTab = async (url, options = {}) => {
  const openWindow = getOpenWindow(options.openWindow);
  const urlApi = getUrlApi();
  const pendingWindow = openWindow
    ? openWindow('', NEW_TAB_TARGET, NEW_TAB_FEATURES)
    : null;

  try {
    const { blob } = await fetchProtectedResource(url);
    if (!urlApi?.createObjectURL) {
      throw new Error('No se pudo crear la vista previa del recurso');
    }

    const objectUrl = urlApi.createObjectURL(blob);
    if (pendingWindow) {
      pendingWindow.opener = null;
      pendingWindow.location = objectUrl;
    } else if (openWindow) {
      openWindow(objectUrl, NEW_TAB_TARGET, NEW_TAB_FEATURES);
    }

    return objectUrl;
  } catch (error) {
    pendingWindow?.close?.();
    throw error;
  }
};

const createProtectedResourceOpener = ({
  openProtectedResource,
  buildAuthUrl,
  openWindow,
} = {}) => {
  const hasLegacyOpener = typeof buildAuthUrl === 'function' || typeof openWindow === 'function';

  if (hasLegacyOpener) {
    return async (url) => {
      const authenticatedUrl = typeof buildAuthUrl === 'function'
        ? buildAuthUrl(url)
        : url;
      const openFn = getOpenWindow(openWindow);
      if (openFn) {
        openFn(authenticatedUrl, NEW_TAB_TARGET, NEW_TAB_FEATURES);
      }
      return authenticatedUrl;
    };
  }

  if (typeof openProtectedResource === 'function') {
    return openProtectedResource;
  }

  return async (url) => url;
};

export {
  NEW_TAB_FEATURES,
  NEW_TAB_TARGET,
  buildAuthHeaders,
  buildProtectedResourceUrl,
  createProtectedResourceOpener,
  fetchProtectedResource,
  openProtectedInNewTab,
};
