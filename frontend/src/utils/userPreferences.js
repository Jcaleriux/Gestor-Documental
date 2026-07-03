const USER_PREFERENCES_KEY_PREFIX = 'sendadocs.user.preferences.v1';
const VALID_THEME_MODES = new Set(['light', 'dark']);

const DEFAULT_USER_PREFERENCES = Object.freeze({
  profilePhotoDataUrl: '',
  themeMode: 'light',
});

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

const normalizeThemeMode = (value) => {
  return VALID_THEME_MODES.has(value) ? value : DEFAULT_USER_PREFERENCES.themeMode;
};

const buildUserPreferencesKey = (user) => {
  const identity = user?.id ?? user?.email ?? user?.usuario ?? 'default';
  return `${USER_PREFERENCES_KEY_PREFIX}.${encodeURIComponent(String(identity).trim().toLowerCase())}`;
};

const normalizeUserPreferences = (value) => ({
  profilePhotoDataUrl: typeof value?.profilePhotoDataUrl === 'string' ? value.profilePhotoDataUrl : '',
  themeMode: normalizeThemeMode(value?.themeMode),
});

const readUserPreferences = (user) => {
  const storage = getStorage();
  if (!storage) {
    return { ...DEFAULT_USER_PREFERENCES };
  }

  try {
    const raw = storage.getItem(buildUserPreferencesKey(user));
    return normalizeUserPreferences(raw ? JSON.parse(raw) : null);
  } catch {
    return { ...DEFAULT_USER_PREFERENCES };
  }
};

const saveUserPreferences = (user, preferences) => {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  try {
    storage.setItem(
      buildUserPreferencesKey(user),
      JSON.stringify(normalizeUserPreferences(preferences)),
    );
  } catch {
    // Ignore storage failures so profile settings never block the app.
  }
};

export {
  DEFAULT_USER_PREFERENCES,
  buildUserPreferencesKey,
  normalizeUserPreferences,
  readUserPreferences,
  saveUserPreferences,
};
