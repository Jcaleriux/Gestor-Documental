const path = require('path');
const { spawnSync } = require('child_process');

const backendRootDir = path.resolve(__dirname, '..');

const parseCliArgs = (argv) => {
  const args = [...argv];
  const options = {
    envFilePath: '',
    targetScriptPath: '',
    targetArgs: [],
  };

  while (args.length > 0) {
    const current = args.shift();

    if (current === '--env-file') {
      const nextValue = args.shift();

      if (!nextValue) {
        throw new Error('Debes indicar una ruta despues de --env-file.');
      }

      options.envFilePath = nextValue;
      continue;
    }

    options.targetScriptPath = current;
    options.targetArgs = args;
    break;
  }

  if (!options.envFilePath) {
    throw new Error('Debes indicar --env-file para ejecutar este launcher.');
  }

  if (!options.targetScriptPath) {
    throw new Error('Debes indicar el script Node a ejecutar.');
  }

  return options;
};

const runWithEnvFile = ({
  envFilePath,
  targetScriptPath,
  targetArgs = [],
} = {}) => {
  const resolvedEnvFilePath = path.isAbsolute(envFilePath)
    ? envFilePath
    : path.resolve(backendRootDir, envFilePath);
  const resolvedTargetScriptPath = path.isAbsolute(targetScriptPath)
    ? targetScriptPath
    : path.resolve(backendRootDir, targetScriptPath);
  const child = spawnSync(
    process.execPath,
    [resolvedTargetScriptPath, ...targetArgs],
    {
      cwd: backendRootDir,
      stdio: 'inherit',
      env: {
        ...process.env,
        SENDADOCS_ENV_FILE: resolvedEnvFilePath,
      },
    }
  );

  if (child.error) {
    throw child.error;
  }

  process.exitCode = typeof child.status === 'number' ? child.status : 1;
  return child.status;
};

module.exports = {
  parseCliArgs,
  runWithEnvFile,
};

if (require.main === module) {
  try {
    const options = parseCliArgs(process.argv.slice(2));
    runWithEnvFile(options);
  } catch (error) {
    console.error('Launcher con env file fallo:', error.message);
    process.exitCode = 1;
  }
}
