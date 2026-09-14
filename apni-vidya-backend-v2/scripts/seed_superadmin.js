const bcrypt = require('bcryptjs');
const db = require('../src/config/db');

async function provisionSuperAdmin() {
  const hash = await bcrypt.hash('admin123', 10);
  const check = await db.query(
    "SELECT id FROM users WHERE email = 'admin@apnividya.com' OR phone = '9999999999' OR role = 'super_admin' LIMIT 1"
  );
  let res;
  if (check.rows.length > 0) {
    res = await db.query(`
      UPDATE users 
      SET email = 'admin@apnividya.com',
          phone = '9999999999',
          password_hash = $1,
          role = 'super_admin',
          full_name = 'System Administrator',
          is_active = true,
          must_reset_password = false
      WHERE id = $2
      RETURNING id, phone, email, role, full_name;
    `, [hash, check.rows[0].id]);
  } else {
    res = await db.query(`
      INSERT INTO users (phone, email, password_hash, role, full_name, is_active, must_reset_password)
      VALUES ('9999999999', 'admin@apnividya.com', $1, 'super_admin', 'System Administrator', true, false)
      RETURNING id, phone, email, role, full_name;
    `, [hash]);
  }
  console.log('Super Admin user provisioned successfully:', res.rows[0]);
  process.exit(0);
}

provisionSuperAdmin().catch(err => {
  console.error(err);
  process.exit(1);
});
