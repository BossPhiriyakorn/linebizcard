-- บันทึก Stripe PaymentIntent id (หรือ gateway transaction id) ลง payment_history
-- รันเมื่อมีตาราง payment_history แล้ว: psql -U user -d dbname -f database/add-payment-history-transaction-id.sql
ALTER TABLE payment_history ADD COLUMN IF NOT EXISTS transaction_id VARCHAR(255);
