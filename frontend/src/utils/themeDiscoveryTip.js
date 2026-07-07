const THEME_DISCOVERY_TIP_KEY_PREFIX = 'sendadocs.theme.discoveryTip.v1';

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

export const buildThemeDiscoveryTipKey = (user) => {
  const identity = user?.id ?? user?.email ?? user?.usuario ?? 'default';
  return `${THEME_DISCOVERY_TIP_KEY_PREFIX}.${encodeURIComponent(String(identity).trim().toLowerCase())}`;
};

export const shouldShowThemeDiscoveryTip = (user) => {
  const storage = getStorage();
  if (!storage) {
    return false;
  }

  try {
    return storage.getItem(buildThemeDiscoveryTipKey(user)) !== 'dismissed';
  } catch {
    return false;
  }
};

export const markThemeDiscoveryTipDismissed = (user) => {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  try {
    storage.setItem(buildThemeDiscoveryTipKey(user), 'dismissed');
  } catch {
    // Ignore storage failures; this onboarding hint should never block the app.
  }
};
