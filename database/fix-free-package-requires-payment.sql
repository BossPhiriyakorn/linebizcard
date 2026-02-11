-- แก้แพ็กเกจฟรีให้แสดงปุ่ม "ใช้เลย" แทน "เลือก" (ไม่บังคับช่องทางชำระเงิน)
-- ใช้เมื่อ Production แสดง "กรุณาลงทะเบียนช่องทางชำระเงินก่อน" ตอนกดแพ็กเกจฟรี
-- รันครั้งเดียว: psql -U <user> -d <dbname> -f database/fix-free-package-requires-payment.sql

UPDATE packages
SET requires_payment = false
WHERE (price IS NULL OR price = 0) AND (COALESCE(requires_payment, true) = true);
