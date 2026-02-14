-- ตาราง packages — รันไฟล์นี้อย่างเดียวจะได้รายการแพ็กเกจทั้งหมด
-- psql -U <user> -d <dbname> -f database/check-table-packages.sql

SELECT id, name, duration_days, price, COALESCE(is_active, true) AS is_active, sort_order, created_at
FROM packages
ORDER BY id ASC;
