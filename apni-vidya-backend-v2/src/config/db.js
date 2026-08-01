const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// An idle client in the pool can emit an error on a transient network/DB
// blip (server restart, dropped connection, failover). The pool will discard
// the broken client and create a fresh one on the next query, so we log and
// recover instead of taking the whole process down.
pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client (recovering):', err.message);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  getClient: () => pool.connect(),
  pool,
};
