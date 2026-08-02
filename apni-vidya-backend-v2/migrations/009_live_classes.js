module.exports = {
  up: async (client) => {
    // Add meet_link to batches table
    await client.query(`
      ALTER TABLE batches
      ADD COLUMN IF NOT EXISTS meet_link VARCHAR(255);
    `);
  },
  down: async (client) => {
    await client.query(`
      ALTER TABLE batches
      DROP COLUMN IF NOT EXISTS meet_link;
    `);
  }
};
