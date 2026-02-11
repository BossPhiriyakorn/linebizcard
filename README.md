# MagicBiz-Card

แพลตฟอร์มสำหรับสร้างและแชร์นามบัตรดิจิทัล (Flex Message) ผ่าน LINE โดยผู้ใช้สามารถลงทะเบียน เลือก Template กรอกข้อมูล และสร้างการ์ด พร้อมลิงค์ LIFF URL สำหรับแชร์ผ่าน LINE

## ✨ ฟีเจอร์

- 🔐 ระบบลงทะเบียนและเข้าสู่ระบบ
- 🎨 เลือก Template สำหรับสร้าง Flex Message
- 📸 อัพโหลดรูปภาพ
- 🔗 สร้าง LIFF URL สำหรับแชร์ Flex Message
- 📋 ดูรายการการ์ดที่สร้างไว้ทั้งหมด
- 🔍 ค้นหาการ์ด
- 🗑️ ลบการ์ด
- 📱 Responsive Design

## 🛠️ เทคโนโลยีที่ใช้

- **Backend**: Node.js + Express
- **Database**: PostgreSQL
- **Frontend**: Next.js (React)
- **File Upload**: Multer
- **Authentication**: JWT
- **LIFF SDK**: Line Frontend Framework v2
- **ชำระเงิน**: Stripe (บัตรเครดิต/เดบิต), ชำระแบบ QR + แนบสลิป, LINE Pay (เตรียมโครงไว้)

## 📋 ความต้องการของระบบ

- Node.js (v14 หรือสูงกว่า)
- PostgreSQL (v12 หรือสูงกว่า)
- npm หรือ yarn

## 🚀 การติดตั้ง

### 1. Clone หรือดาวน์โหลดโปรเจกต์

```bash
cd line_flex_tem
```

### 2. ติดตั้ง Dependencies

```bash
npm install
```

### 3. ตั้งค่า Database

สร้าง Database ใน PostgreSQL:

```sql
CREATE DATABASE line_flex_db;
```

รัน SQL schema (ดูลำดับการรันใน `database/README.md` ถ้ามี):

```bash
psql -U postgres -d line_flex_db -f database/schema-full.sql
```

หรือใช้ psql command line:

```bash
psql -U postgres -d line_flex_db < database/schema-full.sql
```

### 4. ตั้งค่า Environment Variables

คัดลอกไฟล์ `.env.example` เป็น `.env` และแก้ไขค่าต่างๆ:

```bash
cp .env.example .env
```

แก้ไขไฟล์ `.env` ตามสภาพแวดล้อม (ดูรายการตัวแปรทั้งหมดใน `.env.example`)  
ตัวแปรหลัก: `PORT`, `BASE_URL`, `DB_*`, `JWT_SECRET`, `LIFF_ID`, `LIFF_LOGIN_ID`  
สำหรับชำระเงินและ LINE Pay ดูใน `docs/PAYMENT_GATEWAY_SETUP.md` และ `docs/LINE_PAY_SETUP.md`

### 5. สร้างโฟลเดอร์ที่จำเป็น

โฟลเดอร์จะถูกสร้างอัตโนมัติเมื่อรัน server แต่คุณสามารถสร้างล่วงหน้าได้:

```bash
mkdir -p uploads/images
mkdir -p json
```

### 6. รัน Server

Backend (Express):

```bash
npm run dev
```

หรือ Production: `npm start`

### Build (Production) — เซิร์ฟเวอร์หรือเครื่อง RAM น้อย

โปรเจกต์ใช้ **npm workspaces** (root + frontend): ติดตั้งและ build จากโฟลเดอร์รากเท่านั้น

ติดตั้ง dependencies **ครั้งเดียว** (workspaces จะติดตั้งทั้ง root และ frontend ให้):

```bash
npm run install:all
```

หรือ `npm install` จากโฟลเดอร์ราก

จากนั้นรัน build (ใช้ memory 1.5GB เพื่อลดโอกาสค้างตอน "Creating an optimized production build"):

```bash
npm run build
```

หรือ build แบบล้าง cache ก่อน: `npm run build:clean`

หลัง build สำเร็จ รัน `npm start` ได้เลย

**หมายเหตุ:** ไม่ต้องรัน `cd frontend && npm install` แยก — ใช้ `npm install` ที่รากเพียงครั้งเดียว

**Production (อัปโหลดรูป + แปลง WebP):** บนเซิร์ฟเวอร์ต้องติดตั้ง dependencies บนเครื่องนั้นเลย (`npm install` หรือ `npm ci`) เพื่อให้ **sharp** และ **heic-convert** ถูก build ตรงกับ OS (Linux/Windows). อย่า copy โฟลเดอร์ `node_modules` จากเครื่องอื่นมาใช้. แพ็กเกจที่ใช้ในการอัปโหลดและแปลงรูป: `sharp`, `heic-convert`, `multer`, `fs-extra` (อยู่ใน `package.json` แล้ว). การสร้างการ์ด (create-card) ไม่จำกัด timeout เพื่อรองรับอัปโหลดและแปลงรูปช้า.

Server หลักจะรันที่ `http://localhost:3000` (ปรับตาม `PORT` และ `BASE_URL` ใน `.env`)

