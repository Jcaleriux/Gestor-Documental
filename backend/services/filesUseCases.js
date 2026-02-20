const path = require('path');
const fs = require('fs');
const { createError } = require('../utils/errors');
const {
  getRelativePathVariants,
  resolveDocumentPaths
} = require('../utils/documentPaths');

const createFilesUseCases = ({ baseDir }) => {
  if (!baseDir) {
    throw new Error('baseDir requerido');
  }

  const resolvedPathCache = new Map();
  const basenameCache = new Map();

  const normalizePath = (raw) => {
    if (!raw) {
      throw createError(400, 'Path parameter required');
    }

    let decoded;
    try {
      decoded = decodeURIComponent(raw).replace(/\\/g, '/');
    } catch (e) {
      throw createError(400, 'Invalid path encoding');
    }

    if (decoded.includes('..')) {
      throw createError(400, 'Invalid path');
    }

    return decoded;
  };

  const findByBasename = (basename, roots) => {
    if (!basename) {
      return null;
    }
    if (basenameCache.has(basename)) {
      return basenameCache.get(basename);
    }

    for (const root of roots) {
      if (!root || !fs.existsSync(root)) {
        continue;
      }

      const stack = [root];
      while (stack.length) {
        const current = stack.pop();
        let entries = [];
        try {
          entries = fs.readdirSync(current, { withFileTypes: true });
        } catch (e) {
          continue;
        }

        for (const entry of entries) {
          const entryPath = path.join(current, entry.name);
          if (entry.isDirectory()) {
            stack.push(entryPath);
            continue;
          }
          if (entry.isFile() && entry.name === basename) {
            basenameCache.set(basename, entryPath);
            return entryPath;
          }
        }
      }
    }

    basenameCache.set(basename, null);
    return null;
  };

  const resolveFile = (rawPath) => {
    const decoded = normalizePath(rawPath);
    const normalized = decoded.replace(/^\/+/, '');
    if (resolvedPathCache.has(normalized)) {
      const cached = resolvedPathCache.get(normalized);
      return { fullPath: cached, filename: path.basename(normalized) };
    }

    const configuredBase = path.resolve(baseDir);
    const projectRoot = path.resolve(__dirname, '..', '..');

    const candidates = [];

    if (path.isAbsolute(decoded)) {
      candidates.push(path.normalize(decoded));
    } else {
      const relativeVariants = getRelativePathVariants(decoded);
      relativeVariants.forEach((variant) => {
        candidates.push(path.resolve(configuredBase, variant));
        candidates.push(path.resolve(configuredBase, '..', variant));
        candidates.push(path.resolve(projectRoot, variant));
        candidates.push(path.resolve(process.cwd(), variant));
      });
    }

    const uniqueCandidates = [...new Set(candidates)];
    const existingPath = uniqueCandidates.find((candidate) => fs.existsSync(candidate));
    const basename = path.basename(normalized);
    const searchBases = [
      configuredBase,
      path.resolve(configuredBase, '..'),
      projectRoot,
      path.resolve(process.cwd())
    ];
    const documentsRoots = [...new Set(searchBases.flatMap((basePath) => {
      const paths = resolveDocumentPaths(basePath);
      return [paths.documentsRootDir, paths.legacyDocumentsRootDir];
    }))];
    const fallbackPath = existingPath ? null : findByBasename(basename, documentsRoots);
    const fullPath = existingPath || fallbackPath || uniqueCandidates[0];

    resolvedPathCache.set(normalized, fullPath);

    return { fullPath, filename: path.basename(normalized) };
  };

  const getXmlFile = ({ rawPath }) => resolveFile(rawPath);
  const getPdfFile = ({ rawPath }) => resolveFile(rawPath);

  return {
    getXmlFile,
    getPdfFile
  };
};

module.exports = { createFilesUseCases };
