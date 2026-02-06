/**
 * รันไฟล์ SQL (สร้าง/อัปเดตตารางหรือคอลัมน์)
 * วิธีใช้: node scripts/run-migration.js database/schema-full.sql
 * หรือ: node scripts/setup-database.js (โหลด schema-full.sql โดยตรง)
 */
require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const migrationFile = process.argv[2] || 'database/schema-full.sql';
const sqlPath = path.isAbsolute(migrationFile)
    ? migrationFile
    : path.join(__dirname, '..', migrationFile);

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

async function run() {
    try {
        if (!fs.existsSync(sqlPath)) {
            console.error('ไม่พบไฟล์:', sqlPath);
            process.exit(1);
        }
        const sql = fs.readFileSync(sqlPath, 'utf8');
        console.log('🔄 กำลังเชื่อมต่อฐานข้อมูล...');
        console.log('📝 กำลังรัน:', path.basename(sqlPath), '\n');
        await pool.query(sql);
        console.log('✅ รัน migration เสร็จสิ้น\n');
    } catch (err) {
        console.error('❌ เกิดข้อผิดพลาด:', err.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

run();
