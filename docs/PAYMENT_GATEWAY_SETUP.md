# การเตรียมการและเชื่อมต่อ Payment Gateway

เอกสารนี้อธิบายสิ่งที่ฝั่งโค้ดเตรียมไว้สำหรับการเชื่อมต่อ Payment Gateway (บัตรเครดิต/เดบิต ตัดเงินอัตโนมัติ) และสิ่งที่ต้องทำเมื่อจะเชื่อมต่อจริง

---

## 1. สิ่งที่เตรียมไว้ในโค้ดแล้ว

### 1.1 Config (`config/paymentGateway.js`)

- อ่านค่าจาก environment variables
- ฟังก์ชัน `isConfigured()` — ตรวจว่าเปิดใช้และมี Secret Key หรือยัง
- ฟังก์ชัน `getPublicKey()` — ส่งคีย์สาธารณะให้ frontend (สำหรับสร้าง token บัตร)
- ฟังก์ชัน `getSecretKey()`, `getProvider()`, `getMerchantId()`, `getApiUrl()` — ใช้ใน backend เท่านั้น

### 1.2 Service (`services/paymentGatewayService.js`)

- **getStatus()** — คืนค่า `{ configured, provider, publicKey }` สำหรับ API
- **registerCard(userId, token, metadata)** — ลงทะเบียนบัตร (รับ token จาก frontend) — *ตอนนี้เป็น stub รอ implement*
- **chargeSavedCard(userId, paymentChannelId, amountSatang, description)** — ตัดเงินด้วยบัตรที่บันทึกไว้ — *stub*
- **chargeWithToken(token, amountSatang, description)** — ตัดเงินด้วย one-time token — *stub*

เมื่อเชื่อมต่อ Gateway จริง ให้แทนที่ logic ภายในฟังก์ชันเหล่านี้ด้วยการเรียก API ของ provider ที่เลือก

### 1.3 API

- **GET /api/payment-gateway/status** — คืนค่า `{ success: true, data: { configured, provider, publicKey } }`  
  ใช้ตรวจสอบว่าสามารถแสดงฟอร์มบัตรหรือยัง (frontend เรียกได้ไม่ต้อง login)

### 1.4 ฐานข้อมูล

- ตาราง `payment_channels` มีฟิลด์สำหรับช่องทางบัตรอยู่แล้ว (`channel_type`, `card_last_four`, `card_brand`, `full_name`)  
  เมื่อ implement จริงอาจเพิ่มคอลัมน์เช่น `gateway_customer_id`, `gateway_card_id` สำหรับเก็บรหัสจาก Gateway

---

## 2. ตัวแปรใน .env ที่ต้องใช้

| ตัวแปร | บังคับ | คำอธิบาย |
|--------|--------|----------|
| `PAYMENT_GATEWAY_ENABLED` | ใช่ | `true` หรือ `1` เมื่อเปิดใช้ (ต้องมี Secret Key ด้วย) |
| `PAYMENT_GATEWAY_PROVIDER` | ไม่ | ชื่อ provider เช่น `omise`, `2c2p`, `stripe` (ใช้ใน logic แยก provider) |
| `PAYMENT_GATEWAY_PUBLIC_KEY` | เมื่อเปิดใช้ | คีย์สาธารณะ จาก dashboard ของ Gateway ใช้ฝั่ง frontend สร้าง token |
| `PAYMENT_GATEWAY_SECRET_KEY` | เมื่อเปิดใช้ | คีย์ลับ ใช้ฝั่ง backend เท่านั้น **ห้ามใส่ใน frontend หรือเปิดเผย** |
| `PAYMENT_GATEWAY_MERCHANT_ID` | ตาม provider | รหัสร้านค้า (ถ้า Gateway ต้องการ) |
| `PAYMENT_GATEWAY_API_URL` | ไม่ | Base URL ของ API (ถ้าไม่ใช้ default ของ provider) |

ตัวอย่างเมื่อใช้ Omise (เมื่อพร้อมเชื่อมต่อ):

