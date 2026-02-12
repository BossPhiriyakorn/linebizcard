-- เพิ่มคอลัมน์สำหรับเก็บ Google Drive file ID (เมื่อใช้ Drive เก็บรูป + JSON)
-- รัน: psql -U postgres -d line_flex_db -f database/add-drive-columns.sql

ALTER TABLE user_cards ADD COLUMN IF NOT EXISTS drive_image_file_id VARCHAR(100);
ALTER TABLE user_cards ADD COLUMN IF NOT EXISTS drive_json_file_id VARCHAR(100);

COMMENT ON COLUMN user_cards.drive_image_file_id IS 'Google Drive file ID ของรูป (เมื่อ USE_GOOGLE_DRIVE=true) ใช้สำหรับลบเมื่อลบการ์ด';
COMMENT ON COLUMN user_cards.drive_json_file_id IS 'Google Drive file ID ของไฟล์ JSON การ์ด ใช้สำหรับดึงเนื้อหาและลบเมื่อลบการ์ด';
