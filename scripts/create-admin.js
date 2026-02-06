/**
 * สร้างบัญชีแอดมินสำหรับเข้า CMS — ไม่แก้ไข/ลบผู้ใช้ลูกค้า
 * ใช้: node scripts/create-admin.js
 * หรือ: ADMIN_EMAIL=admin2@site.com ADMIN_PASSWORD=Secret123 node scripts/create-admin.js
 */
require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'line_flex_db',
});

const DEFAULT_USERNAME = 'admin1';
const DEFAULT_EMAIL = 'admin1@magicbiz.com';
const DEFAULT_PASSWORD = 'admin1234';

async function run() {
  const username = process.env.ADMIN_USERNAME || DEFAULT_USERNAME;
  const email = process.env.ADMIN_EMAIL || DEFAULT_EMAIL;
  const plainPassword = process.env.ADMIN_PASSWORD || DEFAULT_PASSWORD;

  if (plainPassword.length < 6) {
    console.error('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
    process.exit(1);
  }

  try {
    const hashedPassword = await bcrypt.hash(plainPassword, 10);
    await pool.query(
      `INSERT INTO admins (username, email, password)
       VALUES ($1, $2, $3)
       ON CONFLICT (username) DO UPDATE SET
         email = EXCLUDED.email,
         password = EXCLUDED.password`,
      [username, email, hashedPassword]
    );
    console.log('สร้าง/อัปเดตแอดมินแล้ว');
    console.log('  อีเมล:', email);
    console.log('  ชื่อผู้ใช้:', username);
    console.log('  ใช้รหัสผ่านที่ตั้งไว้เข้าได้ที่ /cms/login');
  } catch (err) {
    if (err.code === '23505') {
      console.error('ชื่อผู้ใช้หรืออีเมลนี้มีอยู่แล้ว ใช้ ON CONFLICT อัปเดตรหัสผ่านแล้ว หรือแก้ ADMIN_USERNAME/ADMIN_EMAIL');
    } else {
      console.error('Error:', err.message);
    }
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
