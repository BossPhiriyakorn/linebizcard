-- ลิงค์ติดต่อออกแบบ: ใช้กับปุ่ม "ติดต่อออกแบบ" บนหน้าสร้างการ์ด (ลูกค้ากดแล้วไปตามลิงค์ที่แอดมินตั้งไว้)
ALTER TABLE cms_settings ADD COLUMN IF NOT EXISTS contact_design_url TEXT;
COMMENT ON COLUMN cms_settings.contact_design_url IS 'ลิงค์ช่องทางติดต่อออกแบบ — แสดงเมื่อลูกค้ากดปุ่มติดต่อออกแบบบนหน้าสร้างการ์ด';
