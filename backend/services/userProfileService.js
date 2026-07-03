const { runtimeConfig } = require('../config/runtime');
const { handleRequest } = require('../utils/http');
const { sendFile } = require('./filesService');
const { createUserProfileStorage } = require('./userProfileStorage');
const { createUserProfileUseCases } = require('./userProfileUseCases');
const usuariosRepo = require('../repositories/usuariosRepository');
const profileRepo = require('../repositories/userProfileRepository');

const storage = createUserProfileStorage({
  baseDir: runtimeConfig.storageBaseDir,
  maxAvatarMb: runtimeConfig.maxProfileAvatarMb,
});

const useCases = createUserProfileUseCases({
  profileRepo,
  usuariosRepo,
  storage,
});

const getOwnProfile = handleRequest(async (req) => {
  return useCases.getOwnProfile({ user: req.user });
}, 'Error fetching user profile:', 'Error fetching user profile');

const updateOwnPreferences = handleRequest(async (req) => {
  const { theme_mode } = req.body || {};
  return useCases.updateOwnPreferences({
    user: req.user,
    theme_mode,
  });
}, 'Error updating user preferences:', 'Error updating user preferences');

const uploadOwnAvatar = handleRequest(async (req) => {
  const {
    filename,
    file_base64,
    mime_type,
  } = req.body || {};

  return useCases.uploadOwnAvatar({
    user: req.user,
    filename,
    file_base64,
    mime_type,
  });
}, 'Error uploading user avatar:', 'Error uploading user avatar');

const deleteOwnAvatar = handleRequest(async (req) => {
  return useCases.deleteOwnAvatar({ user: req.user });
}, 'Error deleting user avatar:', 'Error deleting user avatar');

const deleteUsuarioAvatar = handleRequest(async (req) => {
  return useCases.deleteUsuarioAvatar({
    actor: req.user,
    userId: req.params.id,
  });
}, 'Error deleting usuario avatar:', 'Error deleting usuario avatar');

const getOwnAvatarFile = handleRequest(async (req, res) => {
  const { avatar, fullPath } = await useCases.getOwnAvatarFile({ user: req.user });
  await sendFile(res, fullPath, {
    logMessage: 'Error sending user avatar:',
    contentType: avatar.mime_type,
    contentDisposition: `inline; filename="${avatar.nombre_archivo}"`,
  });
}, 'Error sending user avatar:', 'Error sending user avatar');

module.exports = {
  deleteOwnAvatar,
  deleteUsuarioAvatar,
  getOwnAvatarFile,
  getOwnProfile,
  updateOwnPreferences,
  uploadOwnAvatar,
};
