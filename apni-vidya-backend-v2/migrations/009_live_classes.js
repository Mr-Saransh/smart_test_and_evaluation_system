module.exports = {
  name: '009_live_classes',
  sql: `
    ALTER TABLE batches
    ADD COLUMN IF NOT EXISTS meet_link VARCHAR(255);
  `
};
