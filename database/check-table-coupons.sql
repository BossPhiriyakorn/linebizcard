-- ตาราง coupons — รันไฟล์นี้อย่างเดียวจะได้รายการคูปองทั้งหมด
-- psql -U <user> -d <dbname> -f database/check-table-coupons.sql

SELECT id, code, name, coupon_type, value, valid_from, valid_until, COALESCE(is_active, true) AS is_active, use_count, created_at
FROM coupons
ORDER BY id ASC;
