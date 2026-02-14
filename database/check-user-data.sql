-- =============================================================================
-- สคริปต์ตรวจสอบข้อมูลผู้ใช้บนเซิร์ฟเวอร์ (SQL)
-- รัน: psql -U <user> -d <dbname> -f database/check-user-data.sql
-- หรือรันเฉพาะส่วนที่ต้องการใน client (pgAdmin, DBeaver ฯลฯ)
-- ถ้ารันทั้งไฟล์ จะได้ผลหลายชุด: ข้อ 0 = รายการผู้ใช้, ข้อ 1 = สรุปจำนวน, ข้อ 3 = ผู้ใช้ที่ระงับ
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0) รายการผู้ใช้ในระบบ (แสดงทุก user ที่มีในตาราง users)
-- -----------------------------------------------------------------------------
SELECT id, username, email, COALESCE(is_active, true) AS is_active, created_at
FROM users
ORDER BY id ASC;


-- -----------------------------------------------------------------------------
-- 1) สรุปทุก user: id, username, email, is_active + จำนวน memberships, cards, payment_history, channels, pending_payments, coupon_redemptions
-- -----------------------------------------------------------------------------
SELECT
    u.id,
    u.username,
    u.email,
    COALESCE(u.is_active, true) AS is_active,
    u.created_at,
    (SELECT COUNT(*) FROM memberships m WHERE m.user_id = u.id) AS memberships_count,
    (SELECT COUNT(*) FROM user_cards c WHERE c.user_id = u.id) AS cards_count,
    (SELECT COUNT(*) FROM payment_history ph WHERE ph.user_id = u.id) AS payment_history_count,
    (SELECT COUNT(*) FROM payment_channels pc WHERE pc.user_id = u.id) AS payment_channels_count,
    (SELECT COUNT(*) FROM pending_payments pp WHERE pp.user_id = u.id) AS pending_payments_count,
    (SELECT COUNT(*) FROM coupon_redemptions cr WHERE cr.user_id = u.id) AS coupon_redemptions_count,
    (SELECT COUNT(*) FROM email_verifications ev WHERE ev.user_id = u.id) AS email_verifications_count
FROM users u
ORDER BY u.id ASC;


-- -----------------------------------------------------------------------------
-- 2) รายละเอียด user คนเดียว — แก้เลข 1 เป็น user id ที่ต้องการ
-- -----------------------------------------------------------------------------
/*
-- ข้อมูล user
SELECT id, username, email, first_name, last_name, phone, login_type,
       COALESCE(is_active, true) AS is_active, created_at, profile_image_url
FROM users WHERE id = 1;

-- สมาชิกภาพ
SELECT id, membership_type, start_date, end_date, status
FROM memberships WHERE user_id = 1 ORDER BY end_date DESC;

-- การ์ดที่สร้าง
SELECT id, unique_id, json_file_name, user_image, drive_json_file_id, drive_image_file_id, created_at
FROM user_cards WHERE user_id = 1 ORDER BY id ASC;

-- จำนวนสรุป
SELECT
    (SELECT COUNT(*) FROM memberships WHERE user_id = 1) AS memberships,
    (SELECT COUNT(*) FROM user_cards WHERE user_id = 1) AS cards,
    (SELECT COUNT(*) FROM payment_history WHERE user_id = 1) AS payment_history,
    (SELECT COUNT(*) FROM payment_channels WHERE user_id = 1) AS payment_channels,
    (SELECT COUNT(*) FROM pending_payments WHERE user_id = 1) AS pending_payments,
    (SELECT COUNT(*) FROM coupon_redemptions WHERE user_id = 1) AS coupon_redemptions;
*/


-- -----------------------------------------------------------------------------
-- 3) User ที่ระงับแล้ว (is_active = false) — ใช้ตรวจก่อนลบ
-- -----------------------------------------------------------------------------
SELECT id, username, email, COALESCE(is_active, true) AS is_active, created_at
FROM users
WHERE is_active = false
ORDER BY id ASC;
