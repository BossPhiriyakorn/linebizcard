# การเตรียมการและเชื่อมต่อ LINE Pay

ระบบมีโครงสำหรับ **LINE Pay** (ชำระเงินผ่าน LINE Pay) — รอเชื่อมต่อ API จริง

---

## 1. สิ่งที่เตรียมไว้ในโค้ดแล้ว

### 1.1 Config (`config/linePay.js`)

- อ่านค่าจาก environment: `LINE_PAY_CHANNEL_ID`, `LINE_PAY_CHANNEL_SECRET`, `LINE_PAY_CONFIRM_URL`, `LINE_PAY_CANCEL_URL`
- ฟังก์ชัน `isConfigured()` — ตรวจว่าเปิดใช้และมี Channel ID + Secret หรือยัง
- `getConfirmUrl()`, `getCancelUrl()` — URL ที่ LINE Pay redirect กลับมา

### 1.2 Service (`services/linePayService.js`)

- **getStatus()** — คืนค่า `{ configured, provider: 'line_pay' }` สำหรับ API
- **reserve(options)** — สร้างคำสั่งชำระ (เรียก LINE Pay Request API) — *stub รอ implement*
- **confirm(transactionId, amount, orderId)** — ยืนยันการชำระ (เรียก LINE Pay Confirm API) — *stub*

เมื่อเชื่อมต่อ LINE Pay จริง ให้แทนที่ logic ภายในฟังก์ชันเหล่านี้ด้วยการเรียก LINE Pay API ตามเอกสาร [LINE Pay Developers](https://developers-pay.line.me/)

### 1.3 API

- **GET /api/line-pay/status** — คืนค่า `{ success: true, data: { configured, provider: 'line_pay' } }`  
  ใช้ตรวจสอบว่าแสดงปุ่ม "ชำระด้วย LINE Pay" หรือยัง
- **POST /api/line-pay/reserve** — สร้างคำสั่งชำระ (ต้อง login)  
  Body: `{ package_id, coupon_code? }` → คืน `{ success, data: { redirectUrl } }` เมื่อเชื่อมต่อแล้ว
- **GET /api/line-pay/confirm** — Callback หลังผู้ใช้ชำระที่ LINE Pay  
  Query: `transactionId`, `orderId` (ชื่อ parameter ตามที่ LINE Pay redirect ส่งมา) → ยืนยันแล้ว redirect ไป `/package?line_pay=success`

### 1.4 ฐานข้อมูล

- ตาราง `pending_payments` มีคอลัมน์ `line_pay_order_id`, `line_pay_transaction_id` สำหรับจับคู่คำสั่งกับ LINE Pay  
  รัน migration: `psql -U user -d dbname -f database/add-line-pay-columns.sql`

### 1.5 Frontend

- หน้าสรุปการชำระ (`/payment-summary`) โหลด `GET /api/line-pay/status`  
  ถ้า `configured: true` และแพ็กเกจมีราคา > 0 จะแสดงปุ่ม **ชำระด้วย LINE Pay**  
  กดแล้วเรียก `POST /api/line-pay/reserve` แล้ว redirect ไป `redirectUrl`

---

## 2. ตัวแปรใน .env ที่ต้องใช้

| ตัวแปร | บังคับ | คำอธิบาย |
|--------|--------|----------|
| `LINE_PAY_CHANNEL_ID` | เมื่อเปิดใช้ | Channel ID จาก LINE Pay Merchant |
| `LINE_PAY_CHANNEL_SECRET` | เมื่อเปิดใช้ | Channel Secret จาก LINE Pay |
| `LINE_PAY_CONFIRM_URL` | ไม่ | URL ที่ LINE Pay redirect กลับหลังชำระ (ไม่ใส่จะใช้ `BASE_URL/api/line-pay/confirm`) |
| `LINE_PAY_CANCEL_URL` | ไม่ | URL เมื่อผู้ใช้ยกเลิก (ไม่ใส่จะใช้ `BASE_URL/payment-summary`) |

---

## 3. Flow เมื่อเชื่อมต่อ LINE Pay แล้ว

1. ผู้ใช้เลือกแพ็กเกจที่มีราคา → ไปหน้าสรุปการชำระ
2. กด **ชำระด้วย LINE Pay** → Frontend เรียก `POST /api/line-pay/reserve`
3. Backend สร้างคำสั่ง (orderId), เรียก LINE Pay Request API (Reserve) → ได้ `redirectUrl`, บันทึก `pending_payments` (line_pay_order_id, line_pay_transaction_id)
4. Frontend redirect ไป `redirectUrl` → ผู้ใช้ชำระใน LINE Pay
5. LINE Pay redirect กลับมาที่ Confirm URL (พร้อม transactionId, orderId ฯลฯ)
6. Backend เรียก `GET /api/line-pay/confirm` → เรียก LINE Pay Confirm API → อัปเดตสมาชิก + payment_history → redirect ไป `/package?line_pay=success`

---

## 4. สิ่งที่ต้องทำเมื่อจะเชื่อมต่อ LINE Pay จริง

1. สมัคร LINE Pay Merchant ได้ Channel ID + Channel Secret แล้วใส่ใน `.env`
2. ใน `services/linePayService.js`:  
   - **reserve:** เรียก LINE Pay Request API (POST) ตามเอกสาร สร้าง HMAC signature จาก Channel Secret ส่งใน header  
   - **confirm:** เรียก LINE Pay Confirm API (POST /v3/payments/{transactionId}/confirm) ด้วย amount, currency
3. ตรวจสอบชื่อ query parameter ที่ LINE Pay redirect กลับมา (transactionId, orderId หรืออื่น) แล้วแมปใน `controllers/linePayController.js` ใน `confirm`

---

เมื่อตั้งค่า `.env` และ implement logic ใน `linePayService.js` ตาม LINE Pay API ระบบจะพร้อมตัดจ่ายผ่าน LINE Pay ได้
