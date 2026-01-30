# LINE Messaging API — ส่งการ์ดให้ลูกค้าใน LINE

## ความแตกต่าง Channel

- **LINE Login Channel** = OAuth, LIFF (login, แชร์การ์ด) — ใช้ `LINE_CHANNEL_ID`, `LINE_CHANNEL_SECRET`, `line_user_id`
- **Messaging API Channel** = บอท, Push Message — ใช้ `LINE_CHANNEL_ACCESS_TOKEN`, **User ID บน Channel นี้** (เก็บใน `messaging_api_user_id`)

LINE Login กับ Messaging API **สร้างแยกกัน** (คนละ Channel) — User ID บน LINE Login ไม่ใช้ Push จาก Messaging API ได้ ต้องใช้ User ID ของ Messaging API Channel

---

## การตั้งค่า

### 1. สร้าง Messaging API Channel

ใน [LINE Developers Console](https://developers.line.biz/console/) สร้าง Channel ประเภท **Messaging API** (ถ้ามีอยู่แล้วข้าม)

### 2. ออก Channel Access Token

ไปที่ Channel → **Messaging API** → **Issue** channel access token (long-lived) → Copy token

### 3. ใส่ใน .env

```env
LINE_CHANNEL_ACCESS_TOKEN=ใส่_token_ตรงนี้
```

### 4. รัน migration (เพิ่มคอลัมน์ messaging_api_user_id)

```bash
node scripts/add-messaging-api-user-id.js
```

หรือรัน SQL เอง: `database/add_messaging_api_user_id.sql`

---

## การได้ Messaging API User ID

ลูกค้าต้อง **Add friend บอท (Messaging API Channel)** ก่อน ถึงจะ Push ข้อความไปหาได้

วิธีได้ `messaging_api_user_id` แล้วเก็บในระบบ:

1. **จาก LIFF บน Messaging API Channel**  
   ถ้ามี LIFF app ที่สร้างภายใต้ Messaging API Channel เมื่อลูกค้าเปิด LIFF จะได้ `userId` จาก LIFF context — ส่งมาที่ backend ผ่าน API `PUT /api/user/messaging-api-user-id` (body: `{ "messaging_api_user_id": "..." }`) โดยต้องส่ง request พร้อม Authorization (Bearer token)

2. **จาก Webhook**  
   เมื่อลูกค้าส่งข้อความมาที่บอท หรือ Add friend (follow event) ระบบจะได้ `userId` จาก webhook — ต้องมี logic ผูก userId กับ user ในระบบ (เช่น ใช้โค้ดหรือเบอร์โทร)

---

## API ที่เกี่ยวข้อง

- **PUT /api/user/messaging-api-user-id** (ต้อง login)  
  Body: `{ "messaging_api_user_id": "U1234..." }`  
  ใช้บันทึก User ID ของ Messaging API Channel เพื่อให้ระบบส่งการ์ดให้ลูกค้าใน LINE เมื่อสร้างการ์ดเสร็จ

---

## Flow การส่งการ์ด

1. ลูกค้า Login ผ่าน LINE (LINE Login Channel) — ระบบเก็บ `line_user_id`
2. (ถ้าต้องการรับการ์ดในแชท) ลูกค้า Add friend บอท (Messaging API Channel) แล้วได้ `messaging_api_user_id` — บันทึกผ่าน API ด้านบน หรือ webhook
3. ลูกค้าสร้างการ์ดเสร็จ → ระบบ Push Flex Message ไปที่ `messaging_api_user_id` (หรือ fallback `line_user_id`) ด้วย `LINE_CHANNEL_ACCESS_TOKEN`

ถ้าไม่ใส่ `LINE_CHANNEL_ACCESS_TOKEN` ระบบจะไม่ส่งการ์ดให้ใน LINE (สร้างการ์ดได้ตามปกติ)
