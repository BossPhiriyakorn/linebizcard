/**
 * ลบยูส demo_user (demo@example.com) จากฐานข้อมูล
 * ใช้: node scripts/delete-demo-user.js
 */
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'line_flex_db'
});

async function run() {
    try {
        const res = await pool.query(
            "DELETE FROM users WHERE email = $1",
            ['demo@example.com']
        );
        console.log('ลบ demo_user (demo@example.com) แล้ว จำนวนแถวที่ลบ:', res.rowCount);
        if (res.rowCount === 0) {
            console.log('(ไม่พบแถวที่มีอีเมลนี้ในตาราง users)');
        }
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

run();
