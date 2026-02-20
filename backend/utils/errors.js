class AppError extends Error {
  constructor(message, status = 500, data) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    if (data !== undefined) {
      this.data = data;
    }
  }
}

const createError = (status, message, data) => new AppError(message, status, data);

const assertFound = (entity, message) => {
  if (!entity) {
    throw createError(404, message);
  }
  return entity;
};

const throwIfValidationError = (validation) => {
  if (!validation || !validation.status) {
    return;
  }
  throw createError(validation.status, validation.error, validation.data);
};

module.exports = {
  AppError,
  createError,
  assertFound,
  throwIfValidationError
};
