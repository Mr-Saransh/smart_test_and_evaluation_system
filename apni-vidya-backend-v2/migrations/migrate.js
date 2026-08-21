require('dotenv').config();
const db = require('../src/config/db');

// Ordered list of migrations. Each module exports { name, sql }. Every SQL block
// is idempotent (IF NOT EXISTS / ADD COLUMN IF NOT EXISTS), so an existing
// database that predates schema_migrations adopts the tracking cleanly: each
// migration runs once, records itself, and is skipped thereafter.
const migrations = [
  require('./run.js'),
  require('./002_platform.js'),
  require('./003_timetable.js'),
  require('./004_notifications.js'),
  require('./005_password_resets.js'),
  require('./006_payments.js'),
  require('./007_materials_and_reports.js'),
  require('./008_superadmin_and_tests.js'),
  require('./009_live_classes.js'),
  require('./010_student_admission.js'),
  require('./011_widen_user_phone.js'),
  require('./012_allow_duplicate_phones.js'),
  require('./013_batch_payments.js'),
  require('./014_batch_deferred_capacity.js'),
  require('./015_test_engine_enhancements.js'),
];

async function migrate() {
  await db.query(
    `CREATE TABLE IF NOT EXISTS schema_migrations (
       name        VARCHAR(255) PRIMARY KEY,
       applied_at  TIMESTAMPTZ DEFAULT now()
     )`
  );

  const applied = new Set(
    (await db.query('SELECT name FROM schema_migrations')).rows.map((r) => r.name)
  );

  let ran = 0;
  for (const m of migrations) {
    if (applied.has(m.name)) {
      console.log(`• skip   ${m.name} (already applied)`);
      continue;
    }
    const client = await db.getClient();
    try {
      await client.query('BEGIN');
      await client.query(m.sql);
      await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [m.name]);
      await client.query('COMMIT');
      console.log(`✓ apply  ${m.name}`);
      ran++;
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(`✗ FAILED ${m.name}: ${err.message}`);
      process.exit(1);
    } finally {
      client.release();
    }
  }
  console.log(`\nMigrations complete — ${ran} applied, ${migrations.length - ran} already up to date.`);
  process.exit(0);
}

migrate();
