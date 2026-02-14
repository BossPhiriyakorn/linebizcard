-- Template สำหรับการ์ด "ออกแบบเอง" — ใช้เป็น template_id ใน user_cards เมื่อลูกค้าสร้างการ์ดจาก Flex Simulator
-- is_active = false เพื่อไม่ให้โผล่ในรายการเลือกเทมเพลต (หน้าสร้างการ์ด)
INSERT INTO templates (name, description, template_json, is_active)
SELECT
  'ออกแบบเอง',
  'การ์ดที่ผู้ใช้ออกแบบเองจาก Flex Simulator',
  '{"tectony1":[{"linemsg":"ออกแบบเอง"},{"type":"bubble","body":{"type":"box","layout":"vertical","contents":[{"type":"text","text":""}]}}]}',
  false
WHERE NOT EXISTS (SELECT 1 FROM templates WHERE name = 'ออกแบบเอง');
