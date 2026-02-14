-- ตาราง user_cards — รันไฟล์นี้อย่างเดียวจะได้รายการการ์ดทั้งหมด
-- psql -U <user> -d <dbname> -f database/check-table-user-cards.sql

SELECT c.id AS card_id, c.unique_id, c.user_id, u.username, u.email,
       (SELECT name FROM templates t WHERE t.id = c.template_id) AS template_name,
       c.json_file_name, c.created_at, c.expires_at
FROM user_cards c
LEFT JOIN users u ON u.id = c.user_id
ORDER BY c.id ASC;
