/**
 * Standardized API Response Utility
 * Provides consistent response format across the application
 */

class ApiResponse {
  constructor(success = true, message = '', data = null, statusCode = 200) {
    this.success = success;
    this.message = message;
    this.data = data;
    this.statusCode = statusCode;
    this.timestamp = new Date().toISOString();
  }

  static success(message = 'Operation successful', data = null, statusCode = 200) {
    return new ApiResponse(true, message, data, statusCode);
  }

  static error(message = 'An error occurred', statusCode = 500, data = null) {
    return new ApiResponse(false, message, data, statusCode);
  }

  static created(data, message = 'Resource created successfully') {
    return new ApiResponse(true, message, data, 201);
  }

  static notFound(message = 'Resource not found') {
    return new ApiResponse(false, message, null, 404);
  }

  static badRequest(message = 'Bad request', data = null) {
    return new ApiResponse(false, message, data, 400);
  }

  static unauthorized(message = 'Unauthorized access') {
    return new ApiResponse(false, message, null, 401);
  }

  static forbidden(message = 'Access forbidden') {
    return new ApiResponse(false, message, null, 403);
  }

  toJSON() {
    const { statusCode, ...response } = this;
    return response;
  }
}

module.exports = ApiResponse;