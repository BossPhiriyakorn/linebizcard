-- =============================================================================
-- ตรวจสอบแต่ละตาราง (users, templates, user_cards)
-- รัน: psql -U user -d dbname -f database/check-tables.sql
-- หรือใน pgAdmin: Query Tool → เปิดไฟล์นี้ → F5
-- =============================================================================

-- -----------------------------------------------------------------------------
-- ตาราง users
-- -----------------------------------------------------------------------------
SELECT COUNT(*) AS total_users FROM users;

SELECT
    id,
    username,
    email,
    line_user_id,
    login_type,
    first_name,
    last_name,
    phone,
    nickname,
    is_profile_complete,
    LENGTH(password) AS password_length,
    created_at
FROM users
ORDER BY id ASC;

-- -----------------------------------------------------------------------------
-- ตาราง templates
-- -----------------------------------------------------------------------------
SELECT COUNT(*) AS total_templates FROM templates;

SELECT
    id,
    name,
    description,
    preview_image,
    LENGTH(template_json) AS template_json_length,
    created_at
FROM templates
ORDER BY id ASC;

-- -----------------------------------------------------------------------------
-- ตาราง user_cards
-- -----------------------------------------------------------------------------
SELECT COUNT(*) AS total_cards FROM user_cards;

SELECT
    uc.id AS card_id,
    uc.unique_id,
    uc.user_id,
    u.username,
    u.email AS user_email,
    uc.template_id,
    t.name AS template_name,
    uc.user_name,
    uc.user_phone,
    uc.json_file_name,
    uc.liff_url,
    uc.created_at
FROM user_cards uc
LEFT JOIN users u ON uc.user_id = u.id
LEFT JOIN templates t ON uc.template_id = t.id
ORDER BY uc.created_at DESC;
