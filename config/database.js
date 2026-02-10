require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

// Log connection ครั้งเดียวเพื่อลด log ซ้ำ
let hasLoggedConnect = false;
pool.on('connect', () => {
    if (!hasLoggedConnect) {
        hasLoggedConnect = true;
        console.log('✅ Connected to PostgreSQL database');
    }
});

// เมื่อ idle client เกิด error (เช่น DB restart) — log เท่านั้น ไม่ exit process
// Pool จะสร้าง connection ใหม่เมื่อมี query ถัดไป; exit ทั้ง process ทำให้ service ล่มไม่จำเป็น
pool.on('error', (err) => {
    console.error('❌ Unexpected error on idle client', err.message || err);
});

module.exports = pool;