## 📁 โครงสร้างโปรเจกต์ (สรุป)

```
├── .env.example            # ตัวอย่างตัวแปรแวดล้อม (อ้างอิง docs/)
├── server.js               # Backend (Express)
├── config/                 # DB, Stripe, LINE Pay
├── routes/                 # api.js, auth.js, cmsApi.js
├── controllers/            # แพ็กเกจ, การ์ด, ชำระเงิน, CMS ฯลฯ
├── services/               # paymentGatewayService, linePayService, lineService
├── middleware/             # auth, upload, rateLimit
├── database/               # schema-full.sql, migration ต่างๆ (ดู database/README.md)
├── docs/                   # PAYMENT_GATEWAY_SETUP.md, LINE_PAY_SETUP.md
├── frontend/               # Next.js (React) — หน้า LIFF, CMS, ชำระเงิน, โปรไฟล์
│   └── app/                # หน้า /home, /create, /payment-summary, /pay-by-qr, /cms ฯลฯ
└── uploads/images/         # รูปอัปโหลด
```

## 🔌 API Endpoints

### Authentication (ลูกค้าเข้าใช้งานผ่าน LINE)

- ลูกค้าเข้าสู่ระบบผ่าน LINE (LIFF) — ใช้ `GET /api/auth/line/login`, callback แล้วได้ token
- `POST /api/auth/logout` - ออกจากระบบ (ตอบรับ; JWT ลบฝั่ง client)
- `POST /api/auth/line/liff-login` - LIFF login (line_user_id, display_name)

### Templates

- `GET /api/templates` - ดึง Templates ทั้งหมด
- `GET /api/templates/:id` - ดึง Template เดียว

### Cards

- `POST /api/create-card` - สร้าง Card (ต้อง authenticate)
  - Headers: `Authorization: Bearer {token}`
  - Body: FormData (template_id, name, phone, email, image)
  
- `GET /api/my-cards` - ดึง Cards ของ User (ต้อง authenticate)
  
- `GET /api/cards/:id` - ดึง Card เดียว (ต้อง authenticate)
  
- `DELETE /api/cards/:id` - ลบ Card (ต้อง authenticate)

### LIFF

- `GET /api/liff-id` - ดึง LIFF_ID
- `GET /share` - หน้า LIFF Share

## 🎯 วิธีใช้งาน

### 1. ลงทะเบียน/เข้าสู่ระบบ (ผ่าน LINE)

- ลูกค้าเข้าใช้งานผ่าน LINE — เปิด LIFF หรือไปที่ `/liff/login` เพื่อเข้าสู่ระบบด้วย LINE
- ลิงก์ `/login` และ `/register` จะ redirect ไปหน้า LIFF login อัตโนมัติ

### 2. สร้างการ์ด

1. ไปที่ `http://localhost:3000/create`
2. เลือก Template ที่ต้องการ
3. กรอกข้อมูล (ชื่อ, เบอร์โทร, อีเมล)
4. อัพโหลดรูปภาพ (ถ้าต้องการ)
5. กด "สร้างการ์ด"
6. จะได้ลิงค์ LIFF URL สำหรับแชร์

### 3. ดูการ์ดทั้งหมด

- ไปที่ `http://localhost:3000/my-cards`
- ดูรายการการ์ดที่สร้างไว้ทั้งหมด
- ค้นหา คัดลอกลิงค์ หรือลบการ์ด

### 4. แชร์ Flex Message

- เปิดลิงค์ LIFF URL ที่ได้
- ระบบจะเปิดหน้า LIFF และส่ง Flex Message ผ่าน Line

## 🔒 Security

- Password hashing ด้วย bcrypt (แอดมิน CMS; ลูกค้าเข้าใช้งานผ่าน LINE ไม่ใช้รหัสผ่าน)
- JWT authentication
- Input validation
- File upload validation
- SQL injection prevention (parameterized queries)
- XSS prevention

## 📝 หมายเหตุ

- ต้องตั้งค่า LIFF App ใน Line Developers Console ก่อนใช้งาน
- ต้องมี LIFF_ID ที่ถูกต้องในไฟล์ `.env`
- รูปภาพที่อัพโหลดจะถูกเก็บใน `uploads/images/`
- JSON files จะถูกสร้างใน `json/`

## 🐛 Troubleshooting

### Database Connection Error

ตรวจสอบว่า:
- PostgreSQL กำลังรันอยู่
- Database `line_flex_db` ถูกสร้างแล้ว
- Username และ Password ใน `.env` ถูกต้อง

### LIFF Error

ตรวจสอบว่า:
- LIFF_ID ใน `.env` ถูกต้อง
- LIFF App ถูกตั้งค่าใน Line Developers Console
- Endpoint URL ถูกต้อง

### File Upload Error

ตรวจสอบว่า:
- โฟลเดอร์ `uploads/images/` มีสิทธิ์เขียน
- ไฟล์ไม่เกินขนาดที่กำหนด (default: 5MB)
- ประเภทไฟล์ถูกต้อง (jpg, jpeg, png, gif)

## 📄 License

MIT License

## 👨‍💻 Author

Boss Phiriyakorn
