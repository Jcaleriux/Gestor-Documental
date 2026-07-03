const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  applyReleaseHeaders,
  readGitMetadata,
  readTargetVersion,
  resolveReleaseInfo,
} = require('../config/releaseInfo');

describe('release info config', () => {
  test('resolveReleaseInfo prioriza overrides explicitos de entorno', () => {
    const info = resolveReleaseInfo({
      env: {
        SENDADOCS_RELEASE_VERSION: '1.2.3',
        SENDADOCS_RELEASE_COMMIT: 'abcdef1234567890',
        SENDADOCS_RELEASE_BRANCH: 'release/test',
      },
    });

    expect(info).toMatchObject({
      version: '1.2.3',
      tag: 'v1.2.3',
      commit: 'abcdef1234567890',
      commitShort: 'abcdef1',
      branch: 'release/test',
      sources: {
        version: 'env',
        commit: 'env',
        branch: 'env',
      },
    });
  });

  test('resolveReleaseInfo usa VERSION y git cuando no hay overrides', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sendadocs-release-info-'));
    const versionFilePath = path.join(tmpDir, 'VERSION');
    const gitDirPath = path.join(tmpDir, '.git');
    const refsDirPath = path.join(gitDirPath, 'refs', 'heads');
    fs.mkdirSync(refsDirPath, { recursive: true });
    fs.writeFileSync(versionFilePath, '1.0.9\n', 'utf8');
    fs.writeFileSync(path.join(gitDirPath, 'HEAD'), 'ref: refs/heads/main\n', 'utf8');
    fs.writeFileSync(path.join(refsDirPath, 'main'), '1234567890abcdef1234567890abcdef12345678\n', 'utf8');

    const info = resolveReleaseInfo({
      env: {},
      versionFilePath,
      rootDir: tmpDir,
    });

    expect(info).toMatchObject({
      version: '1.0.9',
      tag: 'v1.0.9',
      commit: '1234567890abcdef1234567890abcdef12345678',
      commitShort: '1234567',
      branch: 'main',
      sources: {
        version: 'version_file',
        commit: 'git',
        branch: 'git',
      },
    });

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('readTargetVersion exige archivo no vacio', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sendadocs-release-version-'));
    const versionFilePath = path.join(tmpDir, 'VERSION');
    fs.writeFileSync(versionFilePath, '1.0.0\n', 'utf8');

    expect(readTargetVersion({ versionFilePath })).toBe('1.0.0');
    expect(readGitMetadata({ rootDir: tmpDir })).toEqual({
      branch: '',
      commit: '',
    });

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('readGitMetadata usa fallback de entorno cuando el repo esta detached y se permite', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sendadocs-release-detached-'));
    const gitDirPath = path.join(tmpDir, '.git');
    fs.mkdirSync(gitDirPath, { recursive: true });
    fs.writeFileSync(gitDirPath + path.sep + 'HEAD', 'ec3b6d7aee6dbec614c4b60340d203f58798b0aa\n', 'utf8');

    expect(readGitMetadata({
      rootDir: tmpDir,
      env: {
        GITHUB_HEAD_REF: 'refactor-solid-frontend',
        GITHUB_SHA: '0fa4083dd1e268db72fe118d317a5d43ada0cf2c',
      },
      allowEnvFallback: true,
    })).toEqual({
      branch: 'refactor-solid-frontend',
      commit: 'ec3b6d7aee6dbec614c4b60340d203f58798b0aa',
    });

    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('applyReleaseHeaders publica metadata solo cuando existe', () => {
    const headers = {};
    const response = {
      setHeader: (name, value) => {
        headers[name] = value;
      },
    };

    applyReleaseHeaders(response, {
      version: '1.0.0',
      tag: 'v1.0.0',
      commit: 'abcdef1234567890',
      commitShort: 'abcdef1',
      branch: 'main',
    });

    expect(headers).toMatchObject({
      'X-SendaDocs-Release-Version': '1.0.0',
      'X-SendaDocs-Release-Tag': 'v1.0.0',
      'X-SendaDocs-Release-Commit': 'abcdef1234567890',
      'X-SendaDocs-Release-Commit-Short': 'abcdef1',
      'X-SendaDocs-Release-Branch': 'main',
    });
  });
});
