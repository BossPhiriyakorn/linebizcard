-- =============================================================================
-- ลบข้อมูลลงทะเบียนผู้ใช้ สถานะยืนยันตัวตน บัตรเครดิต/ช่องทางชำระที่ผูก และการ์ด — ไม่ลบ templates
-- รัน: psql -U user -d dbname -f database/delete-users-and-cards.sql
-- หรือใน pgAdmin: Query Tool → เปิดไฟล์นี้ → F5
-- =============================================================================
-- หมายเหตุ:
--   - ลบตามลำดับ FK: ประวัติแจ้งเตือน → การ์ดผู้ใช้ → ข้อมูลยืนยันอีเมล (OTP) → ช่องทางชำระ/บัตรเครดิตที่ผูก → users
--   - ลบ users = ลบข้อมูลลงทะเบียน + สถานะยืนยันตัวตน (email_verified, email_verified_at) + เมลที่เก็บ (email)
--   - ลบ payment_channels = ลบบัตรเครดิต/เดบิต/พร้อมเพย์ที่ลูกค้าผูกไว้ (รวม Stripe payment method)
--   - ลบ profile_image_url ด้วย (เก็บแค่ URL จาก LINE ไม่มีไฟล์ในเซิร์ฟเวอร์)
--   - ไม่ลบ templates (คง template ไว้)
--   - รีเซ็ต sequence เฉพาะตารางที่ลบ
-- =============================================================================

BEGIN;

-- 1. ลบประวัติแจ้งเตือนของลูกค้า (cms_notifications)
DELETE FROM cms_notifications;

-- 2. ลบการ์ดของผู้ใช้ทั้งหมด (user_cards มี FK ไปที่ users และ templates)
DELETE FROM user_cards;

-- 3. ลบข้อมูลการยืนยันอีเมล/OTP — สถานะยืนยันตัวตน (email_verifications มี FK ไปที่ users)
DELETE FROM email_verifications;

-- 4. ลบช่องทางชำระเงินที่ผูกกับผู้ใช้ (บัตรเครดิต/เดบิต/พร้อมเพย์ รวม Stripe — payment_channels มี FK ไปที่ users)
DELETE FROM payment_channels;

-- 5. ลบผู้ใช้ทั้งหมด — ข้อมูลลงทะเบียน + สถานะยืนยันตัวตน + เมลที่เก็บในตาราง users
DELETE FROM users;

-- รีเซ็ต sequence ให้ id เริ่มจาก 1
ALTER SEQUENCE IF EXISTS cms_notifications_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS user_cards_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS email_verifications_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS payment_channels_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS users_id_seq RESTART WITH 1;

-- ไม่แตะ templates_id_seq (ไม่ลบ template)

COMMIT;
