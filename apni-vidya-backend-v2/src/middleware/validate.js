// Validation middleware factory. Pass a zod schema; on success the parsed
// (and coerced) value replaces req.body so controllers get clean data. On
// failure it forwards a ZodError, which the error handler renders as a 400
// with per-field messages.
function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) return next(result.error);
    req.body = result.data;
    next();
  };
}

module.exports = { validate };
