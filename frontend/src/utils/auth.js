const AUTH_TOKEN_KEY = 'novogar_auth_token';
const AUTH_USER_KEY = 'novogar_auth_user';

const getAuthToken = () => localStorage.getItem(AUTH_TOKEN_KEY) || '';

const getAuthUser = () => {
  const raw = localStorage.getItem(AUTH_USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const saveAuthSession = ({ token, user }) => {
  if (token) {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
  }
  if (user) {
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(AUTH_USER_KEY);
  }
};

const clearAuthSession = () => {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_USER_KEY);
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
