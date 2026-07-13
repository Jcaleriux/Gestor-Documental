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

export const buildThemeDiscoveryTipKeys = (user) => {
  const identities = [
    user?.id,
    user?.email,
    user?.usuario,
  ]
    .map((identity) => String(identity ?? '').trim().toLowerCase())
    .filter(Boolean);
  const uniqueIdentities = [...new Set(identities.length > 0 ? identities : ['default'])];

  return uniqueIdentities.map((identity) => (
    `${THEME_DISCOVERY_TIP_KEY_PREFIX}.${encodeURIComponent(identity)}`
  ));
};

export const shouldShowThemeDiscoveryTip = (user) => {
  const storage = getStorage();
  if (!storage) {
    return false;
  }

  try {
    return !buildThemeDiscoveryTipKeys(user).some((key) => storage.getItem(key) === 'dismissed');
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
    buildThemeDiscoveryTipKeys(user).forEach((key) => {
      storage.setItem(key, 'dismissed');
    });
  } catch {
    // Ignore storage failures; this onboarding hint should never block the app.
  }
};
