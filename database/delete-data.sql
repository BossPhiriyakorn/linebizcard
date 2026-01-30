-- =============================================================================
-- ลบข้อมูลแต่ละตาราง (เรียงตาม FK: user_cards → templates → users)
-- รัน: psql -U user -d dbname -f database/delete-data.sql
-- หรือใน pgAdmin: Query Tool → เปิดไฟล์นี้ → F5
-- =============================================================================
-- หมายเหตุ: ลบข้อมูลเท่านั้น ไม่ลบโครงสร้างตาราง
-- ถ้าต้องการสร้างตารางใหม่ ให้รัน schema-full.sql ก่อน
-- =============================================================================

BEGIN;

-- 1. ลบการ์ดของผู้ใช้ (มี FK ไปที่ users และ templates)
DELETE FROM user_cards;

-- 2. ลบ template ทั้งหมด
DELETE FROM templates;

-- 3. ลบผู้ใช้ทั้งหมด
DELETE FROM users;

-- รีเซ็ต sequence ให้ id เริ่มจาก 1 (ถ้าต้องการ)
ALTER SEQUENCE IF EXISTS user_cards_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS templates_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS users_id_seq RESTART WITH 1;

COMMIT;
