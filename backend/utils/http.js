const toErrorResponse = (error, fallbackMessage = 'Internal server error', options = {}) => {
  const errorKey = options.errorKey || 'error';
  const status = error && error.status ? error.status : 500;
  const message = status >= 500
    ? fallbackMessage
    : (error && error.message ? error.message : fallbackMessage);
  const payload = { success: false, [errorKey]: message };

  if (error && error.data !== undefined) {
    payload.data = error.data;
  }

  return { status, payload };
};

const shouldLogError = (error) => !error || !error.status || error.status >= 500;
const isClientDisconnected = (req, res) => (
  Boolean(req?.aborted || res?.headersSent || res?.writableEnded || res?.destroyed)
);

const handleRequest = (handler, logMessage, fallbackMessage, options) => async (req, res) => {
  try {
    const data = await handler(req, res);
    if (isClientDisconnected(req, res)) {
      return;
    }
    if (data === undefined) {
      return res.json({ success: true });
    }
    return res.json({ success: true, data });
  } catch (error) {
    if (isClientDisconnected(req, res)) {
      return;
    }
    if (shouldLogError(error)) {
      console.error(logMessage, error);
    }
    const { status, payload } = toErrorResponse(error, fallbackMessage, options);
    return res.status(status).json(payload);
  }
};

module.exports = {
  toErrorResponse,
  shouldLogError,
  handleRequest
};
