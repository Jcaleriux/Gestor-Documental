const { createError } = require('../utils/errors');
const { handleRequest } = require('../utils/http');
const { createFilesUseCases } = require('./filesUseCases');
const { ensureSociedadAccess } = require('./sociedadAccessService');
const documentResourceRepo = require('../repositories/documentResourceRepository');
const { resolvePendingPdfAccess } = require('./pendingPdfFileAccess');

const isRequestAbortedError = (err) => (
  Boolean(err)
  && (
    err.code === 'ECONNABORTED'
    || err.code === 'ECONNRESET'
    || /request aborted/i.test(String(err.message || ''))
  )
);

const sendFile = (res, fullPath, { logMessage, contentType, contentDisposition } = {}) => new Promise((resolve, reject) => {
  if (contentType) {
    res.type(contentType);
  }
  if (contentDisposition) {
    res.setHeader('Content-Disposition', contentDisposition);
  }

  res.sendFile(fullPath, (err) => {
    if (err) {
      if (isRequestAbortedError(err)) {
        return reject(createError(499, 'Client aborted request'));
      }
      console.error(logMessage, err);
      return reject(createError(404, 'File not found'));
    }
    return resolve();
  });
});

const authorizeFileAccess = async ({
  user,
  rawPath,
  kind,
  baseDir,
  documentResourceRepoImpl = documentResourceRepo,
  resolvePendingPdfAccessImpl = resolvePendingPdfAccess
}) => {
  const resources = await documentResourceRepoImpl.listDocumentResourcesByPath({ rawPath, kind });
  if (!Array.isArray(resources) || resources.length === 0) {
    if (kind === 'pdf') {
      const pendingResource = await resolvePendingPdfAccessImpl({ user, rawPath, baseDir });
      if (pendingResource) {
        return pendingResource;
      }
    }
    throw createError(404, 'File not found');
  }

  let accessError = null;
  for (const resource of resources) {
    try {
      await ensureSociedadAccess({ user, sociedadId: resource.sociedad_id });
      return resource;
    } catch (error) {
      if (error?.status === 403) {
        accessError = error;
        continue;
      }
      throw error;
    }
  }

  throw accessError || createError(403, 'No tiene acceso al archivo solicitado');
};

const inferKindFromPath = (rawPath) => (
  /\.xml(\?.*)?$/i.test(String(rawPath || '')) ? 'xml' : 'pdf'
);

const createFilesHandlers = (baseDir, dependencies = {}) => {
  const {
    createFilesUseCasesImpl = createFilesUseCases,
    documentResourceRepoImpl = documentResourceRepo,
    authorizeFileAccessImpl = authorizeFileAccess
  } = dependencies;
  const useCases = createFilesUseCasesImpl({ baseDir });

  const authorize = ({ req, rawPath, kind }) => authorizeFileAccessImpl({
    user: req.user,
    rawPath,
    kind,
    baseDir,
    documentResourceRepoImpl
  });

  const getXml = handleRequest(async (req, res) => {
    const rawPath = req.query.path;
    await authorize({ req, rawPath, kind: 'xml' });
    const { fullPath, filename } = useCases.getXmlFile({ rawPath });
    await sendFile(res, fullPath, {
      logMessage: 'Error sending XML file:',
      contentType: 'application/xml',
      contentDisposition: `inline; filename="${filename}"`
    });
  }, 'Error sending XML file:', 'Error sending XML file');

  const getPdf = handleRequest(async (req, res) => {
    const rawPath = req.query.path;
    await authorize({ req, rawPath, kind: 'pdf' });
    const { fullPath } = useCases.getPdfFile({ rawPath });
    await sendFile(res, fullPath, { logMessage: 'Error sending PDF file:' });
  }, 'Error sending PDF file:', 'Error sending PDF file');

  const getStatic = handleRequest(async (req, res) => {
    const rawPath = req.params?.[0] || req.path;
    const kind = inferKindFromPath(rawPath);
    await authorize({ req, rawPath, kind });
    const { fullPath, filename } = kind === 'xml'
      ? useCases.getXmlFile({ rawPath })
      : useCases.getPdfFile({ rawPath });
    await sendFile(res, fullPath, {
      logMessage: 'Error sending protected static file:',
      contentType: kind === 'xml' ? 'application/xml' : undefined,
      contentDisposition: kind === 'xml' ? `inline; filename="${filename}"` : undefined
    });
  }, 'Error sending protected static file:', 'Error sending protected static file');

  return { getXml, getPdf, getStatic };
};

module.exports = {
  createFilesHandlers,
  sendFile,
  authorizeFileAccess,
  inferKindFromPath,
  isRequestAbortedError
};
