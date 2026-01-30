-- =============================================================================
-- สคริปต์เดียวสร้างทุกตารางและทุกคอลัมน์ (รวม updated_at สำหรับการ์ด)
-- รันผ่าน: node scripts/setup-database.js (จะโหลดไฟล์นี้)
-- หรือรัน SQL เอง: psql -U user -d dbname -f database/schema-full.sql
-- =============================================================================

-- -----------------------------------------------------------------------------
-- ตาราง users (ลงทะเบียน + โปรไฟล์ + LINE)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(50),
    nickname VARCHAR(100),
    is_profile_complete BOOLEAN DEFAULT FALSE,
    line_user_id VARCHAR(100) UNIQUE,
    login_type VARCHAR(20) DEFAULT 'email',
    messaging_api_user_id VARCHAR(100)
);

CREATE INDEX IF NOT EXISTS idx_users_line_user_id ON users(line_user_id);
CREATE INDEX IF NOT EXISTS idx_users_profile_complete ON users(is_profile_complete);
CREATE INDEX IF NOT EXISTS idx_users_messaging_api_user_id ON users(messaging_api_user_id);

-- -----------------------------------------------------------------------------
-- ตาราง templates
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    template_json TEXT NOT NULL,
    preview_image VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- ตาราง user_cards (รวม updated_at สำหรับแสดงเวลาแก้ไขล่าสุด)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_cards (
    id SERIAL PRIMARY KEY,
    unique_id VARCHAR(50) UNIQUE NOT NULL,
    user_id INTEGER NOT NULL,
    template_id INTEGER NOT NULL,
    json_file_name VARCHAR(255) NOT NULL,
    user_name VARCHAR(255),
    user_phone VARCHAR(50),
    user_email VARCHAR(255),
    user_image VARCHAR(255),
    flex_message_json TEXT NOT NULL,
    liff_url VARCHAR(500) NOT NULL,
    user_description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (template_id) REFERENCES templates(id),
    CONSTRAINT unique_user_card UNIQUE (unique_id)
);

CREATE INDEX IF NOT EXISTS idx_user_cards_user_id ON user_cards(user_id);
CREATE INDEX IF NOT EXISTS idx_user_cards_unique_id ON user_cards(unique_id);

-- -----------------------------------------------------------------------------
-- เพิ่มคอลัมน์ที่อาจขาดในตารางเดิม (รันแล้วไม่ error ถ้ามีอยู่แล้ว)
-- -----------------------------------------------------------------------------
ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS nickname VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_profile_complete BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS line_user_id VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS login_type VARCHAR(20) DEFAULT 'email';
ALTER TABLE users ADD COLUMN IF NOT EXISTS messaging_api_user_id VARCHAR(100);

ALTER TABLE user_cards ADD COLUMN IF NOT EXISTS user_description TEXT;
ALTER TABLE user_cards ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- สร้าง index ที่อาจยังไม่มี (ถ้ามีอยู่แล้วจะข้าม)
CREATE INDEX IF NOT EXISTS idx_users_line_user_id ON users(line_user_id);
CREATE INDEX IF NOT EXISTS idx_users_profile_complete ON users(is_profile_complete);
CREATE INDEX IF NOT EXISTS idx_users_messaging_api_user_id ON users(messaging_api_user_id);

-- -----------------------------------------------------------------------------
-- Mock user (สำหรับทดสอบ)
-- -----------------------------------------------------------------------------
INSERT INTO users (username, email, password) VALUES
(
    'demo_user',
    'demo@example.com',
    '$2b$10$v/J/1ItSh25XWrA8UGt6PeQLM0y2ye38M7EGmAJez13SDtlMygfV2'
)
ON CONFLICT (username) DO NOTHING;
