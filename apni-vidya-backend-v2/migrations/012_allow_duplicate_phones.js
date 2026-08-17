module.exports = {
  name: '012_allow_duplicate_phones',
  sql: `
    -- Drop UNIQUE constraint on users.phone to allow siblings sharing the same phone number.
    -- Students authenticate via email, so phone is purely contact info.
    ALTER TABLE users DROP CONSTRAINT IF EXISTS users_phone_key;

    -- Also create an index on phone for login lookups (non-unique).
    CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
  `
};
