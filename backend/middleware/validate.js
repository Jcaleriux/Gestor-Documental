const { createError } = require('../utils/errors');

const validate = (schema, source = 'body', options = {}) => (req, res, next) => {
  const { error, value } = schema.validate(req[source], {
    abortEarly: false,
    allowUnknown: true,
    ...options.joi
  });

  if (error) {
    return next(createError(400, options.message || error.details[0].message));
  }

  req[source] = value;
  return next();
};

const validateBody = (schema, options) => validate(schema, 'body', options);
const validateParams = (schema, options) => validate(schema, 'params', options);
const validateQuery = (schema, options) => validate(schema, 'query', options);

module.exports = {
  validate,
  validateBody,
  validateParams,
  validateQuery
};
