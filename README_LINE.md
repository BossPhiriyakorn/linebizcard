# คู่มือการตั้งค่า LINE Login และ LIFF

## 📋 สรุปการเปลี่ยนแปลง

### 1. ฐานข้อมูล
- เพิ่มคอลัมน์ `line_user_id` ในตาราง `users` (VARCHAR(100), UNIQUE)
- เพิ่มคอลัมน์ `login_type` ในตาราง `users` ('email' หรือ 'line')
- สร้าง index สำหรับ `line_user_id`

### 2. Environment Variables
เพิ่มในไฟล์ `.env`:
```env
# LINE Login Configuration
LINE_CHANNEL_ID=your_channel_id
LINE_CHANNEL_SECRET=your_channel_secret
LINE_CALLBACK_URL=http://localhost:3000/api/auth/line/callback

# LIFF Configuration
LIFF_LOGIN_ID=your_liff_login_id
```

### 3. API Endpoints ใหม่
- `GET /api/auth/line/login` - เริ่มต้น LINE Login
- `GET /api/auth/line/callback` - Callback จาก LINE
- `GET /api/auth/line/user` - ดึงข้อมูล LINE User
- `POST /api/auth/line/liff-login` - Login ผ่าน LIFF
- `GET /api/liff-login-id` - ดึง LIFF Login ID

### 4. LIFF Pages
- `GET /liff/login` - หน้า Login ผ่าน LIFF

---

## 🚀 ขั้นตอนการตั้งค่า

### Step 1: สร้าง LINE Login Channel

