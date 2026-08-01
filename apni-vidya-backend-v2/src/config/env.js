require('dotenv').config();

// Values shipped in .env.example that must never reach production untouched.
const INSECURE_DEFAULTS = [
  'your-secret-key-change-in-production',
  'change-me',
  'secret',
  'changeme',
];

const isProduction = process.env.NODE_ENV === 'production';

function fail(messages) {
  console.error('\n  Refusing to start — environment is not configured safely:\n');
  for (const m of messages) console.error(`   • ${m}`);
  console.error('\n  Fix the above in your .env file (see .env.example) and restart.\n');
  process.exit(1);
}

function validateEnv() {
  const errors = [];
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    errors.push('JWT_SECRET is not set.');
  } else {
    if (INSECURE_DEFAULTS.includes(secret.trim().toLowerCase())) {
      errors.push('JWT_SECRET is still the example/default value. Generate a unique secret.');
    }
    if (secret.length < 32) {
      errors.push('JWT_SECRET is too short (minimum 32 characters recommended).');
    }
  }

  if (!process.env.DATABASE_URL) {
    errors.push('DATABASE_URL is not set.');
  }

  if (errors.length) {
    if (isProduction) {
      // Hard stop in production — a default secret means anyone can forge tokens.
      errors.push('Tip: generate one with  node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"');
      fail(errors);
    } else {
      // Non-production: warn loudly but allow the app to boot for local dev.
      console.warn('\n  ⚠  Insecure environment configuration detected (allowed in non-production):');
      for (const m of errors) console.warn(`   • ${m}`);
      console.warn('   This WILL block startup when NODE_ENV=production.\n');
    }
  }
}

module.exports = { validateEnv, isProduction };
