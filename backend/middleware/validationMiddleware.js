/**
 * Validation Middleware
 * Handles request validation using Joi schemas
 */

const ApiResponse = require('../utils/apiResponse');

const validateRequest = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], { abortEarly: false, stripUnknown: true });

    if (error) {
      console.log("JOI VALIDATION ERROR:");
      console.log(error.details);

      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(400).json(
        ApiResponse.badRequest(error.details[0].message, errors)
      );
    }

    // Apply defaults and stripped values to the request
    req[property] = value;
    next();
  };
};

module.exports = {
  validateRequest
};