# Line Flex Message Builder Platform

แพลตฟอร์มสำหรับสร้างและแชร์ Line Flex Message (Magic Card) โดยผู้ใช้สามารถลงทะเบียน เลือก Template กรอกข้อมูล และสร้าง Flex Message พร้อมลิงค์ LIFF URL สำหรับแชร์ผ่าน Line

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
- **Frontend**: HTML, CSS, JavaScript (Vanilla)
- **File Upload**: Multer
- **Authentication**: JWT
- **LIFF SDK**: Line Frontend Framework v2

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

รัน SQL schema:

```bash
psql -U postgres -d line_flex_db -f database/schema.sql
```

หรือใช้ psql command line:

```bash
psql -U postgres -d line_flex_db < database/schema.sql
```

### 4. ตั้งค่า Environment Variables

คัดลอกไฟล์ `.env.example` เป็น `.env` และแก้ไขค่าต่างๆ:

```bash
cp .env.example .env
```

แก้ไขไฟล์ `.env`:

```env
# Server
PORT=3000
NODE_ENV=development
BASE_URL=http://localhost:3000

# LIFF Configuration
LIFF_ID=2006438841-7A2RNRKG

# PostgreSQL Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=line_flex_db
DB_USER=postgres
DB_PASSWORD=Boss112234

# File Upload
UPLOAD_DIR=uploads/images
MAX_FILE_SIZE=5242880
ALLOWED_FILE_TYPES=jpg,jpeg,png,gif

# Session/JWT
JWT_SECRET=line-flex-builder-secret-key-2024
SESSION_SECRET=line-flex-builder-session-secret-2024
```

### 5. สร้างโฟลเดอร์ที่จำเป็น

โฟลเดอร์จะถูกสร้างอัตโนมัติเมื่อรัน server แต่คุณสามารถสร้างล่วงหน้าได้:

```bash
mkdir -p uploads/images
mkdir -p json
```

### 6. รัน Server

Development mode (ใช้ nodemon):

```bash
npm run dev
```

Production mode:

```bash
npm start
```

Server จะรันที่ `http://localhost:3000`

## 📁 โครงสร้างโปรเจกต์

```
line-flex-builder/
├── .env                    # Environment variables
├── .env.example            # ตัวอย่าง config
├── .gitignore
├── package.json
├── README.md
├── server.js               # Main server
├── config/
│   └── database.js         # PostgreSQL connection pool
├── routes/
│   ├── index.js            # หน้าแรก
│   ├── api.js              # API endpoints
│   ├── auth.js             # Authentication routes
│   └── share.js            # LIFF share page
├── controllers/
│   ├── authController.js   # Login/Register logic
│   ├── cardController.js   # Card creation logic
│   └── templateController.js
├── middleware/
│   ├── upload.js           # File upload (multer)
│   └── auth.js             # Authentication middleware
├── utils/
│   ├── templateEngine.js   # Template processing
│   └── uniqueId.js         # Generate unique ID
├── database/
│   └── schema.sql          # Database schema
├── json/                   # Generated JSON files
│   └── card_*.json
├── uploads/
│   └── images/
└── public/
    ├── register.html       # หน้าลงทะเบียน
    ├── login.html          # หน้าเข้าสู่ระบบ
    ├── create.html         # หน้าสร้างการ์ด
    ├── my-cards.html       # หน้าดูลิงค์ทั้งหมด
    ├── share.html          # หน้า LIFF (ส่ง Flex Message)
    └── css/
        └── style.css
```

## 🔌 API Endpoints

### Authentication

- `POST /api/register` - ลงทะเบียน
  - Body: `{ username, email, password }`
  
- `POST /api/login` - เข้าสู่ระบบ
  - Body: `{ email/username, password }`
  
- `POST /api/logout` - ออกจากระบบ

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

### 1. ลงทะเบียน/เข้าสู่ระบบ

- ไปที่ `http://localhost:3000/register` เพื่อลงทะเบียน
- หรือ `http://localhost:3000/login` เพื่อเข้าสู่ระบบ

### 2. สร้าง Magic Card

1. ไปที่ `http://localhost:3000/create`
2. เลือก Template ที่ต้องการ
3. กรอกข้อมูล (ชื่อ, เบอร์โทร, อีเมล)
4. อัพโหลดรูปภาพ (ถ้าต้องการ)
5. กด "สร้าง Magic Card"
6. จะได้ลิงค์ LIFF URL สำหรับแชร์

### 3. ดูการ์ดทั้งหมด

- ไปที่ `http://localhost:3000/my-cards`
- ดูรายการการ์ดที่สร้างไว้ทั้งหมด
- ค้นหา คัดลอกลิงค์ หรือลบการ์ด

### 4. แชร์ Flex Message

- เปิดลิงค์ LIFF URL ที่ได้
- ระบบจะเปิดหน้า LIFF และส่ง Flex Message ผ่าน Line

## 🔒 Security

- Password hashing ด้วย bcrypt
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
