-- =============================================================================
-- สร้างบัญชีแอดมินในตาราง admins — ไม่กระทบตาราง users (ลูกค้า)
-- =============================================================================
-- รันใน pgAdmin: Query Tool → เปิดไฟล์นี้ → F5
-- หรือ: psql -U postgres -d line_flex_db -f database/create-admin.sql
--
-- แอดมินเริ่มต้น:
--   อีเมล:    admin1@magicbiz.com
--   รหัสผ่าน: admin1234
--   ชื่อผู้ใช้: admin1
--
-- สร้างแอดมินด้วยอีเมล/รหัสอื่น: node scripts/create-admin.js
-- =============================================================================

BEGIN;

INSERT INTO admins (username, email, password) VALUES
(
    'admin1',
    'admin1@magicbiz.com',
    '$2b$10$K0SGysDWlKaF6oG7kLYfCuVw77t/Ng/nb9i8g.pBHWu6xjmql9v3.'
)
ON CONFLICT (username) DO UPDATE SET email = EXCLUDED.email, password = EXCLUDED.password;

COMMIT;
