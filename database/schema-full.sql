-- =============================================================================
-- สคริปต์เดียวสร้างทุกตารางและทุกคอลัมน์ (รวม updated_at สำหรับการ์ด)
-- รันผ่าน: node scripts/setup-database.js (จะโหลดไฟล์นี้)
-- หรือรัน SQL เอง: psql -U user -d dbname -f database/schema-full.sql
--
-- การรันบนเซิร์ฟเวอร์: รันได้ตรงๆ (idempotent — ใช้ IF NOT EXISTS / ON CONFLICT)
-- ถ้าต้องการสร้าง DB ใหม่ทั้งก้อน: รัน drop-tables.sql ก่อน แล้วค่อยรันไฟล์นี้
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
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    first_name TEXT,
    last_name TEXT,
    phone TEXT,
    nickname TEXT,
    is_profile_complete BOOLEAN DEFAULT FALSE,
    line_user_id VARCHAR(100) UNIQUE,
    login_type VARCHAR(20) DEFAULT 'email',
    messaging_api_user_id VARCHAR(100),
    profile_image_url VARCHAR(500)
);

CREATE INDEX IF NOT EXISTS idx_users_line_user_id ON users(line_user_id);
CREATE INDEX IF NOT EXISTS idx_users_profile_complete ON users(is_profile_complete);
CREATE INDEX IF NOT EXISTS idx_users_messaging_api_user_id ON users(messaging_api_user_id);

