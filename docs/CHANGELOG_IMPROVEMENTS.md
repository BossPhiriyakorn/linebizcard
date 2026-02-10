# สรุปการปรับปรุง (ข้อ 6.1–6.5) — ไม่รวม JWT

## 6.1 ความปลอดภัยและความทนทาน

### Rate limit
- **ไฟล์:** `middleware/rateLimit.js`, `routes/api.js`
- **เพิ่ม:** `rateLimitPayment` (30 ครั้ง/นาที ต่อ IP) ใช้กับ `POST /choose-package`, `POST /validate-coupon`, `POST /create-pending-payment`, `POST /confirm-payment-after-3ds`
- **เพิ่ม:** `rateLimitPaymentChannels` (20 ครั้ง/นาที ต่อ IP) ใช้กับ `GET/POST/PUT/DELETE /payment-channels`
- **ผล:** ลดการเรียก API ชำระเงินและช่องทางบัตรบ่อยเกินไป

### DB ไม่ exit เมื่อ idle client error
- **ไฟล์:** `config/database.js`
- **เปลี่ยน:** `pool.on('error')` จาก `process.exit(-1)` เป็นแค่ `console.error` — ไม่ปิด process ทั้งตัวเมื่อ connection idle หลุด (เช่น DB restart)
- **ผล:** Service คงรันอยู่; query ถัดไปจะได้ connection ใหม่จาก pool

---

## 6.2 ชำระเงินและบัตร

### บันทึก Stripe transaction_id ลง payment_history
- **ไฟล์:** `database/schema-full.sql`, `database/add-payment-history-transaction-id.sql`, `controllers/packageController.js`
- **เพิ่ม:** คอลัมน์ `payment_history.transaction_id` (VARCHAR 255)
- **การทำงาน:** เมื่อชำระด้วยบัตรสำเร็จ (choose-package) จะบันทึก `transaction_id` จาก Stripe (PaymentIntent id) ลง `payment_history`
- **ผล:** ใช้ตรวจสอบ/คืนเงินหรือติดตามกับ Stripe ได้

### รองรับ 3D Secure (3DS)
- **ไฟล์:** `services/paymentGatewayService.js`, `controllers/packageController.js`, `routes/api.js`
- **การทำงาน:**
  - เมื่อ Stripe คืน `requires_action` (บัตรต้อง 3DS) จะไม่ตัดเงินทันที แต่คืน `client_secret`, `payment_intent_id` และ `code: 'REQUIRES_ACTION'` ให้ frontend
  - Frontend ใช้ Stripe.js (เช่น `stripe.confirmCardPayment(client_secret)`) ให้ผู้ใช้ทำ 3DS ครบ
  - หลัง 3DS สำเร็จ frontend เรียก **`POST /api/confirm-payment-after-3ds`** ส่ง `{ payment_intent_id }` → backend ตรวจสอบ PaymentIntent ว่า `succeeded` แล้วจึงสร้างสมาชิก + บันทึก `payment_history` (และคูปองถ้ามี)
- **metadata ใน PaymentIntent:** เก็บ `user_id`, `package_id`, `duration_days`, `coupon_id`, `extra_days` สำหรับใช้ใน confirm
- **ผล:** ลูกค้าบัตรที่ต้อง 3DS สามารถยืนยันตัวตนได้ครบ flow

### Idempotency ที่ choose-package
- **ไฟล์:** `controllers/packageController.js`
- **การทำงาน:** รองรับ **`X-Idempotency-Key`** (header) หรือ **`idempotency_key`** (body) — ถ้าส่ง key เดิมซ้ำและเคยสำเร็จแล้ว (ภายใน 24 ชม.) จะคืนผลลัพธ์เดิมโดยไม่ตัดเงิน/สร้างสมาชิกซ้ำ
- **ผล:** ป้องกัน double submit (กดชำระสองครั้ง) ไม่ให้ตัดเงินหรือต่อสมาชิกซ้ำ

---

## 6.4 README และเอกสาร

### README หลัก
- **ไฟล์:** `README.md`
- **แก้:** เทคโนโลยีที่ใช้ → Frontend เป็น Next.js (React), เพิ่ม Stripe / QR / LINE Pay
- **แก้:** การติดตั้ง DB → ใช้ `database/schema-full.sql` และอ้างอิง `database/README.md`
- **แก้:** ตั้งค่า env → อ้างอิง `.env.example` และ `docs/PAYMENT_GATEWAY_SETUP.md`, `docs/LINE_PAY_SETUP.md`
- **แก้:** โครงสร้างโปรเจกต์และขั้นตอนรัน → แยก backend กับ frontend (Next.js)
- **ผล:** README สอดคล้องกับ stack จริงและชี้ไป docs ที่เกี่ยวข้อง

---

## 6.5 การดำเนินการและตรวจสอบ

### ลำดับ Migration / ฐานข้อมูล
- **ไฟล์:** `database/README.md` (ใหม่)
- **เนื้อหา:** ลำดับการรันครั้งแรก (schema-full.sql), รายการ migration แยก (add-stripe-payment-channels, add-line-pay-columns, add-payment-history-transaction-id, add-admins-permissions), หมายเหตุการรันซ้ำและ backup
- **ผล:** มีคำอธิบายชัดสำหรับการรันครั้งแรกและรันซ้ำ

---

## สรุปผลลัพธ์

| หัวข้อ | สถานะ | ผลลัพธ์หลัก |
|--------|--------|--------------|
| 6.1 Rate limit | เสร็จ | จำกัดการเรียก choose-package, payment-channels, create-pending-payment, confirm-payment-after-3ds |
| 6.1 DB pool error | เสร็จ | ไม่ exit process เมื่อ idle client error |
| 6.2 transaction_id | เสร็จ | บันทึก Stripe PaymentIntent id ลง payment_history |
| 6.2 3DS | เสร็จ | คืน client_secret / payment_intent_id + endpoint confirm-payment-after-3ds |
| 6.2 Idempotency | เสร็จ | รองรับ X-Idempotency-Key / idempotency_key ที่ choose-package |
| 6.4 README | เสร็จ | อัปเดต stack, schema, .env, โครงสร้างและ docs |
| 6.5 database/ | เสร็จ | มี README บอกลำดับและรายการ migration |

**หมายเหตุสำหรับ Frontend (3DS):**  
เมื่อได้ response จาก `POST /api/choose-package` เป็น `code: 'REQUIRES_ACTION'` และมี `client_secret` ให้ใช้ Stripe.js เปิด flow 3DS (เช่น `stripe.confirmCardPayment(client_secret)`); หลังสำเร็จเรียก `POST /api/confirm-payment-after-3ds` ด้วย `{ payment_intent_id }` จาก response เดิม

**หมายเหตุ Idempotency:**  
ฝั่ง frontend สามารถส่ง header `X-Idempotency-Key: <uuid หรือ unique string ต่อครั้งกดชำระ>` ตอนเรียก `POST /api/choose-package` เพื่อป้องกันการตัดเงินซ้ำเมื่อผู้ใช้กดซ้ำหรือ retry
