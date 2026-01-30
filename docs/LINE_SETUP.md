# คู่มือการตั้งค่า LINE Login และ LIFF

## 📋 สิ่งที่ต้องเตรียม

1. บัญชี LINE Developers Account
2. Channel (Provider) ใน LINE Developers Console
3. LINE Login Channel
4. LIFF App

---

## 🚀 ขั้นตอนการตั้งค่า

### 1. สร้าง LINE Developers Account

1. ไปที่ [LINE Developers Console](https://developers.line.biz/console/)
2. สร้างบัญชีหรือเข้าสู่ระบบ
3. สร้าง Provider (ถ้ายังไม่มี)

### 2. สร้าง LINE Login Channel

1. ใน LINE Developers Console เลือก Provider ของคุณ
2. คลิก **"Create"** → เลือก **"LINE Login"**
3. กรอกข้อมูล:
   - **Channel name**: ชื่อ Channel (เช่น "Line Flex Builder")
   - **Channel description**: คำอธิบาย
   - **App type**: Web app
   - **Email address**: อีเมลของคุณ
4. คลิก **"Create"**

### 3. ตั้งค่า LINE Login Channel

#### 3.1 Basic settings

1. ไปที่แท็บ **"LINE Login"** → **"Basic settings"**
2. ตั้งค่า **Callback URL**:
   ```
   https://yourdomain.com/api/auth/line/callback
   ```
   สำหรับ development:
   ```
   http://localhost:3000/api/auth/line/callback
   ```
3. บันทึก **Channel ID** และ **Channel Secret**

#### 3.2 OpenID Connect

1. ไปที่แท็บ **"LINE Login"** → **"OpenID Connect"**
2. เปิดใช้งาน **"OpenID Connect"**
3. ตั้งค่า **Callback URL**:
   ```
   https://yourdomain.com/api/auth/line/callback
   ```
4. ตั้งค่า **Scopes**:
   - ✅ `profile` (จำเป็น)
   - ✅ `openid` (จำเป็น)
   - ✅ `email` (ถ้าต้องการอีเมล)

### 4. สร้าง LIFF App

1. ไปที่แท็บ **"LIFF"** ใน Channel
2. คลิก **"Add"** เพื่อสร้าง LIFF App
3. กรอกข้อมูล:
   - **LIFF app name**: ชื่อ LIFF App
   - **Size**: Full
   - **Endpoint URL**: 
     ```
     https://yourdomain.com/liff/login
     ```
     สำหรับ development:
     ```
     http://localhost:3000/liff/login
     ```
   - **Scope**: 
     - ✅ `profile`
     - ✅ `openid`
   - **Bot link feature**: เปิดใช้งาน (ถ้าต้องการ)
4. คลิก **"Add"**
5. บันทึก **LIFF ID** (จะได้ LIFF ID เช่น `2006438841-7A2RNRKG`)

---

## 🔧 ตั้งค่าในโปรเจกต์

### 1. อัปเดตไฟล์ `.env`

เพิ่มข้อมูล LINE Login:

```env
# LINE Login Configuration
LINE_CHANNEL_ID=your_channel_id
LINE_CHANNEL_SECRET=your_channel_secret
LINE_CALLBACK_URL=http://localhost:3000/api/auth/line/callback

# LIFF Configuration
LIFF_ID=2006438841-7A2RNRKG
LIFF_LOGIN_ID=your_liff_login_id  # LIFF ID สำหรับหน้า login
```

### 2. ติดตั้ง Dependencies

```bash
npm install axios
```

### 3. รัน Database Migration

```bash
psql -U postgres -d line_flex_db -f database/add_line_user_id.sql
```

หรือใช้ Node.js script:

```bash
node scripts/setup-database.js
```

---

## 📝 ตัวอย่างการใช้งาน

### Flow การทำงาน

1. **ผู้ใช้กดลิงค์ LIFF** → ไปที่ `https://liff.line.me/{LIFF_LOGIN_ID}`
2. **LIFF ตรวจสอบ login** → ถ้ายังไม่ login จะ redirect ไป LINE Login
3. **LINE Login สำเร็จ** → กลับมาที่ LIFF page พร้อม authorization code
4. **ส่ง authorization code ไป backend** → Backend แลก code เป็น access token
5. **ดึงข้อมูล user จาก LINE** → ได้ LINE User ID, Display Name, etc.
6. **บันทึก/อัปเดต user ใน database** → ใช้ LINE User ID เป็น unique identifier
7. **สร้าง JWT token** → ส่งกลับไปให้ frontend
8. **Redirect ไปหน้า create** → ผู้ใช้สามารถสร้าง Flex Message ได้

---

## 🔐 Security Notes

1. **Channel Secret**: เก็บไว้เป็นความลับ อย่า commit ลง git
2. **Callback URL**: ต้องตรงกับที่ตั้งค่าใน LINE Developers Console
3. **HTTPS**: ใน production ต้องใช้ HTTPS
4. **State parameter**: ใช้สำหรับป้องกัน CSRF attack

---

## 🐛 Troubleshooting

### ปัญหา: "Invalid redirect_uri"

**สาเหตุ**: Callback URL ไม่ตรงกับที่ตั้งค่าใน LINE Developers Console

**แก้ไข**: ตรวจสอบ Callback URL ใน:
- LINE Developers Console → LINE Login → Basic settings
- ไฟล์ `.env` → `LINE_CALLBACK_URL`

### ปัญหา: "LIFF initialization failed"

**สาเหตุ**: LIFF ID ไม่ถูกต้อง หรือ LIFF App ยังไม่ได้ publish

**แก้ไข**: 
- ตรวจสอบ LIFF ID ใน `.env`
- ตรวจสอบว่า LIFF App ถูก publish แล้ว

### ปัญหา: "Cannot get user profile"

**สาเหตุ**: Scopes ไม่ครบ หรือ access token หมดอายุ

**แก้ไข**:
- ตรวจสอบ Scopes ใน LINE Login settings
- ตรวจสอบว่าเปิดใช้งาน OpenID Connect แล้ว

---

## 📚 เอกสารอ้างอิง

- [LINE Login Documentation](https://developers.line.biz/en/docs/line-login/)
- [LIFF Documentation](https://developers.line.biz/en/docs/liff/)
- [LINE Developers Console](https://developers.line.biz/console/)