-- -----------------------------------------------------------------------------
-- ตาราง memberships (สมาชิกหลายระดับ — อายุการ์ดตามอายุสมาชิก)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS memberships (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    membership_type VARCHAR(50) NOT NULL,
    start_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_date TIMESTAMP NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_memberships_user_id ON memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_memberships_end_date ON memberships(end_date);
CREATE INDEX IF NOT EXISTS idx_memberships_status ON memberships(status);

-- -----------------------------------------------------------------------------
-- ตาราง packages (แพ็กเกจ: ฟรี 3 วัน, โปร 30 วัน ฯลฯ)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS packages (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    duration_days INTEGER NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_packages_is_active ON packages(is_active);
CREATE INDEX IF NOT EXISTS idx_packages_sort_order ON packages(sort_order);

-- -----------------------------------------------------------------------------
-- ตาราง templates
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS templates (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    template_json TEXT NOT NULL,
    preview_image VARCHAR(255),
    sample_image_urls TEXT,
    card_type VARCHAR(20) DEFAULT 'normal',
    default_expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
    user_name TEXT,
    user_phone TEXT,
    user_email TEXT,
    user_image VARCHAR(255),
    flex_message_json TEXT NOT NULL,
    liff_url VARCHAR(500) NOT NULL,
    user_description TEXT,
    expires_at TIMESTAMP,
    card_type VARCHAR(20) DEFAULT 'normal',
    custom_expires_at TIMESTAMP,
    created_by_admin_id INTEGER,
    drive_image_file_id VARCHAR(100),
    drive_json_file_id VARCHAR(100),
    card_name VARCHAR(255),
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
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS nickname TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_profile_complete BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS line_user_id VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS login_type VARCHAR(20) DEFAULT 'email';
ALTER TABLE users ADD COLUMN IF NOT EXISTS messaging_api_user_id VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_image_url VARCHAR(500);
ALTER TABLE users ADD COLUMN IF NOT EXISTS accepted_privacy_policy_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS accepted_terms_at TIMESTAMP;

ALTER TABLE user_cards ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE user_cards ADD COLUMN IF NOT EXISTS user_description TEXT;
ALTER TABLE user_cards ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- CMS: role, is_active (users), is_active (templates)
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user';
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE templates ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE templates ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE templates ADD COLUMN IF NOT EXISTS sample_image_urls TEXT;
ALTER TABLE templates ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE templates ADD COLUMN IF NOT EXISTS card_type VARCHAR(20) DEFAULT 'normal';
ALTER TABLE templates ADD COLUMN IF NOT EXISTS default_expires_at TIMESTAMP;

ALTER TABLE user_cards ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP;
ALTER TABLE user_cards ADD COLUMN IF NOT EXISTS card_type VARCHAR(20) DEFAULT 'normal';
ALTER TABLE user_cards ADD COLUMN IF NOT EXISTS custom_expires_at TIMESTAMP;
ALTER TABLE user_cards ADD COLUMN IF NOT EXISTS created_by_admin_id INTEGER;
ALTER TABLE user_cards ADD COLUMN IF NOT EXISTS drive_image_file_id VARCHAR(100);
ALTER TABLE user_cards ADD COLUMN IF NOT EXISTS drive_json_file_id VARCHAR(100);
COMMENT ON COLUMN user_cards.drive_image_file_id IS 'Google Drive file ID ของรูป (เมื่อ USE_GOOGLE_DRIVE=true) ใช้สำหรับลบเมื่อลบการ์ด';
COMMENT ON COLUMN user_cards.drive_json_file_id IS 'Google Drive file ID ของไฟล์ JSON การ์ด ใช้สำหรับดึงเนื้อหาและลบเมื่อลบการ์ด';
-- การ์ดออกแบบเอง: ชื่อการ์ดและรายละเอียด (ใช้อ้างอิงในรายการ ไม่แสดงบนการ์ด)
ALTER TABLE user_cards ADD COLUMN IF NOT EXISTS card_name VARCHAR(255);
COMMENT ON COLUMN user_cards.card_name IS 'ชื่อการ์ดที่ผู้ใช้ตั้ง (การ์ดออกแบบเอง) ใช้อ้างอิงในรายการ';

ALTER TABLE memberships ADD COLUMN IF NOT EXISTS package_id INTEGER;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'memberships_package_id_fkey' AND table_name = 'memberships') THEN
        ALTER TABLE memberships ADD CONSTRAINT memberships_package_id_fkey FOREIGN KEY (package_id) REFERENCES packages(id) ON DELETE SET NULL;
    END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;
CREATE INDEX IF NOT EXISTS idx_memberships_package_id ON memberships(package_id);

-- สร้าง index ที่อาจยังไม่มี (ถ้ามีอยู่แล้วจะข้าม)
CREATE INDEX IF NOT EXISTS idx_users_line_user_id ON users(line_user_id);
CREATE INDEX IF NOT EXISTS idx_users_profile_complete ON users(is_profile_complete);
CREATE INDEX IF NOT EXISTS idx_users_messaging_api_user_id ON users(messaging_api_user_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_updated_at ON users(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_cards_updated_at ON user_cards(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_cards_expires_at ON user_cards(expires_at);
CREATE INDEX IF NOT EXISTS idx_user_cards_card_type ON user_cards(card_type);
CREATE INDEX IF NOT EXISTS idx_templates_updated_at ON templates(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_templates_is_active ON templates(is_active);
CREATE INDEX IF NOT EXISTS idx_templates_default_expires_at ON templates(default_expires_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_memberships_user_active ON memberships (user_id) WHERE status = 'active';

-- -----------------------------------------------------------------------------
-- ตาราง admins (แอดมิน CMS แยกจาก users ลูกค้า)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admins (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE admins ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{}';
ALTER TABLE admins ADD COLUMN IF NOT EXISTS full_name VARCHAR(255);
ALTER TABLE admins ADD COLUMN IF NOT EXISTS nickname VARCHAR(100);

CREATE INDEX IF NOT EXISTS idx_admins_email ON admins(email);
CREATE INDEX IF NOT EXISTS idx_admins_is_active ON admins(is_active);

-- ลิงก์ user_cards.created_by_admin_id หลังสร้าง admins แล้ว
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'user_cards_created_by_admin_id_fkey'
          AND table_name = 'user_cards'
    ) THEN
        ALTER TABLE user_cards ADD CONSTRAINT user_cards_created_by_admin_id_fkey
        FOREIGN KEY (created_by_admin_id) REFERENCES admins(id) ON DELETE SET NULL;
    END IF;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- -----------------------------------------------------------------------------
-- ตาราง login_logs (ประวัติการเข้าใช้งาน CMS — อ้างอิง admins)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS login_logs (
    id SERIAL PRIMARY KEY,
    admin_id INTEGER REFERENCES admins(id) ON DELETE SET NULL,
    username TEXT NOT NULL,
    email TEXT NOT NULL,
    login_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address TEXT
);

-- กรณีตาราง login_logs มีอยู่แล้ว (จาก schema เก่า) ให้เพิ่ม admin_id
ALTER TABLE login_logs ADD COLUMN IF NOT EXISTS admin_id INTEGER REFERENCES admins(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_login_logs_admin_id ON login_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_login_logs_login_at ON login_logs(login_at DESC);

-- -----------------------------------------------------------------------------
-- ตาราง cms_settings (ตั้งค่าโลโก้และพื้นหลังหน้า Login)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cms_settings (
    id SERIAL PRIMARY KEY,
    login_logo_url TEXT,
    login_bg_image_url TEXT,
    login_bg_color VARCHAR(20) DEFAULT '#5b21b6',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO cms_settings (id, login_logo_url, login_bg_image_url, login_bg_color)
VALUES (1, NULL, NULL, '#5b21b6')
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- ตาราง cms_notifications (แจ้งเตือนแดชบอร์ด CMS)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cms_notifications (
    id SERIAL PRIMARY KEY,
    notification_type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    link_url VARCHAR(500),
    related_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    related_card_id INTEGER REFERENCES user_cards(id) ON DELETE SET NULL,
    related_admin_id INTEGER REFERENCES admins(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_read BOOLEAN DEFAULT FALSE
);
CREATE INDEX IF NOT EXISTS idx_cms_notifications_created_at ON cms_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cms_notifications_type ON cms_notifications(notification_type);
CREATE INDEX IF NOT EXISTS idx_cms_notifications_is_read ON cms_notifications(is_read);

-- -----------------------------------------------------------------------------
-- ตาราง email_verifications (OTP สำหรับยืนยันอีเมล)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS email_verifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    otp_code VARCHAR(64) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    verified_at TIMESTAMP,
    attempts INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_email_verifications_user_id ON email_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_email_verifications_email ON email_verifications(email);
CREATE INDEX IF NOT EXISTS idx_email_verifications_otp_code ON email_verifications(otp_code);
CREATE INDEX IF NOT EXISTS idx_email_verifications_expires_at ON email_verifications(expires_at);

-- เพิ่มคอลัมน์ email verification ใน users
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_otp_sent_at TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_users_email_verified ON users(email_verified);
CREATE INDEX IF NOT EXISTS idx_users_last_otp_sent_at ON users(last_otp_sent_at);

-- -----------------------------------------------------------------------------
-- ตาราง coupons (คูปอง — แอดมินสร้าง ลูกค้าแลกโค้ด เช่น เพิ่มวันใช้งาน)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS coupons (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255),
    description TEXT,
    coupon_type VARCHAR(50) NOT NULL DEFAULT 'extend_days',
    value INTEGER NOT NULL DEFAULT 0,
    valid_from TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    valid_until TIMESTAMP,
    max_uses INTEGER,
    use_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(UPPER(TRIM(code)));
CREATE INDEX IF NOT EXISTS idx_coupons_is_active ON coupons(is_active);
CREATE INDEX IF NOT EXISTS idx_coupons_valid_dates ON coupons(valid_from, valid_until);

CREATE TABLE IF NOT EXISTS coupon_redemptions (
    id SERIAL PRIMARY KEY,
    coupon_id INTEGER NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    redeemed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    package_id INTEGER REFERENCES packages(id) ON DELETE SET NULL,
    UNIQUE(coupon_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_coupon_id ON coupon_redemptions(coupon_id);
CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_user_id ON coupon_redemptions(user_id);
CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_package_id ON coupon_redemptions(package_id);

ALTER TABLE coupons ADD COLUMN IF NOT EXISTS condition_type VARCHAR(50) NULL;
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS discount_percent INTEGER NULL;
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS apply_at_next_payment BOOLEAN DEFAULT false;
ALTER TABLE packages ADD COLUMN IF NOT EXISTS period_type VARCHAR(50) NULL;
ALTER TABLE packages ADD COLUMN IF NOT EXISTS coupon_id INTEGER NULL;
ALTER TABLE packages ADD COLUMN IF NOT EXISTS requires_payment BOOLEAN DEFAULT true;
ALTER TABLE packages ADD COLUMN IF NOT EXISTS max_uses_per_user INTEGER NULL;
ALTER TABLE coupon_redemptions ADD COLUMN IF NOT EXISTS package_id INTEGER NULL;

CREATE TABLE IF NOT EXISTS user_coupon_next_payment (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    coupon_id INTEGER NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);
CREATE INDEX IF NOT EXISTS idx_user_coupon_next_payment_user_id ON user_coupon_next_payment(user_id);

CREATE TABLE IF NOT EXISTS package_coupons (
    package_id INTEGER NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
    coupon_id INTEGER NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (package_id, coupon_id)
);
CREATE INDEX IF NOT EXISTS idx_package_coupons_package_id ON package_coupons(package_id);
CREATE INDEX IF NOT EXISTS idx_package_coupons_coupon_id ON package_coupons(coupon_id);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'packages_coupon_id_fkey' AND table_name = 'packages') THEN
    ALTER TABLE packages ADD CONSTRAINT packages_coupon_id_fkey FOREIGN KEY (coupon_id) REFERENCES coupons(id) ON DELETE SET NULL;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_packages_coupon_id ON packages(coupon_id);
CREATE INDEX IF NOT EXISTS idx_packages_requires_payment ON packages(requires_payment);

-- -----------------------------------------------------------------------------
-- ตาราง payment_history (ประวัติการชำระเงิน — ซื้อแพ็กเกจ/ต่อแพ็กเกจ)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payment_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    package_id INTEGER REFERENCES packages(id) ON DELETE SET NULL,
    amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    original_amount DECIMAL(10,2),
    discount_amount DECIMAL(10,2) DEFAULT 0,
    extra_days INTEGER,
    paid_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    membership_id INTEGER REFERENCES memberships(id) ON DELETE SET NULL,
    payment_type VARCHAR(50) NOT NULL DEFAULT 'purchase',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_payment_history_user_id ON payment_history(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_paid_at ON payment_history(paid_at DESC);

-- -----------------------------------------------------------------------------
-- ตาราง payment_channels (ช่องทางการชำระเงิน — ลูกค้าลงทะเบียน ไม่เก็บเลขบัตรเต็ม)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payment_channels (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    channel_type VARCHAR(50) NOT NULL DEFAULT 'other',
    full_name VARCHAR(255),
    card_last_four VARCHAR(10),
    card_brand VARCHAR(50),
    bank_name VARCHAR(255),
    bank_account_masked VARCHAR(100),
    promptpay_phone VARCHAR(20),
    promptpay_id VARCHAR(20),
    display_label VARCHAR(255),
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_payment_channels_user_id ON payment_channels(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_channels_is_default ON payment_channels(user_id, is_default) WHERE is_default = true;
-- Stripe (สำหรับช่องทางบัตร)
ALTER TABLE payment_channels ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255);
ALTER TABLE payment_channels ADD COLUMN IF NOT EXISTS stripe_payment_method_id VARCHAR(255);

-- -----------------------------------------------------------------------------
-- ตาราง pending_payments (ชำระแบบ QR แนบสลิป รอแอดมินตรวจสอบ)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pending_payments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    package_id INTEGER NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
    payment_channel_id INTEGER REFERENCES payment_channels(id) ON DELETE SET NULL,
    amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    original_amount DECIMAL(10,2),
    discount_amount DECIMAL(10,2) DEFAULT 0,
    coupon_id INTEGER REFERENCES coupons(id) ON DELETE SET NULL,
    extra_days INTEGER,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    slip_image_url VARCHAR(500),
    slip_uploaded_at TIMESTAMP,
    verified_at TIMESTAMP,
    verified_by_admin_id INTEGER REFERENCES admins(id) ON DELETE SET NULL,
    rejection_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_pending_payments_user_id ON pending_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_pending_payments_status ON pending_payments(status);
CREATE INDEX IF NOT EXISTS idx_pending_payments_created_at ON pending_payments(created_at DESC);

ALTER TABLE cms_settings ADD COLUMN IF NOT EXISTS qr_payment_bank_name VARCHAR(255);
ALTER TABLE cms_settings ADD COLUMN IF NOT EXISTS qr_payment_account_no TEXT;
ALTER TABLE cms_settings ADD COLUMN IF NOT EXISTS qr_payment_account_name TEXT;
ALTER TABLE cms_settings ADD COLUMN IF NOT EXISTS qr_payment_qr_image_url TEXT;
ALTER TABLE cms_settings ADD COLUMN IF NOT EXISTS privacy_policy_content TEXT;
ALTER TABLE cms_settings ADD COLUMN IF NOT EXISTS terms_of_service_content TEXT;
ALTER TABLE cms_settings ADD COLUMN IF NOT EXISTS contact_design_url TEXT;
COMMENT ON COLUMN cms_settings.contact_design_url IS 'ลิงค์ช่องทางติดต่อออกแบบ — แสดงเมื่อลูกค้ากดปุ่มติดต่อออกแบบบนหน้าสร้างการ์ด';

ALTER TABLE pending_payments ADD COLUMN IF NOT EXISTS original_amount DECIMAL(10,2);
ALTER TABLE pending_payments ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10,2) DEFAULT 0;
ALTER TABLE pending_payments ADD COLUMN IF NOT EXISTS coupon_id INTEGER REFERENCES coupons(id) ON DELETE SET NULL;
ALTER TABLE pending_payments ADD COLUMN IF NOT EXISTS extra_days INTEGER;
-- LINE Pay (รอเชื่อมต่อ API)
ALTER TABLE pending_payments ADD COLUMN IF NOT EXISTS line_pay_order_id VARCHAR(255);
ALTER TABLE pending_payments ADD COLUMN IF NOT EXISTS line_pay_transaction_id VARCHAR(255);
CREATE INDEX IF NOT EXISTS idx_pending_payments_line_pay_order_id ON pending_payments(line_pay_order_id) WHERE line_pay_order_id IS NOT NULL;
ALTER TABLE payment_history ADD COLUMN IF NOT EXISTS original_amount DECIMAL(10,2);
ALTER TABLE payment_history ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10,2) DEFAULT 0;
ALTER TABLE payment_history ADD COLUMN IF NOT EXISTS extra_days INTEGER;
-- Stripe PaymentIntent id / gateway transaction id (สำหรับตรวจสอบและ refund)
ALTER TABLE payment_history ADD COLUMN IF NOT EXISTS transaction_id VARCHAR(255);

-- cms_notifications: คอลัมน์อ้างอิง pending_payments (ต้องสร้างหลัง pending_payments)
ALTER TABLE cms_notifications ADD COLUMN IF NOT EXISTS related_pending_payment_id INTEGER REFERENCES pending_payments(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_cms_notifications_related_admin_id ON cms_notifications(related_admin_id);
CREATE INDEX IF NOT EXISTS idx_cms_notifications_related_pending_payment_id ON cms_notifications(related_pending_payment_id);

-- -----------------------------------------------------------------------------
-- แพ็กเกจเริ่มต้น (ฟรี 3 วัน, โปร 30 วัน)
-- -----------------------------------------------------------------------------
INSERT INTO packages (id, name, duration_days, description, price, sort_order) VALUES
(1, 'ฟรี', 3, 'สำหรับผู้สมัครเข้าใช้งาน ใช้งานได้ 3 วัน', 0, 1),
(2, 'โปร', 30, 'ใช้งานได้ 30 วัน', 60, 2)
ON CONFLICT (id) DO NOTHING;
SELECT setval(pg_get_serial_sequence('packages', 'id'), (SELECT COALESCE(MAX(id), 1) FROM packages));

-- -----------------------------------------------------------------------------
-- Admin เริ่มต้น (สำหรับเข้า CMS ที่ /cms/login)
-- อีเมล: admin1@magicbiz.com  รหัสผ่าน: admin1234
-- -----------------------------------------------------------------------------
INSERT INTO admins (username, email, password) VALUES
(
    'admin1',
    'admin1@magicbiz.com',
    '$2b$10$K0SGysDWlKaF6oG7kLYfCuVw77t/Ng/nb9i8g.pBHWu6xjmql9v3.'
)
ON CONFLICT (username) DO UPDATE SET email = EXCLUDED.email, password = EXCLUDED.password;

-- -----------------------------------------------------------------------------
-- Template การ์ด "ออกแบบเอง" (สำหรับฟีเจอร์ออกแบบการ์ดจาก Flex Simulator)
-- is_active = false เพื่อไม่ให้โผล่ในรายการเลือกเทมเพลต
-- -----------------------------------------------------------------------------
INSERT INTO templates (name, description, template_json, is_active)
SELECT
  'ออกแบบเอง',
  'การ์ดที่ผู้ใช้ออกแบบเองจาก Flex Simulator',
  '{"tectony1":[{"linemsg":"ออกแบบเอง"},{"type":"bubble","body":{"type":"box","layout":"vertical","contents":[{"type":"text","text":""}]}}]}',
  false
WHERE NOT EXISTS (SELECT 1 FROM templates WHERE name = 'ออกแบบเอง');

-- -----------------------------------------------------------------------------
-- PII / OTP: ประเภทคอลัมน์สำหรับการเข้ารหัส (สร้างครั้งเดียวหรืออัปเกรดจาก schema เก่า)
-- OTP เก็บแฮช SHA-256 (64 ตัวอักษร); PII เก็บ ciphertext AES-256 (ใช้ TEXT)
-- -----------------------------------------------------------------------------
ALTER TABLE email_verifications ALTER COLUMN otp_code TYPE VARCHAR(64);
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
