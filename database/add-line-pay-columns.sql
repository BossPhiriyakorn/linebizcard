-- เพิ่มคอลัมน์ LINE Pay ใน pending_payments (รอเชื่อมต่อ API)
-- รัน: psql -U user -d dbname -f database/add-line-pay-columns.sql

ALTER TABLE pending_payments ADD COLUMN IF NOT EXISTS line_pay_order_id VARCHAR(255);
ALTER TABLE pending_payments ADD COLUMN IF NOT EXISTS line_pay_transaction_id VARCHAR(255);
CREATE INDEX IF NOT EXISTS idx_pending_payments_line_pay_order_id ON pending_payments(line_pay_order_id) WHERE line_pay_order_id IS NOT NULL;
