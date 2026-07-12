import axios from 'axios';

const getOnboardingStatus = () => axios.get('/api/onboarding/status');
const setupInitialAdmin = (payload) => axios.post('/api/onboarding/setup', payload);

export {
  getOnboardingStatus,
  setupInitialAdmin,
};
