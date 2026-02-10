-- เพิ่มคอลัมน์ Stripe ใน payment_channels
ALTER TABLE payment_channels ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255);
ALTER TABLE payment_channels ADD COLUMN IF NOT EXISTS stripe_payment_method_id VARCHAR(255);
