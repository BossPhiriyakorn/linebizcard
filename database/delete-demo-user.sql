-- =============================================================================
-- ลบเฉพาะยูส demo_user (demo@example.com) — ฝั่งผู้ใช้ ไม่ได้ใช้งานแล้ว
-- รัน: psql -U postgres -d line_flex_db -f database/delete-demo-user.sql
-- หรือใน pgAdmin: Query Tool → เปิดไฟล์นี้ → F5
-- =============================================================================
-- หมายเหตุ: user_cards และ login_logs มี FK ON DELETE CASCADE ไปที่ users
--          จึงถูกลบตามอัตโนมัติเมื่อลบ users
-- =============================================================================

BEGIN;

DELETE FROM users WHERE email = 'demo@example.com';

COMMIT;
