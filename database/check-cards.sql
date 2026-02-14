-- =============================================================================
-- เช็คตารางการ์ด — user_cards และข้อมูลที่เกี่ยวข้อง (เทมเพลต ฯลฯ)
-- รัน: psql -U <user> -d <dbname> -f database/check-cards.sql
-- =============================================================================

-- จำนวนการ์ดทั้งหมดในระบบ
SELECT COUNT(*) AS total_cards FROM user_cards;


-- รายการการ์ดทั้งหมด (ตาราง user_cards — ข้อมูลหลัก + ชื่อเทมเพลต + user)
SELECT
    c.id AS card_id,
    c.unique_id,
    c.user_id,
    u.username,
    u.email,
    (SELECT name FROM templates t WHERE t.id = c.template_id) AS template_name,
    c.json_file_name,
    c.liff_url,
    c.created_at AS card_created_at,
    c.expires_at,
    c.drive_json_file_id,
    c.drive_image_file_id
FROM user_cards c
JOIN users u ON u.id = c.user_id
ORDER BY c.user_id, c.id ASC;


-- สรุปการ์ดแยกตามเทมเพลต (เช็คว่ามีการ์ดใช้เทมเพลตไหนบ้าง)
SELECT
    t.id AS template_id,
    t.name AS template_name,
    COUNT(c.id) AS จำนวนการ์ด
FROM templates t
LEFT JOIN user_cards c ON c.template_id = t.id
GROUP BY t.id, t.name
ORDER BY t.id ASC;


-- รายการเทมเพลต (templates)
SELECT id, name, COALESCE(is_active, true) AS is_active, card_type, created_at
FROM templates
ORDER BY id ASC;
