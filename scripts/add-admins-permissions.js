/**
 * เพิ่มคอลัมน์ permissions ในตาราง admins (สำหรับสิทธิ์แอดมิน)
 * รัน: node scripts/add-admins-permissions.js
 */
require('dotenv').config();
const pool = require('../config/database');

async function run() {
  try {
    await pool.query(`
      ALTER TABLE admins ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{}';
    `);
    console.log('✅ เพิ่มคอลัมน์ admins.permissions แล้ว');
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
