-- =============================================================================
-- ตรวจสอบตาราง admins และข้อมูลแอดมิน (แยกจาก users ลูกค้า)
-- รันใน pgAdmin: Query Tool → เปิดไฟล์นี้ → F5
-- =============================================================================

-- 1. ตรวจสอบว่ามีตาราง admins และคอลัมน์หลัก
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'admins'
ORDER BY ordinal_position;

-- 2. จำนวนแอดมิน
SELECT COUNT(*) AS admin_count FROM admins;

-- 3. รายการแอดมิน
SELECT id, username, email, COALESCE(is_active, true) AS is_active, created_at
FROM admins
ORDER BY id;
