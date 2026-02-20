const { createError } = require('../utils/errors');
const { handleRequest } = require('../utils/http');
const { createFilesUseCases } = require('./filesUseCases');

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

const createFilesHandlers = (baseDir) => {
  const useCases = createFilesUseCases({ baseDir });

  const getXml = handleRequest(async (req, res) => {
    const { fullPath, filename } = useCases.getXmlFile({ rawPath: req.query.path });
    await sendFile(res, fullPath, {
      logMessage: 'Error sending XML file:',
      contentType: 'application/xml',
      contentDisposition: `inline; filename="${filename}"`
    });
  }, 'Error sending XML file:', 'Error sending XML file');

  const getPdf = handleRequest(async (req, res) => {
    const { fullPath } = useCases.getPdfFile({ rawPath: req.query.path });
    await sendFile(res, fullPath, { logMessage: 'Error sending PDF file:' });
  }, 'Error sending PDF file:', 'Error sending PDF file');

  return { getXml, getPdf };
};

module.exports = {
  createFilesHandlers,
  sendFile,
  isRequestAbortedError
};