```env
PAYMENT_GATEWAY_ENABLED=true
PAYMENT_GATEWAY_PROVIDER=omise
PAYMENT_GATEWAY_PUBLIC_KEY=pkey_test_xxxx
PAYMENT_GATEWAY_SECRET_KEY=skey_test_xxxx
# Omise ใช้ default URL ไม่ต้องใส่ PAYMENT_GATEWAY_API_URL
```

---

## 3. Flow การชำระด้วยบัตร (เมื่อเชื่อมต่อแล้ว)

1. **ลงทะเบียนบัตร (เพิ่มช่องทางชำระเงิน)**  
   - Frontend โหลด SDK ของ Gateway (เช่น Omise.js) โดยใช้ **Public Key**  
   - ผู้ใช้กรอกเลขบัตรบนฟอร์มที่ SDK จัดให้ (เลขบัตรไม่ผ่าน server ของเรา)  
   - SDK สร้าง **token** ส่งมา backend  
   - Backend เรียก `paymentGatewayService.registerCard(userId, token, metadata)`  
   - Gateway สร้าง customer/card แล้วคืน identifier → เราเก็บใน `payment_channels` (และคอลัมน์ gateway ที่เพิ่มถ้ามี)

2. **ตัดเงินเมื่อเลือกแพ็กเกจ**  
   - ลูกค้าเลือกแพ็กเกจและเลือกช่องทางบัตร  
   - Backend เรียก `paymentGatewayService.chargeSavedCard(userId, paymentChannelId, amountSatang, description)`  
   - Service ดึง gateway_card_id จาก DB แล้วยิง charge ไปที่ Gateway  
   - ถ้าสำเร็จ → สร้าง/ต่อสมาชิก + บันทึก `payment_history`

---

## 4. สิ่งที่ต้องทำเมื่อจะเชื่อมต่อ Gateway จริง

1. **สมัครและตั้งค่าที่ Gateway** (เช่น Omise, 2C2P) แล้วนำ Public Key / Secret Key ใส่ใน `.env`
2. **เพิ่มคอลัมน์ใน DB (ถ้าต้องการ)**  
   - เช่น `payment_channels.gateway_customer_id`, `payment_channels.gateway_card_id`  
   - สร้าง migration แล้วอัปเดต schema-full.sql
3. **แก้ `services/paymentGatewayService.js`**  
   - ใน `registerCard` เรียก API ของ provider (สร้าง customer, attach card) แล้วบันทึก identifier ลง DB  
   - ใน `chargeSavedCard` ดึง card id จาก DB แล้วเรียก API charge  
   - จัดการ error และคืนค่าให้ controller ใช้ตอบ frontend
4. **ฝั่ง Frontend**  
   - เมื่อ `GET /api/payment-gateway/status` คืน `configured: true` และมี `publicKey` ให้แสดงฟอร์มบัตร  
   - โหลด SDK ของ Gateway (ตาม provider) โดยใช้ `publicKey`  
   - หลังผู้ใช้กรอกบัตรและ SDK สร้าง token แล้ว ส่ง token มาที่ backend (เช่น POST /api/payment-channels พร้อม body ที่มี token)

---

## 5. ความปลอดภัย (PCI)

- **อย่าให้เลขบัตรผ่าน server ของเรา** — ใช้ SDK ของ Gateway บน frontend สร้าง token แล้วส่งเฉพาะ token
- **เก็บเฉพาะข้อมูลที่ Gateway คืนมา** — เช่น last 4 digits, brand (สำหรับแสดงใน UI)
- **Secret Key ใช้เฉพาะบน backend** — ไม่ส่งไป frontend และไม่ commit ลง git (.env อยู่ใน .gitignore)

---

เมื่อตั้งค่า `.env` และ implement logic ใน `paymentGatewayService.js` ตาม provider ที่ใช้ ระบบจะพร้อมตัดยอดอัตโนมัติผ่าน Payment Gateway ได้ตาม flow ด้านบน
