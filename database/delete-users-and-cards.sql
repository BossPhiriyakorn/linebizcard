-- =============================================================================
-- ลบเฉพาะข้อมูลผู้ใช้ (users) และการ์ดของผู้ใช้ (user_cards) ไม่ลบ templates
-- รัน: psql -U user -d dbname -f database/delete-users-and-cards.sql
-- หรือใน pgAdmin: Query Tool → เปิดไฟล์นี้ → F5
-- =============================================================================
-- หมายเหตุ:
--   - ลบตามลำดับ FK: ประวัติแจ้งเตือน → การ์ดผู้ใช้ → ข้อมูลยืนยันอีเมล (OTP) → users
--   - ลบ users = ลบสถานะการยืนยันตัวตน (email_verified, email_verified_at) และเมลที่เก็บ (email) ด้วย
--   - ลบ profile_image_url ด้วย (เก็บแค่ URL จาก LINE ไม่มีไฟล์ในเซิร์ฟเวอร์)
--   - ไม่ลบ templates (คง template ไว้)
--   - รีเซ็ต sequence เฉพาะตารางที่ลบ
-- =============================================================================

BEGIN;

-- 1. ลบประวัติแจ้งเตือนของลูกค้า (cms_notifications)
DELETE FROM cms_notifications;

-- 2. ลบการ์ดของผู้ใช้ทั้งหมด (มี FK ไปที่ users และ templates)
DELETE FROM user_cards;

-- 3. ลบข้อมูลการยืนยันอีเมล/OTP (email_verifications มี FK ไปที่ users)
DELETE FROM email_verifications;

-- 4. ลบผู้ใช้ทั้งหมด (รวมสถานะยืนยันตัวตน + เมลที่เก็บในตาราง users)
DELETE FROM users;

-- รีเซ็ต sequence ให้ id เริ่มจาก 1
ALTER SEQUENCE IF EXISTS cms_notifications_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS user_cards_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS email_verifications_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS users_id_seq RESTART WITH 1;

-- ไม่แตะ templates_id_seq (ไม่ลบ template)

COMMIT;
