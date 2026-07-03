import axios from 'axios';
import { fetchProtectedResource } from '../utils/protectedResources.js';

const getUserProfile = async () => {
  const response = await axios.get('/api/me/preferencias');
  return response.data?.data || null;
};

const updateUserPreferences = async ({ themeMode }) => {
  const response = await axios.patch('/api/me/preferencias', {
    theme_mode: themeMode,
  });
  return response.data?.data || null;
};

const uploadUserAvatar = async ({ fileBase64, filename, mimeType }) => {
  const response = await axios.put('/api/me/avatar', {
    filename,
    file_base64: fileBase64,
    mime_type: mimeType || null,
  });
  return response.data?.data || null;
};

const deleteUserAvatar = async () => {
  const response = await axios.delete('/api/me/avatar');
  return response.data?.data || null;
};

const fetchUserAvatarObjectUrl = async ({ url = '/api/me/avatar', urlApi } = {}) => {
  const { blob } = await fetchProtectedResource(url);
  const resolvedUrlApi = urlApi || (typeof window !== 'undefined' ? window.URL : globalThis.URL);

  if (!resolvedUrlApi?.createObjectURL) {
    throw new Error('No se pudo preparar la foto de perfil.');
  }

  return resolvedUrlApi.createObjectURL(blob);
};

export {
  deleteUserAvatar,
  fetchUserAvatarObjectUrl,
  getUserProfile,
  updateUserPreferences,
  uploadUserAvatar,
};
