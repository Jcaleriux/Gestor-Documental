const fs = require('fs');
const path = require('path');

const repoRootDir = path.resolve(__dirname, '..', '..');

const readOptionalEnvValue = (value) => {
  if (typeof value !== 'string') {
    return '';
  }

  const trimmed = value.trim();
  return trimmed || '';
};

const readTargetVersion = ({ versionFilePath = path.join(repoRootDir, 'VERSION') } = {}) => {
  if (!fs.existsSync(versionFilePath)) {
    throw new Error('No existe VERSION en la raiz del repo.');
  }

  const rawValue = fs.readFileSync(versionFilePath, 'utf8').trim();

  if (!rawValue) {
    throw new Error('VERSION no puede estar vacio.');
  }

  return rawValue;
};

const resolveGitDir = (rootDir = repoRootDir) => {
  const dotGitPath = path.join(rootDir, '.git');

  if (!fs.existsSync(dotGitPath)) {
    return null;
  }

  const stat = fs.statSync(dotGitPath);
  if (stat.isDirectory()) {
    return dotGitPath;
  }

  const content = fs.readFileSync(dotGitPath, 'utf8').trim();
  const prefix = 'gitdir:';

  if (!content.startsWith(prefix)) {
    return null;
  }

  return path.resolve(rootDir, content.slice(prefix.length).trim());
};

const readPackedRef = ({ gitDirPath, refPath }) => {
  const packedRefsPath = path.join(gitDirPath, 'packed-refs');

  if (!fs.existsSync(packedRefsPath)) {
    return '';
  }

  const content = fs.readFileSync(packedRefsPath, 'utf8');
  const match = content
    .split(/\r?\n/)
    .find((line) => line.endsWith(` ${refPath}`));

  return match ? match.split(' ')[0].trim() : '';
};

const readGitMetadata = ({ rootDir = repoRootDir } = {}) => {
  const gitDirPath = resolveGitDir(rootDir);

  if (!gitDirPath) {
    return {
      branch: '',
      commit: '',
    };
  }

  const headPath = path.join(gitDirPath, 'HEAD');

  if (!fs.existsSync(headPath)) {
    return {
      branch: '',
      commit: '',
    };
  }

  const headContent = fs.readFileSync(headPath, 'utf8').trim();

  if (!headContent.startsWith('ref:')) {
    return {
      branch: '',
      commit: headContent,
    };
  }

  const refPath = headContent.slice('ref:'.length).trim();
  const branch = refPath.split('/').pop() || '';
  const refFilePath = path.join(gitDirPath, ...refPath.split('/'));
  const commit = fs.existsSync(refFilePath)
    ? fs.readFileSync(refFilePath, 'utf8').trim()
    : readPackedRef({ gitDirPath, refPath });

  return {
    branch,
    commit,
  };
};

const resolveReleaseInfo = ({
  env = process.env,
  versionFilePath,
  rootDir = repoRootDir,
} = {}) => {
  const explicitVersion = readOptionalEnvValue(env.NOVOGAR_RELEASE_VERSION);
  const explicitCommit = readOptionalEnvValue(env.NOVOGAR_RELEASE_COMMIT);
  const explicitBranch = readOptionalEnvValue(env.NOVOGAR_RELEASE_BRANCH);

  let version = explicitVersion;
  let versionSource = explicitVersion ? 'env' : 'unknown';

  if (!version) {
    try {
      version = readTargetVersion({ versionFilePath });
      versionSource = 'version_file';
    } catch (error) {
      version = '';
    }
  }

  const gitMetadata = (!explicitCommit || !explicitBranch)
    ? readGitMetadata({ rootDir })
    : { branch: '', commit: '' };
  const commit = explicitCommit || gitMetadata.commit || '';
  const branch = explicitBranch || gitMetadata.branch || '';

  return {
    version,
    commit,
    commitShort: commit ? commit.slice(0, 7) : '',
    branch,
    tag: version ? `v${version}` : '',
    sources: {
      version: versionSource,
      commit: explicitCommit ? 'env' : (gitMetadata.commit ? 'git' : 'unknown'),
      branch: explicitBranch ? 'env' : (gitMetadata.branch ? 'git' : 'unknown'),
    },
  };
};

const applyReleaseHeaders = (response, releaseInfo = resolveReleaseInfo()) => {
  if (releaseInfo.version) {
    response.setHeader('X-Novogar-Release-Version', releaseInfo.version);
  }

  if (releaseInfo.tag) {
    response.setHeader('X-Novogar-Release-Tag', releaseInfo.tag);
  }

  if (releaseInfo.commit) {
    response.setHeader('X-Novogar-Release-Commit', releaseInfo.commit);
    response.setHeader('X-Novogar-Release-Commit-Short', releaseInfo.commitShort);
  }

  if (releaseInfo.branch) {
    response.setHeader('X-Novogar-Release-Branch', releaseInfo.branch);
  }

  return response;
};

module.exports = {
  applyReleaseHeaders,
  readTargetVersion,
  readGitMetadata,
  resolveReleaseInfo,
};
