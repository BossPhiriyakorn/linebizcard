/**
 * ลบบัญชีแอดมินจากตาราง admins ตามอีเมล — ไม่กระทบตาราง users (ลูกค้า)
 * ใช้: node scripts/delete-admin.js
 * หรือ: ADMIN_EMAIL=admin@magicbizcard.local node scripts/delete-admin.js
 */
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'line_flex_db',
});

const DEFAULT_EMAIL = 'admin@magicbizcard.local';

async function run() {
  const email = process.env.ADMIN_EMAIL || DEFAULT_EMAIL;

  try {
    const res = await pool.query(
      'DELETE FROM admins WHERE email = $1',
      [email]
    );
    if (res.rowCount === 0) {
      console.log('ไม่พบแอดมินที่มีอีเมล:', email);
    } else {
      console.log('ลบแอดมินแล้ว (อีเมล:', email, ') จำนวน:', res.rowCount);
    }
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
