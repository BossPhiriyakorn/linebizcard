-- =============================================================================
-- ตรวจสอบตาราง templates เท่านั้น
-- รัน: psql -U user -d dbname -f database/check-templates.sql
-- =============================================================================

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
