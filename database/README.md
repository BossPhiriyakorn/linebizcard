# โฟลเดอร์ Database

## สร้าง/อัปเดต Schema (ตารางและคอลัมน์)

- **ไฟล์หลัก:** `schema-full.sql` — สร้างทุกตารางและคอลัมน์ (ใช้ `CREATE TABLE IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS`)
- **วิธีรัน:** จากโฟลเดอร์โปรเจกต์ราก
  - สร้าง DB ครั้งแรก: `node scripts/create-database.js` แล้วตามด้วย `node scripts/setup-database.js`
  - อัปเดต schema (มี DB แล้ว): `node scripts/setup-database.js` เท่านั้น

ไม่ต้องรันไฟล์ SQL แยกสำหรับเพิ่มตารางหรือคอลัมน์ — ทุกอย่างรวมใน `schema-full.sql` แล้ว

## ไฟล์อื่นในโฟลเดอร์นี้

| ไฟล์ | คำอธิบาย |
|------|----------|
| `schema-full.sql` | Schema เต็ม (ตาราง + คอลัมน์ + index + ข้อมูลเริ่มต้น) |
| `fix-free-package-requires-payment.sql` | แก้ข้อมูล: ตั้ง `requires_payment = false` สำหรับแพ็กเกจฟรี (รันครั้งเดียวถ้าต้องการ) |
| `add-custom-card-template.sql` | เพิ่มแถว Template "ออกแบบเอง" (มีใน schema-full แล้ว ไม่ต้องรันซ้ำ) |
| `delete-users-and-cards.sql` | Utility ลบ users และ user_cards (สำหรับล้างข้อมูลทดสอบ) |
| `check-table-*.sql` | สคริปต์เช็คข้อมูลตาราง (ดู `CHECK-TABLES-README.md`) |
