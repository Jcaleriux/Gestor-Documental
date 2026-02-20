const fs = require('fs');
const path = require('path');
const { assertFound, createError } = require('../utils/errors');
const { getRelativePathVariants } = require('../utils/documentPaths');

const createStoredPathResolver = ({ baseDir }) => {
  const configuredBaseDir = path.resolve(baseDir);
  const projectRoot = path.resolve(__dirname, '..', '..');

  return (rawPath) => {
    if (!rawPath) return null;

    const raw = String(rawPath).replace(/\\/g, '/');
    const normalized = raw.replace(/^\/+/, '');
    const variants = getRelativePathVariants(normalized);

    const candidates = path.isAbsolute(raw)
      ? [path.normalize(raw)]
      : variants.flatMap((variant) => ([
        path.resolve(configuredBaseDir, variant),
        path.resolve(configuredBaseDir, '..', variant),
        path.resolve(projectRoot, variant),
        path.resolve(process.cwd(), variant)
      ]));

    return candidates.find((candidate) => fs.existsSync(candidate)) || candidates[0];
  };
};

const findManifestInDir = (dirPath) => {
  if (!dirPath || !fs.existsSync(dirPath)) return null;

  let entries = [];
  try {
    entries = fs.readdirSync(dirPath, { withFileTypes: true });
  } catch (e) {
    return null;
  }

  const manifests = entries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.manifest.json'))
    .map((entry) => {
      const fullPath = path.join(dirPath, entry.name);
      const stats = fs.statSync(fullPath);
      return { fullPath, mtimeMs: stats.mtimeMs };
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs);

  return manifests[0]?.fullPath || null;
};

const readManifestJson = (manifestPath) => {
  try {
    return JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } catch (e) {
    throw createError(500, 'No se pudo leer el manifiesto');
  }
};

const toManifestResponsePath = (manifestPath) => {
  const cwd = path.resolve(process.cwd());
  const relativeManifestPath = path.relative(cwd, manifestPath).replace(/\\/g, '/');
  return relativeManifestPath && !relativeManifestPath.startsWith('..')
    ? relativeManifestPath
    : manifestPath.replace(/\\/g, '/');
};

const createFacturasManifestResolver = ({ baseDir }) => {
  const resolveStoredPath = createStoredPathResolver({ baseDir });

  const resolveManifestPath = ({ rutaXml, rutaPdf }) => {
    const candidateFiles = [rutaXml, rutaPdf]
      .filter(Boolean)
      .map(resolveStoredPath);

    const candidateDirs = [...new Set(candidateFiles.map((filePath) => path.dirname(filePath)))];

    return candidateDirs
      .map(findManifestInDir)
      .find(Boolean);
  };

  const readManifestForDocument = ({ rutaXml, rutaPdf, notFoundMessage }) => {
    const manifestPath = resolveManifestPath({ rutaXml, rutaPdf });
    assertFound(manifestPath, notFoundMessage);

    return {
      manifest: readManifestJson(manifestPath),
      manifestPath: toManifestResponsePath(manifestPath)
    };
  };

  return {
    readManifestForDocument
  };
};

module.exports = { createFacturasManifestResolver };
