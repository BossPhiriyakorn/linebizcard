-- =============================================================================
-- ตรวจสอบตาราง user_cards เท่านั้น
-- รัน: psql -U user -d dbname -f database/check-user-cards.sql
-- =============================================================================

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
