// Migration 011 — Widen user phone column to avoid length overflow on placeholder phones
const migration = `
ALTER TABLE users ALTER COLUMN phone TYPE VARCHAR(50);
`;

module.exports = { name: '011_widen_user_phone', sql: migration };
