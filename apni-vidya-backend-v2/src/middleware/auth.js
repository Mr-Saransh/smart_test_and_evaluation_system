const jwt = require('jsonwebtoken');

function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

// Institute Ownership Middleware
// This checks if the user has access to the institute_id provided in params, query, or body.
const { hasInstituteAccess } = require('../utils/access');

function enforceTenant(req, res, next) {
  const institute_id = req.params.institute_id || req.body.institute_id || req.query.institute_id || req.headers['x-institute-id'];
  
  if (!institute_id) {
    // If no explicit institute_id is provided, we can either block it or pass it on.
    // For strict enforcement on tenant-specific routes, we should require it.
    return res.status(400).json({ error: 'institute_id is required' });
  }

  hasInstituteAccess(req.user, institute_id)
    .then(hasAccess => {
      if (!hasAccess) {
        return res.status(403).json({ error: 'Not authorized for this institute' });
      }
      // Attach the verified institute_id to req for downstream controllers to use safely.
      req.institute_id = institute_id;
      next();
    })
    .catch(next);
}

module.exports = { authenticate, authorize, enforceTenant };
