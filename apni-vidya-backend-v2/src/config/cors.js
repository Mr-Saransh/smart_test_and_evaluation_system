const { isProduction } = require('./env');

// Build the allowed-origin list from env. FRONTEND_URL may be a single origin
// or a comma-separated list (e.g. app + marketing site). In development we also
// allow common localhost dev-server ports so the Vite app works out of the box.
function allowedOrigins() {
  const fromEnv = (process.env.FRONTEND_URL || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (isProduction) return fromEnv;

  return [
    ...fromEnv,
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
  ];
}

// cors() options with a strict allowlist. Requests with no Origin header
// (curl, server-to-server, health checks) are allowed; browser requests from
// an unlisted origin are rejected.
const corsOptions = {
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    
    const allowed = allowedOrigins();
    // Allow vercel preview deployments and the specific prod URLs
    if (
      origin.endsWith('.vercel.app') || 
      origin === 'https://smart-test-and-evaluation-system.vercel.app' || 
      origin === 'https://lms.apnividya.in' || 
      allowed.includes(origin)
    ) {
      return callback(null, true);
    }
    
    return callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true,
};

module.exports = { corsOptions };
