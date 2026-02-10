/**
 * เพิ่มคอลัมน์ full_name (ชื่อจริงนามสกุล) และ nickname (ชื่อเล่นแอดมิน) ในตาราง admins
 * รัน: node scripts/add-admins-fullname-nickname.js
 */
require('dotenv').config();
const pool = require('../config/database');

async function run() {
  try {
    await pool.query(`
      ALTER TABLE admins ADD COLUMN IF NOT EXISTS full_name VARCHAR(255);
      ALTER TABLE admins ADD COLUMN IF NOT EXISTS nickname VARCHAR(100);
    `);
    console.log('✅ เพิ่มคอลัมน์ admins.full_name และ admins.nickname แล้ว');
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
