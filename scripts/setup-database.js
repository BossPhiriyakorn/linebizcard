/**
 * สคริปต์เดียวสร้างทุกตารางและทุกคอลัมน์
 * โหลด database/schema-full.sql แล้วรัน — สร้าง users, templates, user_cards (รวม updated_at)
 * วิธีใช้: node scripts/setup-database.js
 */
require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

async function setupDatabase() {
    try {
        console.log('🔄 กำลังเชื่อมต่อฐานข้อมูล...\n');

        const sqlPath = path.join(__dirname, '../database/schema-full.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('📝 กำลังรัน schema-full.sql (สร้างทุกตารางและทุกคอลัมน์)...\n');

        await pool.query(sql);

        console.log('✅ รัน schema-full.sql สำเร็จ');
        console.log('\n📋 ตารางที่สร้าง/อัปเดต:');
        console.log('   - users (รวม first_name, last_name, phone, nickname, line_user_id, login_type, messaging_api_user_id)');
        console.log('   - templates');
        console.log('   - user_cards (รวม updated_at สำหรับแสดงเวลาแก้ไขล่าสุด)');
        console.log('\n📊 Mock User (ถ้ามี):');
        console.log('   Username: demo_user');
        console.log('   Email: demo@example.com');
        console.log('   Password: demo123456');
        console.log('\n✅ เสร็จสิ้น\n');
    } catch (error) {
        if (error.code === '42P07' || error.message.includes('already exists')) {
            console.log('⚠️  บางส่วนมีอยู่แล้ว (ตารางหรือ index) — ไม่เป็นไร');
            console.log('✅ สคริปต์รันครบ\n');
        } else if (error.code === '23505') {
            console.log('⚠️  Mock user มีอยู่แล้ว — ไม่เป็นไร');
            console.log('✅ สคริปต์รันครบ\n');
        } else {
            console.error('❌ เกิดข้อผิดพลาด:', error.message);
            process.exit(1);
        }
    } finally {
        await pool.end();
    }
}

setupDatabase();
