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
  const configuredBase = path.resolve(baseDir);
  const projectRoot = path.resolve(__dirname, '..', '..');
  const allowedDocumentRoots = [...new Set([
    configuredBase,
    path.resolve(configuredBase, '..'),
    projectRoot,
    path.resolve(process.cwd())
  ].map((basePath) => path.resolve(resolveDocumentPaths(basePath).documentsRootDir)))];

  const isInsideAllowedDocumentRoots = (candidatePath) => {
    const resolvedCandidate = path.resolve(candidatePath);
    return allowedDocumentRoots.some((rootDir) => (
      resolvedCandidate === rootDir
      || resolvedCandidate.startsWith(`${rootDir}${path.sep}`)
    ));
  };

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

    if (decoded.includes('..') || decoded.includes('\0')) {
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

    const candidates = [];
    const addCandidate = (candidatePath) => {
      const resolvedCandidate = path.resolve(candidatePath);
      if (isInsideAllowedDocumentRoots(resolvedCandidate)) {
        candidates.push(resolvedCandidate);
      }
    };

    if (path.isAbsolute(decoded)) {
      const absoluteCandidate = path.resolve(path.normalize(decoded));
      if (!isInsideAllowedDocumentRoots(absoluteCandidate)) {
        throw createError(400, 'Invalid path');
      }
      candidates.push(absoluteCandidate);
    } else {
      const relativeVariants = getRelativePathVariants(decoded);
      relativeVariants.forEach((variant) => {
        addCandidate(path.resolve(configuredBase, variant));
        addCandidate(path.resolve(configuredBase, '..', variant));
        addCandidate(path.resolve(projectRoot, variant));
        addCandidate(path.resolve(process.cwd(), variant));
      });
    }

    const uniqueCandidates = [...new Set(candidates)];
    if (uniqueCandidates.length === 0) {
      throw createError(400, 'Invalid path');
    }

    const existingPath = uniqueCandidates.find((candidate) => fs.existsSync(candidate));
    const basename = path.basename(normalized);
    const fallbackPath = (!existingPath && !path.isAbsolute(decoded))
      ? findByBasename(basename, allowedDocumentRoots)
      : null;
    const fullPath = existingPath || fallbackPath;

    if (!fullPath) {
      throw createError(404, 'File not found');
    }

    if (!isInsideAllowedDocumentRoots(fullPath)) {
      throw createError(400, 'Invalid path');
    }

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
