-- ตาราง memberships — รันไฟล์นี้อย่างเดียวจะได้รายการสมาชิกภาพทั้งหมด
-- psql -U <user> -d <dbname> -f database/check-table-memberships.sql

SELECT m.id, m.user_id, u.username, m.membership_type, m.start_date, m.end_date, m.status, m.package_id, m.created_at
FROM memberships m
LEFT JOIN users u ON u.id = m.user_id
ORDER BY m.id ASC;
