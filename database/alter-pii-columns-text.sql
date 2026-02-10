-- คอลัมน์ที่เก็บค่าที่เข้ารหัส AES-256 (base64) อาจยาวกว่าค่าเดิม — เปลี่ยนเป็น TEXT เพื่อกัน truncate
-- รันหลังเปิดใช้ ENCRYPTION_KEY และก่อนเขียนข้อมูลเข้ารหัสชุดแรก (หรือรันก่อนเพื่อความปลอดภัย)

ALTER TABLE users ALTER COLUMN first_name TYPE TEXT;
ALTER TABLE users ALTER COLUMN last_name TYPE TEXT;
ALTER TABLE users ALTER COLUMN nickname TYPE TEXT;
ALTER TABLE users ALTER COLUMN phone TYPE TEXT;

ALTER TABLE user_cards ALTER COLUMN user_name TYPE TEXT;
ALTER TABLE user_cards ALTER COLUMN user_phone TYPE TEXT;
ALTER TABLE user_cards ALTER COLUMN user_email TYPE TEXT;
ALTER TABLE user_cards ALTER COLUMN user_description TYPE TEXT;

ALTER TABLE login_logs ALTER COLUMN username TYPE TEXT;
ALTER TABLE login_logs ALTER COLUMN email TYPE TEXT;
ALTER TABLE login_logs ALTER COLUMN ip_address TYPE TEXT;

ALTER TABLE cms_settings ALTER COLUMN qr_payment_account_no TYPE TEXT;
ALTER TABLE cms_settings ALTER COLUMN qr_payment_account_name TYPE TEXT;
