const { ZodError } = require('zod');

const isProduction = () => process.env.NODE_ENV === 'production';

// Central error handler. Maps known error shapes to clean client responses and
// logs unexpected errors with request context (never the request body, which
// may contain passwords). For unexpected 500s in production the client gets a
// generic message while the full error is logged server-side.
function errorHandler(err, req, res, next) {
  // Validation errors from zod schemas.
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Validation failed',
      details: err.issues.map((i) => ({ field: i.path.join('.'), message: i.message })),
    });
  }

  // CORS rejection.
  if (err.message && err.message.includes('not allowed by CORS')) {
    return res.status(403).json({ error: 'Origin not allowed' });
  }

  // Postgres integrity errors.
  if (err.code === '23505') {
    return res.status(409).json({ error: 'A record with this value already exists' });
  }
  if (err.code === '23503') {
    return res.status(400).json({ error: 'Referenced record does not exist' });
  }

  const status = err.status || err.statusCode || 500;

  // Log server errors with context; client (4xx) errors are expected, log lean.
  if (status >= 500) {
    const logStr = `[error] ${req.method} ${req.originalUrl} -> ${err.stack || err.message}\\n`;
    console.error(logStr);
    require('fs').appendFileSync('global_error_log.txt', new Date().toISOString() + ' ' + logStr);
  }

  const message = status >= 500 && isProduction()
    ? 'Internal server error'
    : err.message || 'Internal server error';

  res.status(status).json({ error: message });
}

module.exports = errorHandler;
