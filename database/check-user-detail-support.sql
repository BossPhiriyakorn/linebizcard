-- =============================================================================
-- ตรวจสอบว่าฐานข้อมูลรองรับหน้ารายละเอียดลูกค้า CMS หรือไม่
-- ใช้: เปิดใน psql หรือรันผ่าน node (อ่านแล้ว query) — ถ้าไม่ error แปลว่าพร้อม
-- =============================================================================

-- 1) users ต้องมีคอลัมน์เหล่านี้ (ถ้าไม่มีจะ error)
SELECT id, username, email, first_name, last_name, phone, nickname, profile_image_url, created_at
FROM users LIMIT 1;

-- 2) ตาราง memberships (ถ้าไม่มีจะ error — รัน schema-full.sql หรือ node scripts/setup-database.js)
SELECT id, user_id, membership_type, start_date, end_date, status FROM memberships LIMIT 1;

-- 3) user_cards ต้องมี expires_at, card_type (ถ้าไม่มีจะ error)
SELECT id, user_id, user_name, liff_url, created_at, expires_at, card_type FROM user_cards LIMIT 1;

-- ถ้ารันครบ 3 ข้อด้านบนไม่ error แปลว่ารองรับหน้ารายละเอียดลูกค้าแล้ว
