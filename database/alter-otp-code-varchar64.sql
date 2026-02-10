-- เก็บ OTP เป็นแฮช SHA-256 (ความยาว 64 ตัวอักษร hex)
ALTER TABLE email_verifications ALTER COLUMN otp_code TYPE VARCHAR(64);
