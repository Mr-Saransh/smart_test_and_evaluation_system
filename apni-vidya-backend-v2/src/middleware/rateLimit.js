const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');

// Normalise an IP to a stable key. For IPv6 we collapse to the /64 prefix so a
// single client rotating addresses inside its block can't trivially multiply
// its quota, while still not over-grouping distinct users.
function ipKey(req) {
  const ip = req.ip || req.connection?.remoteAddress || 'unknown';
  if (ip.includes(':')) {
    return ip.split(':').slice(0, 4).join(':');
  }
  return ip;
}

// Prefer the authenticated user as the bucket key. This is the fix for the
// shared-NAT problem: every student/teacher behind a school's single public IP
// gets their own quota instead of all sharing one IP bucket. Falls back to IP
// for unauthenticated traffic.
function userOrIpKey(req) {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    try {
      const decoded = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET);
      if (decoded && decoded.id) return `user:${decoded.id}`;
    } catch (_) {
      // invalid/expired token — fall through to IP keying
    }
  }
  return `ip:${ipKey(req)}`;
}

// General API limiter — generous, per authenticated user.
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: userOrIpKey,
  message: { error: 'Too many requests. Please slow down and try again shortly.' },
});

// Auth limiter — strict, to blunt credential brute-forcing. Keyed by IP + the
// phone being targeted so one school's shared NAT isn't locked out wholesale by
// a single attacker, while any individual account stays protected.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 15 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => `auth:${ipKey(req)}:${(req.body && (req.body.phone || req.body.email || req.body.identifier)) || ''}`,
  message: { error: 'Too many login attempts, try again later' },
});

module.exports = { apiLimiter, authLimiter, ipKey, userOrIpKey };
