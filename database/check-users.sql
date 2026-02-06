-- =============================================================================
-- ตรวจสอบตาราง users เท่านั้น
-- รัน: psql -U user -d dbname -f database/check-users.sql
-- =============================================================================

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
