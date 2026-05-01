/* Centralized error class + handler */
class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

function notFound(req, res, next) {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  const payload = {
    error: err.message || 'Internal server error',
  };
  if (err.details) payload.details = err.details;
  if (process.env.NODE_ENV !== 'production' && status >= 500) {
    payload.stack = err.stack;
  }
  if (status >= 500) {
    // eslint-disable-next-line no-console
    console.error('[ERROR]', err);
  }
  res.status(status).json(payload);
}

module.exports = { ApiError, notFound, errorHandler };
