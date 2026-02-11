-- =============================================================================
-- ลบข้อมูลลงทะเบียนผู้ใช้ สถานะยืนยันตัวตน บัตรเครดิต/ช่องทางชำระที่ผูก การ์ด และประวัติการเลือกใช้แพ็กเกจ — ไม่ลบ templates
-- รัน: psql -U user -d dbname -f database/delete-users-and-cards.sql
-- หรือใน pgAdmin: Query Tool → เปิดไฟล์นี้ → F5
-- =============================================================================
-- หมายเหตุ:
--   - "ใช้ครบแล้ว" มาจากการนับในตาราง payment_history (ครั้งที่ user ใช้ package นั้น)
--     ถ้าลบ payment_history + users แล้ว สมัครใหม่จะนับเป็น 0 ครั้ง (ใช้แพ็กเกจได้อีก)
--   - ลบตามลำดับ FK: แจ้งเตือน → รอตรวจสลิป → ประวัติชำระ/สมาชิก → การ์ด → OTP → คูปองที่เก็บ → ช่องทางชำระ → users
--   - ลบ users = ลบข้อมูลลงทะเบียน + สถานะยืนยันตัวตน (email_verified, email_verified_at) + เมลที่เก็บ (email)
--   - ลบ payment_history = ลบประวัติการเลือกใช้แพ็กเกจ (แก้ปัญหา "แพ็กเกจนี้จำกัดการใช้ 1 ครั้งต่อบัญชี คุณใช้ครบแล้ว")
--   - ลบ payment_channels = ลบบัตรเครดิต/เดบิต/พร้อมเพย์ที่ลูกค้าผูกไว้ (รวม Stripe)
--   - ไม่ลบ templates (คง template ไว้)
--   - ข้อมูลรูปที่เก็บในฐานข้อมูลถูกลบไปด้วย (ไม่มีตารางแยกเก็บรูป):
--     • users.profile_image_url (รูปโปรไฟล์ผู้ใช้)
--     • user_cards.user_image (รูปบนการ์ด)
--     • pending_payments.slip_image_url (รูปสลิปชำระเงิน)
--   - รีเซ็ต sequence เฉพาะตารางที่ลบ
-- =============================================================================

BEGIN;

-- 1. ลบประวัติแจ้งเตือนของลูกค้า (cms_notifications — อ้างอิง pending_payments)
DELETE FROM cms_notifications;

-- 2. ลบรายการชำระรอตรวจ (QR/สลิป)
DELETE FROM pending_payments;

-- 3. ลบประวัติการชำระ/เลือกใช้แพ็กเกจ — ตัวนับ "ใช้ครบแล้ว" อยู่ที่ตารางนี้
DELETE FROM payment_history;

-- 4. ลบสถานะสมาชิก (memberships)
DELETE FROM memberships;

-- 5. ลบการ์ดของผู้ใช้ทั้งหมด (user_cards มี FK ไปที่ users และ templates)
DELETE FROM user_cards;

-- 6. ลบข้อมูลการยืนยันอีเมล/OTP — สถานะยืนยันตัวตน (email_verifications มี FK ไปที่ users)
DELETE FROM email_verifications;

-- 7. ลบคูปองที่ผู้ใช้เก็บไว้ใช้รอบถัดไป + ประวัติแลกคูปอง
DELETE FROM user_coupon_next_payment;
DELETE FROM coupon_redemptions;

-- 8. ลบช่องทางชำระเงินที่ผูกกับผู้ใช้ (บัตรเครดิต/เดบิต/พร้อมเพย์ รวม Stripe — payment_channels มี FK ไปที่ users)
DELETE FROM payment_channels;

-- 9. ลบผู้ใช้ทั้งหมด — ข้อมูลลงทะเบียน + สถานะยืนยันตัวตน + เมลที่เก็บในตาราง users
DELETE FROM users;

-- รีเซ็ต sequence ให้ id เริ่มจาก 1
ALTER SEQUENCE IF EXISTS cms_notifications_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS pending_payments_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS payment_history_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS memberships_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS user_cards_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS email_verifications_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS user_coupon_next_payment_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS coupon_redemptions_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS payment_channels_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS users_id_seq RESTART WITH 1;

-- ไม่แตะ templates_id_seq (ไม่ลบ template)

COMMIT;
