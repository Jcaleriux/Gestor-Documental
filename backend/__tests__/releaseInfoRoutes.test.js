const request = require('supertest');

jest.setTimeout(15000);

const RELEVANT_ENV_KEYS = [
  'SENDADOCS_RELEASE_VERSION',
  'SENDADOCS_RELEASE_COMMIT',
  'SENDADOCS_RELEASE_BRANCH',
];

const ORIGINAL_ENV = new Map(
  RELEVANT_ENV_KEYS.map((key) => [key, process.env[key]])
);

const restoreRelevantEnv = () => {
  RELEVANT_ENV_KEYS.forEach((key) => {
    const originalValue = ORIGINAL_ENV.get(key);

    if (typeof originalValue === 'undefined') {
      delete process.env[key];
      return;
    }

    process.env[key] = originalValue;
  });
};

describe('release info routes', () => {
  afterEach(() => {
    jest.resetModules();
    restoreRelevantEnv();
  });

  test('GET /api/release-info expone version y commit del deploy', async () => {
    process.env.SENDADOCS_RELEASE_VERSION = '1.0.0';
    process.env.SENDADOCS_RELEASE_COMMIT = 'abcdef1234567890abcdef1234567890abcdef12';
    process.env.SENDADOCS_RELEASE_BRANCH = 'main';

    const app = require('../app');
    const res = await request(app).get('/api/release-info');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      success: true,
      data: {
        version: '1.0.0',
        tag: 'v1.0.0',
        commit: 'abcdef1234567890abcdef1234567890abcdef12',
        commit_short: 'abcdef1',
        branch: 'main',
        sources: {
          version: 'env',
          commit: 'env',
          branch: 'env',
        },
      },
    });
  });

  test('GET /api/health incluye headers tecnicos de release', async () => {
    process.env.SENDADOCS_RELEASE_VERSION = '2.0.0';
    process.env.SENDADOCS_RELEASE_COMMIT = '1234567890abcdef1234567890abcdef12345678';
    process.env.SENDADOCS_RELEASE_BRANCH = 'release/candidate';

    const app = require('../app');
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.headers['x-sendadocs-release-version']).toBe('2.0.0');
    expect(res.headers['x-sendadocs-release-tag']).toBe('v2.0.0');
    expect(res.headers['x-sendadocs-release-commit']).toBe('1234567890abcdef1234567890abcdef12345678');
    expect(res.headers['x-sendadocs-release-commit-short']).toBe('1234567');
    expect(res.headers['x-sendadocs-release-branch']).toBe('release/candidate');
  });
});
