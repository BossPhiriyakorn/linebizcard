# ฐานข้อมูลและ Migration

## การติดตั้งครั้งแรก

1. สร้าง database ใน PostgreSQL:
   ```sql
   CREATE DATABASE line_flex_db;
   ```

2. (ถ้าต้องการเริ่มต้นใหม่) ลบตารางเดิมทั้งหมด แล้วค่อยสร้างใหม่:
   ```bash
   psql -U postgres -d line_flex_db -f database/drop-tables.sql
   ```
   ไฟล์ **drop-tables.sql** ลบทุกตารางตามลำดับ FK ใช้เมื่อต้องการรัน schema-full.sql ใหม่แบบ clean

3. รัน schema หลัก (สร้างตารางและคอลัมน์ทั้งหมด):
   ```bash
   psql -U postgres -d line_flex_db -f database/schema-full.sql
   ```
   ไฟล์ `schema-full.sql` มีทั้ง `CREATE TABLE` และ `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` สำหรับคอลัมน์ที่เพิ่มในภายหลัง (Stripe, LINE Pay, transaction_id ฯลฯ) ดังนั้นการรันครั้งเดียวเพียงพอสำหรับโปรเจกต์นี้

## การรัน Migration แยก (เมื่อมี DB อยู่แล้ว)

ถ้าคุณมีฐานข้อมูลเก่าที่ยังไม่มีคอลัมน์บางตัว สามารถรันไฟล์เหล่านี้แยกได้ (รันได้ซ้ำได้ เพราะใช้ `IF NOT EXISTS`):

| ไฟล์ | คำอธิบาย |
|------|----------|
| `add-stripe-payment-channels.sql` | เพิ่มคอลัมน์ Stripe ใน `payment_channels` |
| `add-line-pay-columns.sql` | เพิ่มคอลัมน์ LINE Pay ใน `pending_payments` |
| `add-payment-history-transaction-id.sql` | เพิ่ม `transaction_id` ใน `payment_history` (สำหรับ Stripe PaymentIntent id) |
| `add-admins-permissions.sql` | เพิ่มสิทธิ์แอดมิน (ถ้ามีใช้ใน CMS) |
| `alter-otp-code-varchar64.sql` | เปลี่ยน `email_verifications.otp_code` เป็น VARCHAR(64) สำหรับเก็บแฮช SHA-256 |
| `alter-pii-columns-text.sql` | เปลี่ยนคอลัมน์ PII ที่เข้ารหัสเป็น TEXT (รองรับค่าที่เข้ารหัสแล้วยาวขึ้น) |
| `add-consent-columns.sql` | เนื้อหายินยอมใน cms_settings + เวลายอมรับใน users (PDPA) |

ตัวอย่าง:
```bash
psql -U postgres -d line_flex_db -f database/add-stripe-payment-channels.sql
psql -U postgres -d line_flex_db -f database/add-payment-history-transaction-id.sql
```

## ข้อมูลเริ่มต้นและสคริปต์ช่วย

- **seed-templates.sql** — ใส่ template เริ่มต้น (ถ้า schema มีตาราง templates และต้องการ seed)
- **seed-consent-content.sql** — ใส่เนื้อหาเริ่มต้นของนโยบายความเป็นส่วนตัวและข้อกำหนดการใช้บริการ (แสดงบนหน้าลงทะเบียนลูกค้า) แก้ไขได้จาก CMS → ตั้งค่า
- **create-admin.sql** / **scripts/create-admin.js** — สร้างแอดมิน
- **check-*.sql** — ใช้ตรวจสอบโครงสร้างหรือข้อมูล (ไม่เปลี่ยนข้อมูล)
- **delete-*.sql** — ลบข้อมูลทดสอบ (ใช้ด้วยความระมัดระวัง)

## การเข้ารหัส PII และ OTP

- **OTP**: ระบบเก็บรหัส OTP เป็นแฮช SHA-256 ใน `email_verifications.otp_code` (ต้องรัน `alter-otp-code-varchar64.sql`)
- **PII**: ข้อมูลเช่น เบอร์โทร ชื่อ บัญชีธนาคาร ถูกเข้ารหัส AES-256-GCM ก่อนบันทึก (ต้องตั้ง `ENCRYPTION_KEY` ใน .env และแนะนำรัน `alter-pii-columns-text.sql`)
- ดูรายละเอียดใน `.env.example` (ENCRYPTION_KEY, OTP_PEPPER)

## หมายเหตุ

- **drop-tables.sql** — แยกไว้สำหรับลบตารางทั้งหมด (ใช้ก่อนรัน schema-full.sql เมื่อต้องการสร้าง DB ใหม่บนเซิร์ฟเวอร์)
- การรัน `schema-full.sql` ซ้ำจะไม่ลบข้อมูลที่มีอยู่ (ใช้ `CREATE TABLE IF NOT EXISTS` และ `ADD COLUMN IF NOT EXISTS`)
- สำหรับ production ควร backup ก่อนรัน migration
