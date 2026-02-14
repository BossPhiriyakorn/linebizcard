-- ตาราง users — รันไฟล์นี้อย่างเดียวจะได้รายการยูสเซอร์ทั้งหมด
-- psql -U <user> -d <dbname> -f database/check-table-users.sql

SELECT id, username, email, first_name, last_name, phone, login_type,
       COALESCE(is_active, true) AS is_active, created_at
FROM users
ORDER BY id ASC;
