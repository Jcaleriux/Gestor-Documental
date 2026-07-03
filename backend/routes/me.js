const express = require('express');
const {
  deleteOwnAvatar,
  getOwnAvatarFile,
  getOwnProfile,
  updateOwnPreferences,
  uploadOwnAvatar,
} = require('../services/userProfileService');
const { validateBody } = require('../middleware/validate');
const {
  updateUserPreferencesSchema,
  uploadUserAvatarSchema,
} = require('../validation/schemas');

const router = express.Router({ mergeParams: true });

router.get('/me/preferencias', getOwnProfile);
router.patch(
  '/me/preferencias',
  validateBody(updateUserPreferencesSchema, { message: 'Preferencias de usuario invalidas' }),
  updateOwnPreferences
);
router.get('/me/avatar', getOwnAvatarFile);
router.put(
  '/me/avatar',
  validateBody(uploadUserAvatarSchema, { message: 'Avatar de usuario invalido' }),
  uploadOwnAvatar
);
router.delete('/me/avatar', deleteOwnAvatar);

module.exports = router;
