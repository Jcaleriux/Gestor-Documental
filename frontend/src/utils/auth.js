const AUTH_TOKEN_KEY = 'sendadocs.auth.token';
const AUTH_USER_KEY = 'sendadocs.auth.user';

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

const removeStorageKeys = (storage, keys) => {
  keys.forEach((key) => {
    try {
      storage.removeItem(key);
    } catch {
      // Ignore storage failures so auth cleanup never blocks the app.
    }
  });
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
    removeStorageKeys(storage, [
      AUTH_TOKEN_KEY,
      AUTH_USER_KEY,
    ]);
  } catch {
    // Ignore storage failures to avoid crashing logout flows.
  }
};

const withAuthToken = (url) => {
  return String(url || '');
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
