/**
 * สร้างฐานข้อมูล (ถ้ายังไม่มี) แล้วรัน schema-full.sql เพื่อสร้างตารางทั้งหมด
 * วิธีใช้: node scripts/create-database.js
 *
 * ใช้ค่าจาก .env: DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME
 * ไม่สร้างซ้ำ: schema ใช้ CREATE TABLE IF NOT EXISTS / ADD COLUMN IF NOT EXISTS
 * หลังรันจะแจ้ง: ตารางไหนมีแล้ว / ตารางใหม่ / คอลัมน์ไหนมีแล้ว / คอลัมน์ใหม่
 */
require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const dbName = process.env.DB_NAME || 'line_flex_db';
const poolConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || ''
};

// ทุกตารางใน schema-full.sql (ใช้สำหรับสรุปก่อน/หลังรัน)
const TABLES = [
    'users', 'memberships', 'packages', 'templates', 'user_cards',
    'admins', 'login_logs', 'cms_settings', 'cms_notifications',
    'email_verifications', 'coupons', 'coupon_redemptions', 'user_coupon_next_payment', 'package_coupons',
    'payment_history', 'payment_channels', 'pending_payments'
];

async function createDatabaseIfNotExists() {
    const poolPostgres = new Pool({
        ...poolConfig,
        database: 'postgres'
    });
    try {
        const res = await poolPostgres.query(
            'SELECT 1 FROM pg_database WHERE datname = $1',
            [dbName]
        );
        if (res.rows.length === 0) {
            await poolPostgres.query(`CREATE DATABASE "${dbName}"`);
            console.log('✅ สร้างฐานข้อมูล:', dbName);
        } else {
            console.log('ℹ️  ฐานข้อมูลมีอยู่แล้ว:', dbName);
        }
    } finally {
        await poolPostgres.end();
    }
}

async function getExistingTables(pool) {
    const res = await pool.query(
        "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = ANY($1)",
        [TABLES]
    );
    return new Set(res.rows.map(r => r.tablename));
}

async function getExistingColumns(pool) {
    const res = await pool.query(
        `SELECT table_name, column_name FROM information_schema.columns 
         WHERE table_schema = 'public' AND table_name = ANY($1)`,
        [TABLES]
    );
    return new Set(res.rows.map(r => `${r.table_name}.${r.column_name}`));
}

async function runSchemaAndReport() {
    const pool = new Pool({
        ...poolConfig,
        database: dbName
    });
    try {
        const tablesBefore = await getExistingTables(pool);
        const columnsBefore = await getExistingColumns(pool);

        const sqlPath = path.join(__dirname, '../database/schema-full.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');
        console.log('📝 กำลังรัน schema-full.sql (ทุกตาราง + คอลัมน์ IF NOT EXISTS)...\n');
        try {
            await pool.query(sql);
        } catch (schemaErr) {
            if (schemaErr.code === '42P07' || (schemaErr.message && schemaErr.message.includes('already exists'))) {
                console.log('⚠️  บางคำสั่งมีอยู่แล้ว (ตาราง/index) — ดำเนินการต่อ\n');
            } else if (schemaErr.code === '23505') {
                console.log('⚠️  Admin user มีอยู่แล้ว — ไม่เป็นไร\n');
            } else {
                throw schemaErr;
            }
        }

        const tablesAfter = await getExistingTables(pool);
        const columnsAfter = await getExistingColumns(pool);

        const newTables = [...tablesAfter].filter(t => !tablesBefore.has(t));
        const existingTables = [...tablesAfter].filter(t => tablesBefore.has(t));
        const newColumns = [...columnsAfter].filter(c => !columnsBefore.has(c));
        const existingColumns = [...columnsAfter].filter(c => columnsBefore.has(c));

        console.log('--- ผลการสร้างตาราง ---');
        existingTables.sort();
        existingTables.forEach(t => {
            console.log('   ℹ️  ตาราง', t, 'มีแล้ว (ไม่สร้างซ้ำ)');
        });
        newTables.sort();
        newTables.forEach(t => {
            console.log('   ✅ ตาราง', t, 'สร้างใหม่');
        });

        if (newColumns.length > 0) {
            console.log('\n--- คอลัมน์ที่เพิ่มใหม่ ---');
            const byTable = {};
            newColumns.forEach(pair => {
                const [table, col] = pair.split('.');
                if (!byTable[table]) byTable[table] = [];
                byTable[table].push(col);
            });
            Object.keys(byTable).sort().forEach(table => {
                byTable[table].sort().forEach(col => {
                    console.log('   ✅ คอลัมน์', col, 'ในตาราง', table, 'สร้างใหม่');
                });
            });
        }

        if (existingColumns.length > 0) {
            console.log('\n--- คอลัมน์ที่มีอยู่แล้ว (ไม่เพิ่มซ้ำ) ---');
            const byTable = {};
            existingColumns.forEach(pair => {
                const [table, col] = pair.split('.');
                if (!byTable[table]) byTable[table] = [];
                byTable[table].push(col);
            });
            Object.keys(byTable).sort().forEach(table => {
                const cols = byTable[table].sort();
                console.log('   ℹ️  ตาราง', table + ':', cols.length, 'คอลัมน์มีแล้ว');
            });
        }

        if (newTables.length === 0 && existingTables.length > 0 && newColumns.length === 0) {
            console.log('\n   (ทุกตารางและคอลัมน์มีอยู่แล้ว ไม่มีการสร้างเพิ่ม)');
        }
        console.log('');
    } finally {
        await pool.end();
    }
}

async function main() {
    try {
        console.log('🔄 กำลังเชื่อมต่อและสร้างฐานข้อมูล...\n');
        await createDatabaseIfNotExists();
        console.log('');
        await runSchemaAndReport();
        console.log('📋 ตารางใน schema: ครบทุกตารางตาม schema-full.sql');
        console.log('📊 Admin คนแรก (เข้า CMS /cms/login): อีเมล admin1@magicbiz.com รหัสผ่าน admin1234');
        console.log('\n✅ เสร็จสิ้น\n');
    } catch (error) {
        console.error('❌ เกิดข้อผิดพลาด:', error.message);
        process.exit(1);
    }
}

main();
