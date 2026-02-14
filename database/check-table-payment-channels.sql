-- ตาราง payment_channels — รันไฟล์นี้อย่างเดียวจะได้รายการช่องทางการชำระเงินทั้งหมด
-- psql -U <user> -d <dbname> -f database/check-table-payment-channels.sql

SELECT pc.id, pc.user_id, u.username, pc.channel_type, pc.display_label, pc.is_default, pc.created_at
FROM payment_channels pc
LEFT JOIN users u ON u.id = pc.user_id
ORDER BY pc.id ASC;
