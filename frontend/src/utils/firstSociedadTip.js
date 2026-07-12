const FIRST_SOCIEDAD_TIP_KEY_PREFIX = 'sendadocs.firstSociedadTip.v1';

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

export const buildFirstSociedadTipKey = (user) => {
  const identity = user?.id ?? user?.email ?? user?.usuario ?? 'default';
  return `${FIRST_SOCIEDAD_TIP_KEY_PREFIX}.${encodeURIComponent(String(identity).trim().toLowerCase())}`;
};

export const shouldShowFirstSociedadTip = (user) => {
  const storage = getStorage();
  if (!storage) {
    return false;
  }

  try {
    return storage.getItem(buildFirstSociedadTipKey(user)) !== 'dismissed';
  } catch {
    return false;
  }
};

export const markFirstSociedadTipDismissed = (user) => {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  try {
    storage.setItem(buildFirstSociedadTipKey(user), 'dismissed');
  } catch {
    // Ignore storage failures; this guide should never block the app.
  }
};
