/**
 * middleware/errorHandler.js
 * Central error-handling middleware. Any error passed to next(error) from a
 * controller (or thrown inside an async route wrapped with asyncHandler)
 * ends up here, ensuring the API always returns a consistent JSON shape
 * instead of leaking stack traces or crashing the process.
 */

// Wraps async route handlers so rejected promises are forwarded to
// Express's error handler instead of crashing the server.
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

const notFoundHandler = (req, res) => {
  res.status(404).json({ success: false, message: `Route not found: ${req.originalUrl}` });
};

const errorHandler = (err, req, res, next) => {
  console.error('❌ Error:', err.message);

  // Duplicate entry (e.g. email already registered)
  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ success: false, message: 'This email is already registered.' });
  }

  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: statusCode === 500 ? 'Internal server error. Please try again later.' : err.message,
  });
};

module.exports = { asyncHandler, notFoundHandler, errorHandler };
