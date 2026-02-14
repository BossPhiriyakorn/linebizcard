-- =============================================================================
-- สคริปต์ตรวจสอบยูสเซอร์ทั้งหมดในระบบ (+ ไอดีการ์ด และข้อมูลอื่นๆ)
-- รัน: psql -U <user> -d <dbname> -f database/check-all-users.sql
--
-- สำคัญ: ไฟล์นี้มีหลายคำสั่ง SELECT — รันทั้งไฟล์ (Execute Script / Run All) จะได้หลายชุดผล
-- ถ้าเห็นแค่ชุดเดียว (เช่น แค่ total_cards) ให้กดรันทั้งไฟล์แล้วดูผลชุดอื่นในแท็บหรือปุ่ม "ผลลัพธ์ถัดไป"
-- หรือเลือกรันทีละบล็อก (เลือกเฉพาะข้อ 1 แล้ว Execute) เพื่อดูรายการยูสเซอร์
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) รายการยูสเซอร์ + จำนวนการ์ด/สมาชิกภาพ + ไอดีการ์ด (ผลชุดแรก = ตารางรายการยูสเซอร์)
-- -----------------------------------------------------------------------------
SELECT
    u.id AS user_id,
    u.username,
    u.email,
    COALESCE(u.is_active, true) AS is_active,
    u.created_at AS user_created_at,
    (SELECT COUNT(*) FROM memberships m WHERE m.user_id = u.id) AS จำนวน_memberships,
    (SELECT COUNT(*) FROM user_cards c WHERE c.user_id = u.id) AS จำนวนการ์ด,
    (SELECT STRING_AGG(c.id::text, ', ' ORDER BY c.id) FROM user_cards c WHERE c.user_id = u.id) AS card_ids,
    (SELECT STRING_AGG(c.unique_id, ', ' ORDER BY c.id) FROM user_cards c WHERE c.user_id = u.id) AS card_unique_ids
FROM users u
ORDER BY u.id ASC;


-- -----------------------------------------------------------------------------
-- 2) จำนวนยูสเซอร์ทั้งหมด
-- -----------------------------------------------------------------------------
SELECT COUNT(*) AS total_users FROM users;


-- -----------------------------------------------------------------------------
-- 3) รายการยูสเซอร์แบบย่อ (id, ชื่อผู้ใช้, อีเมล, สถานะ, วันที่สมัคร)
-- -----------------------------------------------------------------------------
SELECT
    id,
    username AS ชื่อผู้ใช้,
    email AS อีเมล,
    COALESCE(is_active, true) AS สถานะ_ใช้งาน,
    created_at AS วันที่สมัคร
FROM users
ORDER BY id ASC;


-- -----------------------------------------------------------------------------
-- 4) รายการการ์ดทั้งหมด (ไอดีการ์ด, unique_id, user, เทมเพลต, สร้างเมื่อ, หมดอายุ)
-- -----------------------------------------------------------------------------
SELECT
    c.id AS card_id,
    c.unique_id,
    c.user_id,
    u.username,
    u.email,
    (SELECT name FROM templates t WHERE t.id = c.template_id) AS template_name,
    c.json_file_name,
    c.created_at AS card_created_at,
    c.expires_at
FROM user_cards c
JOIN users u ON u.id = c.user_id
ORDER BY c.user_id, c.id ASC;


-- -----------------------------------------------------------------------------
-- 5) จำนวนการ์ดทั้งหมดในระบบ
-- -----------------------------------------------------------------------------
SELECT COUNT(*) AS total_cards FROM user_cards;
