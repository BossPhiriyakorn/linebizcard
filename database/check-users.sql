-- =============================================================================
-- เช็คข้อมูลยูสเซอร์ — ตาราง users และข้อมูลทั้งหมดที่เกี่ยวกับ user
-- รัน: psql -U <user> -d <dbname> -f database/check-users.sql
-- =============================================================================

-- จำนวนยูสเซอร์ทั้งหมด
SELECT COUNT(*) AS total_users FROM users;


-- รายการยูสเซอร์ทั้งหมด (ตาราง users — ข้อมูลหลัก)
SELECT
    id,
    username,
    email,
    first_name,
    last_name,
    phone,
    nickname,
    login_type,
    COALESCE(is_active, true) AS is_active,
    COALESCE(email_verified, false) AS email_verified,
    created_at,
    updated_at,
    profile_image_url,
    line_user_id
FROM users
ORDER BY id ASC;


-- สรุปยูสเซอร์แต่ละคน + จำนวนสมาชิกภาพ / การ์ด / ชำระเงิน / คูปอง (ใช้เช็คว่ามีข้อมูลครบไหม)
SELECT
    u.id AS user_id,
    u.username,
    u.email,
    COALESCE(u.is_active, true) AS is_active,
    u.created_at,
    (SELECT COUNT(*) FROM memberships m WHERE m.user_id = u.id) AS จำนวน_memberships,
    (SELECT COUNT(*) FROM user_cards c WHERE c.user_id = u.id) AS จำนวนการ์ด,
    (SELECT COUNT(*) FROM payment_history ph WHERE ph.user_id = u.id) AS จำนวน_payment_history,
    (SELECT COUNT(*) FROM payment_channels pc WHERE pc.user_id = u.id) AS จำนวน_payment_channels,
    (SELECT COUNT(*) FROM pending_payments pp WHERE pp.user_id = u.id) AS จำนวน_pending_payments,
    (SELECT COUNT(*) FROM coupon_redemptions cr WHERE cr.user_id = u.id) AS จำนวน_coupon_redemptions
FROM users u
ORDER BY u.id ASC;


-- User ที่ระงับแล้ว (is_active = false)
SELECT id, username, email, COALESCE(is_active, true) AS is_active, created_at
FROM users
WHERE is_active = false
ORDER BY id ASC;
