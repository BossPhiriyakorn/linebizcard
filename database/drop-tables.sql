-- =============================================================================
-- ลบตารางทั้งหมด (เรียงลำดับตามการอ้างอิง FK — ลบตารางที่ถูกอ้างอิงทีหลัง)
-- ใช้เมื่อต้องการสร้างฐานข้อมูลใหม่จาก schema-full.sql
-- รัน: psql -U user -d dbname -f database/drop-tables.sql
-- หรือ: node scripts/run-migration.js database/drop-tables.sql
-- =============================================================================

-- ลบตารางที่อ้างอิงตารางอื่นก่อน (child ก่อน parent)
DROP TABLE IF EXISTS cms_notifications CASCADE;
DROP TABLE IF EXISTS login_logs CASCADE;
DROP TABLE IF EXISTS pending_payments CASCADE;
DROP TABLE IF EXISTS payment_history CASCADE;
DROP TABLE IF EXISTS payment_channels CASCADE;
DROP TABLE IF EXISTS coupon_redemptions CASCADE;
DROP TABLE IF EXISTS user_coupon_next_payment CASCADE;
DROP TABLE IF EXISTS package_coupons CASCADE;
DROP TABLE IF EXISTS user_cards CASCADE;
DROP TABLE IF EXISTS memberships CASCADE;
DROP TABLE IF EXISTS email_verifications CASCADE;
DROP TABLE IF EXISTS coupons CASCADE;
DROP TABLE IF EXISTS packages CASCADE;
DROP TABLE IF EXISTS templates CASCADE;
DROP TABLE IF EXISTS admins CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS cms_settings CASCADE;