1. ไปที่ [LINE Developers Console](https://developers.line.biz/console/)
2. สร้าง Provider (ถ้ายังไม่มี)
3. สร้าง **LINE Login** Channel:
   - Channel name: "Line Flex Builder"
   - App type: **Web app**
   - Email: อีเมลของคุณ

### Step 2: ตั้งค่า LINE Login

1. ไปที่ Channel → **LINE Login** → **Basic settings**
2. ตั้งค่า **Callback URL**:
   ```
   http://localhost:3000/api/auth/line/callback
   ```
   (สำหรับ production ใช้ HTTPS)
3. บันทึก **Channel ID** และ **Channel Secret**

### Step 3: ตั้งค่า OpenID Connect

1. ไปที่ **LINE Login** → **OpenID Connect**
2. เปิดใช้งาน **OpenID Connect**
3. ตั้งค่า **Callback URL**:
   ```
   http://localhost:3000/api/auth/line/callback
   ```
4. ตั้งค่า **Scopes**:
   - ✅ `profile`
   - ✅ `openid`
   - ✅ `email` (optional)

### Step 4: สร้าง LIFF App สำหรับ Login

1. ไปที่ Channel → **LIFF** → **Add**
2. กรอกข้อมูล:
   - **LIFF app name**: "Login"
   - **Size**: Full
   - **Endpoint URL**: 
     ```
     http://localhost:3000/liff/login
     ```
   - **Scope**: 
     - ✅ `profile`
     - ✅ `openid`
3. บันทึก **LIFF ID** (LIFF_LOGIN_ID)

### Step 5: อัปเดตไฟล์ .env

```env
LINE_CHANNEL_ID=1234567890
LINE_CHANNEL_SECRET=abcdefghijklmnopqrstuvwxyz123456
LINE_CALLBACK_URL=http://localhost:3000/api/auth/line/callback
LIFF_LOGIN_ID=2006438841-7A2RNRKG
```

### Step 6: รัน Database Migration

```bash
node scripts/add-line-columns.js
```

---

## 🔄 Flow การทำงาน

### Flow 1: Login ผ่าน LIFF (แนะนำ)

1. **ผู้ใช้เปิด LIFF URL**: `https://liff.line.me/{LIFF_LOGIN_ID}`
2. **LIFF ตรวจสอบ login**: ถ้ายังไม่ login จะ redirect ไป LINE Login
3. **LINE Login สำเร็จ**: กลับมาที่ LIFF page
4. **LIFF ดึงข้อมูล user**: ใช้ `liff.getProfile()` และ `liff.getAccessToken()`
5. **ส่งข้อมูลไป backend**: POST `/api/auth/line/liff-login`
6. **Backend สร้าง/อัปเดต user**: ใช้ LINE User ID
7. **ส่ง JWT token กลับ**: Frontend บันทึก token
8. **Redirect ไปหน้า create**: ผู้ใช้สามารถสร้าง Flex Message ได้

### Flow 2: Login ผ่าน Web Browser

1. **ผู้ใช้กดปุ่ม "เข้าสู่ระบบด้วย LINE"**
2. **Redirect ไป LINE Login**: `GET /api/auth/line/login`
3. **LINE Login สำเร็จ**: Redirect กลับมาที่ callback URL
4. **Backend แลก code เป็น token**: ใช้ Channel ID/Secret
5. **ดึงข้อมูล user จาก LINE**: ใช้ access token
6. **สร้าง/อัปเดต user ใน database**: ใช้ LINE User ID
7. **Redirect ไป LIFF login พร้อม token**: `/liff/login?token=...`
8. **LIFF page บันทึก token**: และ redirect ไปหน้า create

---

## 📝 ข้อมูลที่เก็บ

### ตาราง users

| Column | Type | Description |
|--------|------|-------------|
| `id` | SERIAL | Primary key |
| `username` | VARCHAR(100) | ชื่อผู้ใช้ (จาก LINE display name) |
| `email` | VARCHAR(255) | อีเมล (ถ้ามีจาก LINE) |
| `password` | VARCHAR(255) | Password (ไม่ใช้สำหรับ LINE login) |
| `line_user_id` | VARCHAR(100) | LINE User ID (UNIQUE) |
| `login_type` | VARCHAR(20) | 'email' หรือ 'line' |
| `created_at` | TIMESTAMP | วันที่สร้าง |

**หมายเหตุ**: 
- สำหรับ LINE login: `line_user_id` จะถูกใช้เป็น unique identifier
- `password` จะเป็น random string (ไม่ใช้สำหรับ authentication)
- `email` อาจเป็น `line_{user_id}@line.local` ถ้า LINE ไม่ให้ email

---

## 🧪 ทดสอบ

### 1. ทดสอบ LINE Login

```bash
# เปิดเบราว์เซอร์
http://localhost:3000/api/auth/line/login
```

ควรจะ redirect ไป LINE Login page

### 2. ทดสอบ LIFF Login

สร้างลิงค์ LIFF:
```
https://liff.line.me/{LIFF_LOGIN_ID}
```

เปิดลิงค์นี้ใน LINE App หรือ LINE Web

### 3. ตรวจสอบ Database

```bash
node scripts/check-database.js
```

---

## 🔐 Security Notes

1. **Channel Secret**: เก็บไว้เป็นความลับ อย่า commit ลง git
2. **Callback URL**: ต้องตรงกับที่ตั้งค่าใน LINE Developers Console
3. **HTTPS**: ใน production ต้องใช้ HTTPS
4. **State parameter**: ใช้สำหรับป้องกัน CSRF (ควรเพิ่มในอนาคต)

---

## 🐛 Troubleshooting

### ปัญหา: "Invalid redirect_uri"

**แก้ไข**: ตรวจสอบ Callback URL ใน:
- LINE Developers Console → LINE Login → Basic settings
- ไฟล์ `.env` → `LINE_CALLBACK_URL`

### ปัญหา: "LIFF initialization failed"

**แก้ไข**: 
- ตรวจสอบ LIFF_LOGIN_ID ใน `.env`
- ตรวจสอบว่า LIFF App ถูก publish แล้ว

### ปัญหา: "Cannot get user profile"

**แก้ไข**:
- ตรวจสอบ Scopes ใน LINE Login settings
- ตรวจสอบว่าเปิดใช้งาน OpenID Connect แล้ว

---

## 📚 เอกสารอ้างอิง

- [LINE Login Documentation](https://developers.line.biz/en/docs/line-login/)
- [LIFF Documentation](https://developers.line.biz/en/docs/liff/)
- [LINE Developers Console](https://developers.line.biz/console/)
