-- เพิ่มคอลัมน์ permissions ในตาราง admins สำหรับสิทธิ์: ดูได้อย่างเดียว, ลบแอดมินคนอื่นได้, จัดการผู้ใช้งานได้
-- รัน: psql -U postgres -d your_db -f database/add-admins-permissions.sql

ALTER TABLE admins ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{}';

COMMENT ON COLUMN admins.permissions IS 'view_only, can_delete_admins, can_manage_users (boolean). ว่างหรือ null = สิทธิ์เต็มเหมือนเดิม';
