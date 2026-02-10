# การเตรียมการและเชื่อมต่อ Payment Gateway (Stripe)

ระบบใช้ **Stripe** เป็นตัวเดียวสำหรับการชำระด้วยบัตรเครดิต/เดบิต (ตัดเงินอัตโนมัติ)

---

## 1. สิ่งที่เตรียมไว้ในโค้ดแล้ว

### 1.1 Config (`config/paymentGateway.js`)

- อ่านค่าจาก environment variables (Stripe Publishable Key, Secret Key)
- ฟังก์ชัน `isConfigured()` — ตรวจว่าเปิดใช้และมี Secret Key หรือยัง
- ฟังก์ชัน `getPublicKey()` — ส่ง Publishable Key ให้ frontend (สำหรับ Stripe Elements)
- ฟังก์ชัน `getSecretKey()`, `getProvider()` (= `'stripe'`), `getWebhookSecret()` — ใช้ใน backend เท่านั้น

### 1.2 Service (`services/paymentGatewayService.js`)

- **getStatus()** — คืนค่า `{ configured, provider: 'stripe', publicKey }` สำหรับ API
- **registerCard(userId, token, metadata)** — ลงทะเบียนบัตร (รับ token/PaymentMethod จาก frontend) — *stub รอ implement*
- **chargeSavedCard(userId, paymentChannelId, amountSatang, description)** — ตัดเงินด้วยบัตรที่บันทึกไว้ — *stub*
- **chargeWithToken(token, amountSatang, description)** — ตัดเงินด้วย one-time token — *stub*

เมื่อเชื่อมต่อ Stripe จริง ให้แทนที่ logic ภายในฟังก์ชันเหล่านี้ด้วยการเรียก Stripe API

### 1.3 API

- **GET /api/payment-gateway/status** — คืนค่า `{ success: true, data: { configured, provider: 'stripe', publicKey } }`  
  ใช้ตรวจสอบว่าสามารถแสดงฟอร์มบัตร (Stripe Elements) หรือยัง (frontend เรียกได้ไม่ต้อง login)

### 1.4 ฐานข้อมูล

- ตาราง `payment_channels` มีฟิลด์สำหรับช่องทางบัตรอยู่แล้ว (`channel_type`, `card_last_four`, `card_brand`, `full_name`)  
  เมื่อ implement จริงให้เพิ่มคอลัมน์ `stripe_customer_id`, `stripe_payment_method_id` (หรือเทียบเท่า) สำหรับเก็บรหัสจาก Stripe

---

## 2. ตัวแปรใน .env ที่ต้องใช้

| ตัวแปร | บังคับ | คำอธิบาย |
|--------|--------|----------|
| `PAYMENT_GATEWAY_ENABLED` | ใช่ | `true` หรือ `1` เมื่อเปิดใช้ (ต้องมี Secret Key ด้วย) |
| `PAYMENT_GATEWAY_PUBLIC_KEY` | เมื่อเปิดใช้ | Stripe Publishable Key (`pk_test_...` หรือ `pk_live_...`) |
| `PAYMENT_GATEWAY_SECRET_KEY` | เมื่อเปิดใช้ | Stripe Secret Key (`sk_test_...` หรือ `sk_live_...`) — **ห้ามใส่ใน frontend** |
| `PAYMENT_GATEWAY_WEBHOOK_SECRET` | ไม่ | สำหรับ Stripe Webhooks (ถ้าใช้ events แบบ async) |

ตัวอย่างเมื่อพร้อมเชื่อมต่อ Stripe:

```env
PAYMENT_GATEWAY_ENABLED=true
PAYMENT_GATEWAY_PUBLIC_KEY=pk_test_xxxx
PAYMENT_GATEWAY_SECRET_KEY=sk_test_xxxx
# PAYMENT_GATEWAY_WEBHOOK_SECRET=whsec_xxxx
```

---

## 3. Flow การชำระด้วยบัตร (เมื่อเชื่อมต่อ Stripe แล้ว)

1. **ลงทะเบียนบัตร (เพิ่มช่องทางชำระเงิน)**  
   - Frontend โหลด Stripe.js / @stripe/react-stripe-js โดยใช้ **Publishable Key**  
   - ผู้ใช้กรอกบัตรบน Stripe Elements (เลขบัตรไม่ผ่าน server ของเรา)  
   - สร้าง **PaymentMethod** ส่ง `payment_method_id` มา backend  
   - Backend เรียก `paymentGatewayService.registerCard(userId, payment_method_id, metadata)`  
   - สร้าง Stripe Customer (ถ้ายังไม่มี), attach PaymentMethod แล้วบันทึก identifier ลง `payment_channels`

2. **ตัดเงินเมื่อเลือกแพ็กเกจ**  
   - ลูกค้าเลือกแพ็กเกจและเลือกช่องทางบัตร  
   - Backend เรียก `paymentGatewayService.chargeSavedCard(userId, paymentChannelId, amountSatang, description)`  
   - Service ดึง stripe_payment_method_id จาก DB แล้วสร้าง PaymentIntent / Charge ไปที่ Stripe  
   - ถ้าสำเร็จ → สร้าง/ต่อสมาชิก + บันทึก `payment_history`

---

## 4. สิ่งที่ต้องทำเมื่อจะเชื่อมต่อ Stripe จริง

1. **สมัครและตั้งค่าที่ Stripe** แล้วนำ Publishable Key / Secret Key ใส่ใน `.env`
2. **เพิ่มคอลัมน์ใน DB (ถ้าต้องการ)**  
   - เช่น `payment_channels.stripe_customer_id`, `payment_channels.stripe_payment_method_id`  
   - สร้าง migration แล้วอัปเดต schema-full.sql
3. **แก้ `services/paymentGatewayService.js`**  
   - ใน `registerCard` เรียก Stripe API (Customers.create, PaymentMethods.attach) แล้วบันทึก identifier ลง DB  
   - ใน `chargeSavedCard` ดึง payment_method id จาก DB แล้วสร้าง PaymentIntent  
   - จัดการ error และคืนค่าให้ controller ใช้ตอบ frontend
4. **ฝั่ง Frontend**  
   - เมื่อ `GET /api/payment-gateway/status` คืน `configured: true` และมี `publicKey` ให้แสดงฟอร์มบัตรด้วย Stripe Elements  
   - โหลด @stripe/react-stripe-js โดยใช้ `publicKey`  
   - หลังผู้ใช้กรอกบัตรและสร้าง PaymentMethod แล้ว ส่ง `payment_method_id` มาที่ backend (เช่น POST /api/payment-channels พร้อม body ที่มี payment_method_id)

---

## 5. ความปลอดภัย (PCI)

- **อย่าให้เลขบัตรผ่าน server ของเรา** — ใช้ Stripe Elements บน frontend สร้าง PaymentMethod แล้วส่งเฉพาะ payment_method_id
- **เก็บเฉพาะข้อมูลที่ Stripe คืนมา** — เช่น last4, brand (สำหรับแสดงใน UI)
- **Secret Key ใช้เฉพาะบน backend** — ไม่ส่งไป frontend และไม่ commit ลง git (.env อยู่ใน .gitignore)

---

เมื่อตั้งค่า `.env` และ implement logic ใน `paymentGatewayService.js` ตาม Stripe API ระบบจะพร้อมตัดยอดอัตโนมัติผ่าน Stripe ได้ตาม flow ด้านบน
