// Migration 014 - add deferred_capacity to batches
const migration = `
ALTER TABLE batches ADD COLUMN IF NOT EXISTS deferred_capacity INTEGER DEFAULT 0;
`;

module.exports = { name: '014_batch_deferred_capacity', sql: migration };
