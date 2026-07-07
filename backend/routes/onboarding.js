const express = require('express');
const {
  getStatus,
  setupInitialAdmin,
} = require('../services/onboardingService');
const { validateBody } = require('../middleware/validate');
const { onboardingSetupSchema } = require('../validation/schemas');

const router = express.Router();

router.get('/status', getStatus);
router.post(
  '/setup',
  validateBody(onboardingSetupSchema, { message: 'Datos de onboarding invalidos' }),
  setupInitialAdmin
);

module.exports = router;
