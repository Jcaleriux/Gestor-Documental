const AUTH_TOKEN_KEY = 'novogar_auth_token';
const AUTH_USER_KEY = 'novogar_auth_user';

const getStorage = () => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
  } catch {
    return null;
  }

  try {
    if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
      return globalThis.localStorage;
    }
  } catch {
    return null;
  }

  return null;
};

const getStorageItem = (key) => {
  const storage = getStorage();
  if (!storage) {
    return '';
  }

  try {
    return storage.getItem(key) || '';
  } catch {
    return '';
  }
};

const getAuthToken = () => getStorageItem(AUTH_TOKEN_KEY);

const getAuthUser = () => {
  const raw = getStorageItem(AUTH_USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const saveAuthSession = ({ token, user }) => {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  try {
    if (token) {
      storage.setItem(AUTH_TOKEN_KEY, token);
    }
    if (user) {
      storage.setItem(AUTH_USER_KEY, JSON.stringify(user));
    } else {
      storage.removeItem(AUTH_USER_KEY);
    }
  } catch {
    // Ignore storage failures to keep the app usable even when storage is blocked.
  }
};

const clearAuthSession = () => {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  try {
    storage.removeItem(AUTH_TOKEN_KEY);
    storage.removeItem(AUTH_USER_KEY);
  } catch {
    // Ignore storage failures to avoid crashing logout flows.
  }
};

const withAuthToken = (url) => {
  const token = getAuthToken();
  if (!token) return url;
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}token=${encodeURIComponent(token)}`;
};

export {
  AUTH_TOKEN_KEY,
  AUTH_USER_KEY,
  getAuthToken,
  getAuthUser,
  saveAuthSession,
  clearAuthSession,
  withAuthToken
};
