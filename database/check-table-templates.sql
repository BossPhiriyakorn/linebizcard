-- ตาราง templates — รันไฟล์นี้อย่างเดียวจะได้รายการเทมเพลตทั้งหมด
-- psql -U <user> -d <dbname> -f database/check-table-templates.sql

SELECT id, name, COALESCE(is_active, true) AS is_active, card_type, created_at
FROM templates
ORDER BY id ASC;
