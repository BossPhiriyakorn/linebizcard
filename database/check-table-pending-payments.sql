-- ตาราง pending_payments — รันไฟล์นี้อย่างเดียวจะได้รายการรอตรวจสลิปทั้งหมด
-- psql -U <user> -d <dbname> -f database/check-table-pending-payments.sql

SELECT pp.id, pp.user_id, u.username, pp.package_id, pp.amount, pp.status, pp.created_at
FROM pending_payments pp
LEFT JOIN users u ON u.id = pp.user_id
ORDER BY pp.id ASC;
