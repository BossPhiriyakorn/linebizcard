-- เนื้อหาสำหรับลูกค้าอ่านและยินยอม (แอดมินตั้งค่าใน CMS)
ALTER TABLE cms_settings ADD COLUMN IF NOT EXISTS privacy_policy_content TEXT;
ALTER TABLE cms_settings ADD COLUMN IF NOT EXISTS terms_of_service_content TEXT;

-- บันทึกเวลาที่ลูกค้ายอมรับ (ตอนลงทะเบียน)
ALTER TABLE users ADD COLUMN IF NOT EXISTS accepted_privacy_policy_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS accepted_terms_at TIMESTAMP;
