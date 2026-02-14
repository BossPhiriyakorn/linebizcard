-- ตาราง payment_history — รันไฟล์นี้อย่างเดียวจะได้รายการประวัติการชำระเงินทั้งหมด
-- psql -U <user> -d <dbname> -f database/check-table-payment-history.sql

SELECT ph.id, ph.user_id, u.username, ph.package_id, ph.amount, ph.paid_at, ph.payment_type, ph.created_at
FROM payment_history ph
LEFT JOIN users u ON u.id = ph.user_id
ORDER BY ph.id ASC;
