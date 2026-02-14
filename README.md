# MagicBiz-Card

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D14.0.0-brightgreen.svg)
![PostgreSQL](https://img.shields.io/badge/postgresql-%3E%3D12.0.0-blue.svg)
![Next.js](https://img.shields.io/badge/next.js-16.1.6-black.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

แพลตฟอร์มสำหรับสร้างและแชร์นามบัตรดิจิทัล (Flex Message) ผ่าน LINE โดยผู้ใช้สามารถลงทะเบียน เลือก Template กรอกข้อมูล และสร้างการ์ด พร้อมลิงค์ LIFF URL สำหรับแชร์ผ่าน LINE พร้อมระบบแพ็กเกจและการชำระเงินที่หลากหลาย

## 📑 สารบัญ

- [ฟีเจอร์หลัก](#-ฟีเจอร์หลัก)
- [เทคโนโลยีที่ใช้](#️-เทคโนโลยีที่ใช้)
- [ความต้องการของระบบ](#-ความต้องการของระบบ)
- [การติดตั้ง](#-การติดตั้ง)
- [โครงสร้างโปรเจกต์](#-โครงสร้างโปรเจกต์)
- [API Endpoints](#-api-endpoints)
- [วิธีใช้งาน](#-วิธีใช้งาน)
- [ความปลอดภัย](#-ความปลอดภัย-security)
- [หมายเหตุสำคัญ](#-หมายเหตุสำคัญ)
- [Troubleshooting](#-troubleshooting-แก้ไขปัญหา)
- [Version History](#-version-history)
- [Contributing](#-contributing)
- [License](#-license)

## ✨ ฟีเจอร์หลัก

### สำหรับผู้ใช้งาน (Customer)
- 🔐 **ระบบเข้าสู่ระบบผ่าน LINE** - เข้าใช้งานผ่าน LINE Account โดยไม่ต้องสร้างรหัสผ่าน
- 🎨 **เลือก Template การ์ด** - Template หลากหลายรูปแบบสำหรับสร้าง Flex Message
- 📸 **อัพโหลดรูปภาพ** - รองรับ JPG, PNG, GIF, HEIC พร้อมแปลงเป็น WebP อัตโนมัติ
- 🔗 **สร้าง LIFF URL** - สร้างลิงค์แชร์การ์ดผ่าน LINE ได้ทันที
- 📋 **จัดการการ์ด** - ดู ค้นหา และลบการ์ดที่สร้างไว้
- 💳 **ระบบแพ็กเกจ** - เลือกซื้อแพ็กเกจตามความต้องการ (Free, Basic, Premium)
- 💰 **ชำระเงินหลากหลายช่องทาง**:
  - Stripe (บัตรเครดิต/เดบิต)
  - QR Code + อัพโหลดสลิป (PromptPay)
  - LINE Pay (พร้อมใช้งาน)
- 👤 **โปรไฟล์ผู้ใช้** - ดูข้อมูลส่วนตัวและสิทธิ์การใช้งาน
- 📱 **Responsive Design** - ใช้งานได้ทั้งมือถือและคอมพิวเตอร์

### สำหรับแอดมิน (CMS)
- 🔐 **ระบบเข้าสู่ระบบ CMS** - เข้าสู่ระบบด้วย Username/Password
- 👥 **จัดการผู้ใช้** - ดู แก้ไข และจัดการผู้ใช้งานทั้งหมด
- 🎴 **จัดการการ์ด** - ดู ค้นหา และลบการ์ดของผู้ใช้
- 📦 **จัดการแพ็กเกจ** - สร้าง แก้ไข และจัดการแพ็กเกจ
- 🎨 **จัดการ Template** - เพิ่ม แก้ไข และลบ Template การ์ด
- 💸 **อนุมัติการชำระเงิน** - ตรวจสอบและอนุมัติการชำระเงินผ่าน QR+สลิป
- 🎟️ **จัดการคูปอง** - สร้างและจัดการโค้ดส่วนลด
- 📊 **รายงานและสถิติ** - ดูข้อมูลสถิติการใช้งานและรายได้
- ⚙️ **ตั้งค่าระบบ** - จัดการการตั้งค่าต่างๆ ของระบบ
- 🔔 **ระบบแจ้งเตือน** - แจ้งเตือนการชำระเงินและกิจกรรมสำคัญ

## 🛠️ เทคโนโลยีที่ใช้

### Backend
- **Node.js** (v14+) - Runtime Environment
- **Express.js** - Web Framework
- **PostgreSQL** (v12+) - Database
- **JWT** - Authentication & Authorization
- **bcrypt** - Password Hashing (สำหรับแอดมิน)

### Frontend
- **Next.js 16** (React) - Frontend Framework
- **Tailwind CSS** - Styling (ถ้ามี)
- **LIFF SDK v2** - LINE Frontend Framework

### File Processing
- **Multer** - File Upload Middleware
- **Sharp** - Image Processing & WebP Conversion
- **heic-convert** - HEIC to JPEG Conversion

### Payment Integration
- **Stripe API** - Credit/Debit Card Payment
- **LINE Pay API** - LINE Pay Integration
- **PromptPay QR** - QR Code Payment with Slip Upload

### External Services
- **LINE Messaging API** - LINE Integration
- **Google Drive API** - Cloud Storage (Optional)
- **Nodemailer** - Email Service

### Development Tools
- **nodemon** - Development Server
- **cross-env** - Environment Variables
- **dotenv** - Environment Configuration

## 🎬 Demo & Screenshots

### ผู้ใช้งาน (Customer)
- **หน้า Login**: เข้าสู่ระบบผ่าน LINE
- **หน้า Home**: เมนูหลักและฟีเจอร์ต่างๆ
- **หน้า Create Card**: เลือก Template และกรอกข้อมูล
- **หน้า My Cards**: ดูการ์ดทั้งหมดที่สร้างไว้
- **หน้า Share**: แชร์การ์ดผ่าน LINE (LIFF)
- **หน้า Packages**: เลือกและซื้อแพ็กเกจ
- **หน้า Payment**: ชำระเงินผ่านช่องทางต่างๆ

### แอดมิน (CMS)
- **CMS Dashboard**: ภาพรวมสถิติและข้อมูล
- **User Management**: จัดการผู้ใช้งาน
- **Card Management**: จัดการการ์ดทั้งหมด
- **Payment Approval**: อนุมัติการชำระเงิน
- **Settings**: ตั้งค่าระบบ

> 📸 เพิ่ม Screenshots ได้ที่โฟลเดอร์ `/docs/screenshots/`

## ⚡ Quick Start

```bash
# 1. Clone โปรเจกต์
git clone <repository-url>
cd line_flex_tem

# 2. ติดตั้ง Dependencies
npm install

# 3. ตั้งค่า Environment Variables
cp .env.example .env
# แก้ไขค่าใน .env ให้ตรงกับสภาพแวดล้อมของคุณ

# 4. สร้าง Database
npm run setup:db

# 5. รัน Server (Development)
npm run dev

# 6. เปิด Browser
# http://localhost:3000
```

## 📋 ความต้องการของระบบ

### Software Requirements
- **Node.js** v14.0.0 หรือสูงกว่า
- **PostgreSQL** v12.0.0 หรือสูงกว่า
- **npm** v6.0.0 หรือสูงกว่า (หรือ yarn)

### Hardware Requirements (แนะนำ)
- **CPU**: 2 cores ขึ้นไป
- **RAM**: 4GB ขึ้นไป
- **Storage**: 10GB ขึ้นไป (สำหรับ Database และ Uploaded Files)

### External Services
- **LINE Developers Account** - สำหรับ LINE Login และ LIFF
- **Stripe Account** - สำหรับรับชำระเงินผ่านบัตร (Optional)
- **LINE Pay Account** - สำหรับรับชำระเงินผ่าน LINE Pay (Optional)
- **Google Cloud Account** - สำหรับ Google Drive API (Optional)

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

แก้ไขไฟล์ `.env` ตามสภาพแวดล้อม:

#### 4.1 Server Configuration
```env
NODE_ENV=development          # development หรือ production
PORT=3000                     # Port ที่ Server จะรัน
BASE_URL=http://localhost:3000  # URL ของแอปพลิเคชัน (Production ต้องเป็น HTTPS)
```

#### 4.2 Database Configuration
```env
DB_HOST=localhost             # Database Host
DB_PORT=5432                  # PostgreSQL Port (default: 5432)
DB_USER=postgres              # Database Username
DB_PASSWORD=your_password     # Database Password
DB_NAME=line_flex_db          # Database Name
```

#### 4.3 JWT Configuration
```env
JWT_SECRET=your_jwt_secret_key_here  # Secret Key สำหรับ JWT (ควรเป็น Random String ยาวๆ)
JWT_EXPIRES_IN=24h            # Token Expiry Time (default: 24 ชั่วโมง)
```

#### 4.4 LINE Configuration
```env
LIFF_ID=your_liff_id          # LIFF ID สำหรับหน้าหลัก
LIFF_LOGIN_ID=your_liff_login_id  # LIFF ID สำหรับหน้า Login
LINE_CHANNEL_ID=your_channel_id   # LINE Channel ID
LINE_CHANNEL_SECRET=your_channel_secret  # LINE Channel Secret
LINE_CHANNEL_ACCESS_TOKEN=your_access_token  # LINE Channel Access Token
```

#### 4.5 Stripe Configuration (Optional)
```env
STRIPE_SECRET_KEY=sk_test_xxx  # Stripe Secret Key (Test หรือ Live)
STRIPE_PUBLISHABLE_KEY=pk_test_xxx  # Stripe Publishable Key
STRIPE_WEBHOOK_SECRET=whsec_xxx  # Stripe Webhook Secret
```

#### 4.6 LINE Pay Configuration (Optional)
```env
LINEPAY_CHANNEL_ID=your_linepay_channel_id  # LINE Pay Channel ID
LINEPAY_CHANNEL_SECRET=your_linepay_secret  # LINE Pay Channel Secret
LINEPAY_ENV=sandbox           # sandbox หรือ production
LINEPAY_CONFIRM_URL=http://localhost:3000/api/linepay/confirm  # Callback URL
```

#### 4.7 Email Configuration (Optional)
```env
EMAIL_HOST=smtp.gmail.com     # SMTP Host
EMAIL_PORT=587                # SMTP Port
EMAIL_USER=your_email@gmail.com  # Email Address
EMAIL_PASSWORD=your_app_password  # Email Password หรือ App Password
EMAIL_FROM=noreply@yourdomain.com  # From Email Address
```

#### 4.8 Google Drive Configuration (Optional)
```env
GOOGLE_DRIVE_FOLDER_ID=your_folder_id  # Google Drive Folder ID สำหรับ Backup
```

#### 4.9 Other Configuration
```env
MAX_FILE_SIZE=5242880         # Max File Size (bytes) - default: 5MB
RATE_LIMIT_MAX=100            # Rate Limit Max Requests per Window
RATE_LIMIT_WINDOW=60000       # Rate Limit Window (ms) - default: 1 minute
```

**หมายเหตุ:**
- ดูตัวอย่างครบถ้วนใน `.env.example`
- สำหรับ Production ต้องใช้ HTTPS และตั้งค่า `BASE_URL` ให้ถูกต้อง
- JWT_SECRET ควรเป็น Random String ที่ยาวและซับซ้อน
- สำหรับการตั้งค่า Payment Gateway ดูเพิ่มเติมใน `docs/PAYMENT_GATEWAY_SETUP.md` และ `docs/LINE_PAY_SETUP.md`

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

หลัง build สำเร็จ: ถ้ารันแอปด้วย **PM2** บนเซิร์ฟ ใช้ **`pm2 restart linebizcard`** ไม่ต้องรัน `npm start` (รันซ้ำจะ error EADDRINUSE port 3000 — ดู `docs/DEPLOY_VERIFY.md` มาตรา 0.2). ถ้าไม่ได้ใช้ PM2 รัน `npm start` ได้

**หมายเหตุ:** ไม่ต้องรัน `cd frontend && npm install` แยก — ใช้ `npm install` ที่รากเพียงครั้งเดียว

**Production (อัปโหลดรูป + แปลง WebP):** บนเซิร์ฟเวอร์ต้องติดตั้ง dependencies บนเครื่องนั้นเลย (`npm install` หรือ `npm run install:all`) ทุกครั้งหลัง pull จาก Git เพื่อให้ **sharp** และ **heic-convert** ถูก build ตรงกับ OS. อย่า copy โฟลเดอร์ `node_modules` จากเครื่องอื่นมาใช้. การสร้างการ์ดไม่จำกัด timeout. **ตรวจสอบ Nginx, ลำดับ deploy และคำสั่งไล่ log:** ดู `docs/DEPLOY_VERIFY.md`

Server หลักจะรันที่ `http://localhost:3000` (ปรับตาม `PORT` และ `BASE_URL` ใน `.env`)

## 📁 โครงสร้างโปรเจกต์

```
line_flex_tem/
├── .env                        # Environment Variables (ไม่ commit)
├── .env.example                # ตัวอย่างตัวแปรแวดล้อม
├── .gitignore                  # Git ignore rules
├── package.json                # Root dependencies & scripts
├── server.js                   # Express Server & Next.js Integration
├── Credentials.json            # Google Drive API Credentials (ไม่ commit)
├── README.md                   # เอกสารนี้
├── SRS_PROMPT_TEMPLATE.md      # Template สำหรับสร้างเอกสาร SRS
│
├── config/                     # Configuration Files
│   ├── database.js             # PostgreSQL Connection
│   ├── paymentGateway.js       # Stripe Configuration
│   └── linePay.js              # LINE Pay Configuration
│
├── routes/                     # API Routes
│   ├── api.js                  # Main API Routes (Cards, Templates, Packages)
│   ├── auth.js                 # Authentication Routes (LINE Login)
│   └── cmsApi.js               # CMS API Routes (Admin)
│
├── controllers/                # Business Logic Controllers
│   ├── authController.js       # Authentication Logic
│   ├── lineAuthController.js   # LINE Login Logic
│   ├── cardController.js       # Card CRUD Operations
│   ├── templateController.js   # Template Management
│   ├── packageController.js    # Package Management
│   ├── paymentChannelController.js  # Payment Processing
│   ├── pendingPaymentController.js  # Payment Verification
│   ├── linePayController.js    # LINE Pay Integration
│   ├── couponController.js     # Coupon Management
│   ├── cmsController.js        # CMS Operations
│   └── emailVerificationController.js  # Email Verification
│
├── services/                   # External Services
│   ├── paymentGatewayService.js  # Stripe Service
│   ├── linePayService.js       # LINE Pay Service
│   ├── lineService.js          # LINE Messaging API
│   └── emailService.js         # Email Service (Nodemailer)
│
├── middleware/                 # Express Middleware
│   ├── auth.js                 # JWT Authentication
│   ├── adminAuth.js            # Admin Authentication
│   ├── upload.js               # File Upload (Multer)
│   └── rateLimit.js            # Rate Limiting
│
├── utils/                      # Utility Functions
│   ├── imageToWebp.js          # Image Conversion
│   ├── googleDrive.js          # Google Drive Upload
│   ├── templateEngine.js       # Template Processing
│   ├── encryption.js           # Data Encryption
│   ├── cmsNotification.js      # CMS Notifications
│   └── uniqueId.js             # Unique ID Generator
│
├── database/                   # Database Files
│   ├── schema-full.sql         # Complete Database Schema
│   ├── add-drive-columns.sql   # Migration: Google Drive Columns
│   ├── fix-free-package-requires-payment.sql  # Migration: Free Package Fix
│   └── delete-users-and-cards.sql  # Utility: Delete Test Data
│
├── scripts/                    # Utility Scripts
│   ├── setup-database.js       # Database Setup Script
│   ├── create-database.js      # Create Database
│   ├── run-migration.js        # Run Migrations
│   ├── create-admin.js         # Create Admin User
│   ├── delete-admin.js         # Delete Admin User
│   ├── delete-demo-user.js     # Delete Demo User
│   ├── add-admins-fullname-nickname.js  # Admin Profile Update
│   ├── add-admins-permissions.js  # Admin Permissions Setup
│   ├── add-tii-card-template.js  # Add Template
│   ├── add-custom-template.js  # Add Custom Template
│   ├── test-stripe-api.js      # Test Stripe Integration
│   └── clean-build.js          # Clean Build Files
│
├── docs/                       # Documentation (ถ้ามี)
│   ├── PAYMENT_GATEWAY_SETUP.md  # Stripe Setup Guide
│   ├── LINE_PAY_SETUP.md       # LINE Pay Setup Guide
│   └── DEPLOY_VERIFY.md        # Deployment & Verification Guide
│
├── frontend/                   # Next.js Frontend Application
│   ├── package.json            # Frontend Dependencies
│   ├── next.config.js          # Next.js Configuration
│   ├── jsconfig.json           # JavaScript Configuration
│   │
│   └── app/                    # Next.js App Directory
│       ├── page.js             # Landing Page
│       ├── layout.js           # Root Layout
│       ├── globals.css         # Global Styles
│       │
│       ├── liff/               # LIFF Pages
│       │   └── login/          # LIFF Login Page
│       │
│       ├── home/               # Home Page
│       ├── create/             # Create Card Page
│       ├── my-cards/           # My Cards Page
│       ├── share/              # Share Card (LIFF)
│       ├── profile/            # User Profile Page
│       │
│       ├── packages/           # Package Selection Page
│       ├── payment-summary/    # Payment Summary Page
│       ├── pay-by-qr/          # QR Payment Page
│       ├── payment-success/    # Payment Success Page
│       ├── payment-failed/     # Payment Failed Page
│       │
│       ├── cms/                # CMS Dashboard
│       │   ├── login/          # CMS Login
│       │   ├── dashboard/      # Dashboard
│       │   ├── users/          # User Management
│       │   ├── cards/          # Card Management
│       │   ├── packages/       # Package Management
│       │   ├── templates/      # Template Management
│       │   ├── payments/       # Payment Management
│       │   ├── coupons/        # Coupon Management
│       │   ├── settings/       # System Settings
│       │   ├── hooks/          # CMS React Hooks
│       │   └── cmsApi.js       # CMS API Client
│       │
│       ├── hooks/              # React Hooks
│       │   └── useMembershipStatus.js  # Membership Status Hook
│       │
│       └── utils/              # Frontend Utilities
│           └── auth.js         # Authentication Utilities
│
├── uploads/                    # Uploaded Files (ไม่ commit)
│   ├── images/                 # User Uploaded Images
│   └── cms/                    # CMS Uploaded Files
│       ├── settings/           # Settings Images
│       └── qr/                 # QR Code Images
│
├── json/                       # Generated JSON Files (ไม่ commit)
│   └── card-*.json             # Flex Message JSON Files
│
└── public/                     # Static Files
    └── (static assets)
```

## 🔌 API Endpoints

### Authentication Routes (`/api/auth`)

#### ลูกค้า (LINE Login)
- `POST /api/auth/line/liff-login` - เข้าสู่ระบบผ่าน LIFF
  - Body: `{ line_user_id, display_name, picture_url }`
  - Response: `{ token, user }`

- `POST /api/auth/logout` - ออกจากระบบ
  - Response: `{ message: "Logged out successfully" }`

#### แอดมิน (CMS Login)
- `POST /api/cms/login` - เข้าสู่ระบบ CMS
  - Body: `{ username, password }`
  - Response: `{ token, admin }`

### Template Routes (`/api/templates`)

- `GET /api/templates` - ดึง Templates ทั้งหมด
  - Query: `?category=business&is_active=true`
  - Response: `[{ id, name, description, preview_url, category, ... }]`

- `GET /api/templates/:id` - ดึง Template เดียว
  - Response: `{ id, name, flex_structure, ... }`

### Card Routes (`/api/cards`)

- `POST /api/create-card` - สร้างการ์ดใหม่ 🔒
  - Headers: `Authorization: Bearer {token}`
  - Body: `FormData { template_id, name, phone, email, company, position, website, address, image }`
  - Response: `{ cardId, liffUrl, message }`

- `GET /api/my-cards` - ดึงการ์ดของผู้ใช้ 🔒
  - Headers: `Authorization: Bearer {token}`
  - Query: `?search=keyword&limit=10&offset=0`
  - Response: `[{ id, name, phone, email, image_url, liff_url, created_at, ... }]`

- `GET /api/cards/:id` - ดึงการ์ดเดียว 🔒
  - Headers: `Authorization: Bearer {token}`
  - Response: `{ id, name, phone, email, flex_message, liff_url, ... }`

- `PUT /api/cards/:id` - แก้ไขการ์ด 🔒
  - Headers: `Authorization: Bearer {token}`
  - Body: `FormData { name, phone, email, ... }`
  - Response: `{ message, card }`

- `DELETE /api/cards/:id` - ลบการ์ด 🔒
  - Headers: `Authorization: Bearer {token}`
  - Response: `{ message }`

### Package Routes (`/api/packages`)

- `GET /api/packages` - ดึงแพ็กเกจทั้งหมด
  - Response: `[{ id, name, description, price, card_limit, duration_days, features, ... }]`

- `GET /api/packages/:id` - ดึงแพ็กเกจเดียว
  - Response: `{ id, name, price, card_limit, ... }`

- `GET /api/my-package` - ดึงแพ็กเกจปัจจุบันของผู้ใช้ 🔒
  - Headers: `Authorization: Bearer {token}`
  - Response: `{ package_name, cards_remaining, expires_at, ... }`

### Payment Routes (`/api/payment`)

- `POST /api/payment/create-intent` - สร้าง Payment Intent (Stripe) 🔒
  - Headers: `Authorization: Bearer {token}`
  - Body: `{ package_id }`
  - Response: `{ clientSecret, paymentId }`

- `POST /api/payment/qr-slip` - ชำระเงินผ่าน QR + สลิป 🔒
  - Headers: `Authorization: Bearer {token}`
  - Body: `FormData { package_id, slip_image }`
  - Response: `{ paymentId, status: "pending", message }`

- `POST /api/payment/webhook/stripe` - Stripe Webhook
  - Body: Stripe Event Object
  - Response: `{ received: true }`

- `GET /api/payment/history` - ประวัติการชำระเงิน 🔒
  - Headers: `Authorization: Bearer {token}`
  - Response: `[{ id, package_name, amount, payment_method, status, created_at, ... }]`

### LINE Pay Routes (`/api/linepay`)

- `POST /api/linepay/request` - สร้างคำขอชำระเงิน LINE Pay 🔒
  - Headers: `Authorization: Bearer {token}`
  - Body: `{ package_id }`
  - Response: `{ paymentUrl, transactionId }`

- `GET /api/linepay/confirm` - ยืนยันการชำระเงิน LINE Pay
  - Query: `?transactionId=xxx&orderId=xxx`
  - Response: `{ success: true, message }`

### Coupon Routes (`/api/coupons`)

- `POST /api/coupons/validate` - ตรวจสอบคูปอง 🔒
  - Headers: `Authorization: Bearer {token}`
  - Body: `{ code, package_id }`
  - Response: `{ valid: true, discount, final_price }`

### LIFF Routes

- `GET /api/liff-id` - ดึง LIFF ID
  - Response: `{ liffId: "xxx" }`

### CMS API Routes (`/api/cms`) 🔒👑

#### Dashboard
- `GET /api/cms/stats` - สถิติภาพรวม
  - Response: `{ total_users, total_cards, total_revenue, ... }`

#### User Management
- `GET /api/cms/users` - ดึงผู้ใช้ทั้งหมด
  - Query: `?search=keyword&limit=20&offset=0`
  - Response: `[{ id, line_user_id, display_name, email, created_at, ... }]`

- `GET /api/cms/users/:id` - ดึงข้อมูลผู้ใช้
- `PUT /api/cms/users/:id` - แก้ไขข้อมูลผู้ใช้
- `DELETE /api/cms/users/:id` - ลบผู้ใช้

#### Card Management
- `GET /api/cms/cards` - ดึงการ์ดทั้งหมด
- `GET /api/cms/cards/:id` - ดึงการ์ดเดียว
- `DELETE /api/cms/cards/:id` - ลบการ์ด

#### Package Management
- `GET /api/cms/packages` - ดึงแพ็กเกจทั้งหมด
- `POST /api/cms/packages` - สร้างแพ็กเกจใหม่
- `PUT /api/cms/packages/:id` - แก้ไขแพ็กเกจ
- `DELETE /api/cms/packages/:id` - ลบแพ็กเกจ

#### Template Management
- `GET /api/cms/templates` - ดึง Templates ทั้งหมด
- `POST /api/cms/templates` - สร้าง Template ใหม่
- `PUT /api/cms/templates/:id` - แก้ไข Template
- `DELETE /api/cms/templates/:id` - ลบ Template

#### Payment Management
- `GET /api/cms/payments` - ดึงรายการชำระเงินทั้งหมด
  - Query: `?status=pending&payment_method=qr_slip`
- `GET /api/cms/payments/:id` - ดึงรายละเอียดการชำระเงิน
- `PUT /api/cms/payments/:id/approve` - อนุมัติการชำระเงิน
- `PUT /api/cms/payments/:id/reject` - ปฏิเสธการชำระเงิน

#### Coupon Management
- `GET /api/cms/coupons` - ดึงคูปองทั้งหมด
- `POST /api/cms/coupons` - สร้างคูปองใหม่
- `PUT /api/cms/coupons/:id` - แก้ไขคูปอง
- `DELETE /api/cms/coupons/:id` - ลบคูปอง

#### System Settings
- `GET /api/cms/settings` - ดึงการตั้งค่าระบบ
- `PUT /api/cms/settings` - อัปเดตการตั้งค่าระบบ

**หมายเหตุ:**
- 🔒 = ต้องมี JWT Token (ผู้ใช้ทั่วไป)
- 👑 = ต้องมี Admin Token (แอดมิน CMS)

## 🗄️ Database Schema Overview

### ตารางหลัก (Main Tables)

#### users - ผู้ใช้งาน
เก็บข้อมูลผู้ใช้ที่เข้าสู่ระบบผ่าน LINE
```sql
- id (SERIAL PRIMARY KEY)
- line_user_id (VARCHAR UNIQUE) - LINE User ID
- display_name (VARCHAR) - ชื่อที่แสดง
- picture_url (TEXT) - URL รูปโปรไฟล์
- email (VARCHAR)
- phone (VARCHAR)
- role (VARCHAR) - customer, admin, super_admin
- created_at, updated_at (TIMESTAMP)
```

#### templates - Template การ์ด
เก็บ Template สำหรับสร้าง Flex Message
```sql
- id (SERIAL PRIMARY KEY)
- name (VARCHAR) - ชื่อ Template
- description (TEXT)
- flex_structure (JSONB) - โครงสร้าง Flex Message
- preview_url (TEXT) - URL รูป Preview
- category (VARCHAR) - business, personal, creative
- is_active (BOOLEAN)
- created_at, updated_at (TIMESTAMP)
```

#### cards - การ์ดที่สร้าง
เก็บข้อมูลการ์ดที่ผู้ใช้สร้าง
```sql
- id (SERIAL PRIMARY KEY)
- user_id (INTEGER FK → users.id)
- template_id (INTEGER FK → templates.id)
- name, phone, email, company, position, website, address
- image_url (TEXT) - URL รูปภาพ
- flex_message (JSONB) - Flex Message JSON
- liff_url (TEXT) - LIFF URL สำหรับแชร์
- share_count, view_count (INTEGER)
- created_at, updated_at (TIMESTAMP)
```

#### packages - แพ็กเกจ
เก็บข้อมูลแพ็กเกจที่มีขาย
```sql
- id (SERIAL PRIMARY KEY)
- name (VARCHAR) - Free, Basic, Premium
- description (TEXT)
- price (DECIMAL) - ราคา
- card_limit (INTEGER) - จำนวนการ์ดที่สร้างได้
- duration_days (INTEGER) - ระยะเวลา (วัน)
- features (JSONB) - ฟีเจอร์เพิ่มเติม
- is_active (BOOLEAN)
- created_at, updated_at (TIMESTAMP)
```

#### user_packages - แพ็กเกจของผู้ใช้
เก็บข้อมูลแพ็กเกจที่ผู้ใช้ซื้อ
```sql
- id (SERIAL PRIMARY KEY)
- user_id (INTEGER FK → users.id)
- package_id (INTEGER FK → packages.id)
- cards_remaining (INTEGER) - จำนวนการ์ดที่เหลือ
- expires_at (TIMESTAMP) - วันหมดอายุ
- is_active (BOOLEAN)
- purchased_at, created_at (TIMESTAMP)
```

#### payments - การชำระเงิน
เก็บประวัติการชำระเงิน
```sql
- id (SERIAL PRIMARY KEY)
- user_id (INTEGER FK → users.id)
- package_id (INTEGER FK → packages.id)
- amount (DECIMAL) - จำนวนเงิน
- payment_method (VARCHAR) - stripe, qr_slip, linepay
- status (VARCHAR) - pending, completed, failed, cancelled
- transaction_id (VARCHAR) - Transaction ID จาก Gateway
- stripe_payment_intent_id (VARCHAR)
- linepay_transaction_id (VARCHAR)
- metadata (JSONB)
- verified_by (INTEGER) - รหัสแอดมินที่ตรวจสอบ
- verified_at (TIMESTAMP)
- created_at, updated_at (TIMESTAMP)
```

#### payment_slips - สลิปการชำระเงิน
เก็บข้อมูลสลิปที่อัพโหลด (สำหรับ QR+สลิป)
```sql
- id (SERIAL PRIMARY KEY)
- payment_id (INTEGER FK → payments.id)
- slip_image_url (TEXT) - URL รูปสลิป
- uploaded_at (TIMESTAMP)
```

#### admins - แอดมิน CMS
เก็บข้อมูลแอดมินที่เข้าสู่ระบบ CMS
```sql
- id (SERIAL PRIMARY KEY)
- username (VARCHAR UNIQUE)
- password_hash (VARCHAR) - bcrypt hash
- full_name (VARCHAR)
- email (VARCHAR UNIQUE)
- role (VARCHAR) - admin, super_admin
- is_active (BOOLEAN)
- last_login_at (TIMESTAMP)
- created_at, updated_at (TIMESTAMP)
```

#### coupons - คูปองส่วนลด
เก็บข้อมูลคูปองส่วนลด
```sql
- id (SERIAL PRIMARY KEY)
- code (VARCHAR UNIQUE) - รหัสคูปอง
- discount_type (VARCHAR) - percentage, fixed
- discount_value (DECIMAL) - ค่าส่วนลด
- min_purchase (DECIMAL) - ยอดซื้อขั้นต่ำ
- max_uses (INTEGER) - จำนวนครั้งที่ใช้ได้
- used_count (INTEGER) - จำนวนครั้งที่ใช้แล้ว
- expires_at (TIMESTAMP)
- is_active (BOOLEAN)
- created_at (TIMESTAMP)
```

### ความสัมพันธ์ระหว่างตาราง (Relationships)
- **users → cards** (1:N) - ผู้ใช้หนึ่งคนสร้างได้หลายการ์ด
- **templates → cards** (1:N) - Template หนึ่งตัวใช้ได้หลายการ์ด
- **users → user_packages** (1:N) - ผู้ใช้หนึ่งคนมีได้หลายแพ็กเกจ
- **packages → user_packages** (1:N) - แพ็กเกจหนึ่งตัวถูกซื้อได้หลายครั้ง
- **users → payments** (1:N) - ผู้ใช้หนึ่งคนชำระเงินได้หลายครั้ง
- **packages → payments** (1:N) - แพ็กเกจหนึ่งตัวมีการชำระเงินได้หลายครั้ง
- **payments → payment_slips** (1:1) - การชำระเงินหนึ่งครั้งมีสลิปหนึ่งใบ

**ดูรายละเอียดเพิ่มเติม:** `database/schema-full.sql`

## 🎯 วิธีใช้งาน

### สำหรับผู้ใช้งาน (Customer)

#### 1. เข้าสู่ระบบ
1. เปิดแอปพลิเคชันผ่าน LINE หรือไปที่ `/liff/login`
2. กดปุ่ม "เข้าสู่ระบบด้วย LINE"
3. อนุญาตให้แอปเข้าถึงข้อมูล LINE Profile
4. ระบบจะสร้างบัญชีอัตโนมัติและเข้าสู่หน้า Home

#### 2. เลือกและซื้อแพ็กเกจ
1. ไปที่หน้า "แพ็กเกจ" (`/packages`)
2. เลือกแพ็กเกจที่ต้องการ (Free, Basic, Premium)
3. กดปุ่ม "ซื้อเลย"
4. เลือกวิธีชำระเงิน:
   - **Stripe**: กรอกข้อมูลบัตรเครดิต/เดบิต
   - **QR + สลิป**: สแกน QR Code และอัพโหลดสลิป (รอแอดมินอนุมัติ)
   - **LINE Pay**: ชำระผ่าน LINE Pay
5. รอการยืนยันการชำระเงิน
6. เมื่อชำระเงินสำเร็จ สิทธิ์จะถูกเพิ่มให้อัตโนมัติ

#### 3. สร้างการ์ด
1. ไปที่หน้า "สร้างการ์ด" (`/create`)
2. เลือก Template ที่ต้องการ
3. กรอกข้อมูล:
   - ชื่อ-นามสกุล
   - เบอร์โทรศัพท์
   - อีเมล
   - บริษัท (ถ้ามี)
   - ตำแหน่ง (ถ้ามี)
   - เว็บไซต์ (ถ้ามี)
   - ที่อยู่ (ถ้ามี)
4. อัพโหลดรูปภาพ (รองรับ JPG, PNG, GIF, HEIC)
5. กดปุ่ม "สร้างการ์ด"
6. รอระบบประมวลผล (แปลงรูปเป็น WebP)
7. จะได้ LIFF URL สำหรับแชร์

#### 4. จัดการการ์ด
1. ไปที่หน้า "การ์ดของฉัน" (`/my-cards`)
2. ดูรายการการ์ดทั้งหมดที่สร้างไว้
3. ใช้ Search Box เพื่อค้นหาการ์ด
4. คลิกที่การ์ดเพื่อดูรายละเอียด
5. คัดลอก LIFF URL เพื่อแชร์
6. ลบการ์ดที่ไม่ต้องการ (ถ้าต้องการ)

#### 5. แชร์การ์ดผ่าน LINE
1. คัดลอก LIFF URL จากหน้าการ์ด
2. แชร์ลิงค์ผ่าน LINE Chat, Group, หรือ Timeline
3. เมื่อผู้รับเปิดลิงค์:
   - จะเห็น Preview ของการ์ด
   - สามารถกดปุ่ม "แชร์" เพื่อส่งต่อเป็น Flex Message
   - Flex Message จะแสดงข้อมูลนามบัตรอย่างสวยงาม

#### 6. ดูโปรไฟล์และสิทธิ์
1. ไปที่หน้า "โปรไฟล์" (`/profile`)
2. ดูข้อมูลส่วนตัว
3. ดูแพ็กเกจปัจจุบัน
4. ดูจำนวนการ์ดที่เหลือ
5. ดูวันหมดอายุของแพ็กเกจ

### สำหรับแอดมิน (CMS)

#### 1. เข้าสู่ระบบ CMS
1. ไปที่ `/cms/login`
2. กรอก Username และ Password
3. กดปุ่ม "เข้าสู่ระบบ"
4. เข้าสู่หน้า Dashboard

#### 2. จัดการผู้ใช้
1. ไปที่ "จัดการผู้ใช้" (`/cms/users`)
2. ดูรายการผู้ใช้ทั้งหมด
3. ค้นหาผู้ใช้ด้วยชื่อหรืออีเมล
4. คลิกเพื่อดูรายละเอียด
5. แก้ไขข้อมูลหรือลบผู้ใช้ (ถ้าจำเป็น)

#### 3. จัดการการ์ด
1. ไปที่ "จัดการการ์ด" (`/cms/cards`)
2. ดูการ์ดทั้งหมดในระบบ
3. ค้นหาการ์ดด้วยชื่อหรือเบอร์โทร
4. ดูรายละเอียดการ์ด
5. ลบการ์ดที่ไม่เหมาะสม (ถ้าจำเป็น)

#### 4. จัดการแพ็กเกจ
1. ไปที่ "จัดการแพ็กเกจ" (`/cms/packages`)
2. ดูรายการแพ็กเกจทั้งหมด
3. กดปุ่ม "เพิ่มแพ็กเกจ" เพื่อสร้างใหม่
4. แก้ไขราคา, จำนวนการ์ด, ระยะเวลา
5. เปิด/ปิดการใช้งานแพ็กเกจ

#### 5. จัดการ Template
1. ไปที่ "จัดการ Template" (`/cms/templates`)
2. ดูรายการ Template ทั้งหมด
3. กดปุ่ม "เพิ่ม Template" เพื่อสร้างใหม่
4. อัพโหลดรูป Preview
5. กรอก Flex Message JSON Structure
6. แก้ไขหรือลบ Template

#### 6. อนุมัติการชำระเงิน
1. ไปที่ "จัดการการชำระเงิน" (`/cms/payments`)
2. กรองรายการที่ status = "pending"
3. คลิกดูรายละเอียดการชำระเงิน
4. ดูรูปสลิปที่ผู้ใช้อัพโหลด
5. ตรวจสอบความถูกต้อง
6. กดปุ่ม "อนุมัติ" หรือ "ปฏิเสธ"
7. ระบบจะอัปเดตสิทธิ์ให้ผู้ใช้อัตโนมัติ

#### 7. จัดการคูปอง
1. ไปที่ "จัดการคูปอง" (`/cms/coupons`)
2. กดปุ่ม "สร้างคูปอง"
3. กรอกรหัสคูปอง
4. ตั้งค่าส่วนลด (% หรือจำนวนเงิน)
5. ตั้งวันหมดอายุ
6. เปิด/ปิดการใช้งาน

#### 8. ดูรายงานและสถิติ
1. ไปที่ "Dashboard" (`/cms/dashboard`)
2. ดูสถิติภาพรวม:
   - จำนวนผู้ใช้ทั้งหมด
   - จำนวนการ์ดที่สร้าง
   - รายได้ทั้งหมด
   - การชำระเงินที่รอตรวจสอบ
3. ดูกราฟและแผนภูมิ

#### 9. ตั้งค่าระบบ
1. ไปที่ "ตั้งค่า" (`/cms/settings`)
2. อัปเดตข้อมูลบริษัท
3. ตั้งค่า QR Code สำหรับชำระเงิน
4. ตั้งค่าการแจ้งเตือน
5. บันทึกการเปลี่ยนแปลง

## 🔒 ความปลอดภัย (Security)

### Authentication & Authorization
- **LINE Login** - ผู้ใช้เข้าสู่ระบบผ่าน LINE Account (OAuth 2.0)
- **JWT Token** - ใช้ JWT สำหรับการยืนยันตัวตนและสิทธิ์การเข้าถึง
- **bcrypt** - เข้ารหัสรหัสผ่านแอดมินด้วย bcrypt (rounds ≥ 10)
- **Token Expiry** - JWT Token หมดอายุภายใน 24 ชั่วโมง
- **Role-Based Access Control** - แบ่งสิทธิ์ตาม Role (customer, admin, super_admin)

### Data Protection
- **HTTPS Only** - บังคับใช้ HTTPS สำหรับ Production
- **SQL Injection Prevention** - ใช้ Parameterized Queries ทั้งหมด
- **XSS Prevention** - Input Validation และ Output Encoding
- **CSRF Protection** - ป้องกัน Cross-Site Request Forgery
- **Data Encryption** - เข้ารหัสข้อมูลสำคัญด้วย AES-256
- **PDPA Compliance** - ปฏิบัติตามพ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล

### File Upload Security
- **File Type Validation** - ตรวจสอบประเภทไฟล์ (JPG, PNG, GIF, HEIC เท่านั้น)
- **File Size Limit** - จำกัดขนาดไฟล์ไม่เกิน 5MB
- **File Name Sanitization** - ทำความสะอาดชื่อไฟล์ป้องกัน Path Traversal
- **Image Processing** - แปลงรูปภาพเป็น WebP เพื่อความปลอดภัย
- **Virus Scanning** - สแกนไฟล์ก่อนอัพโหลด (แนะนำ)

### API Security
- **Rate Limiting** - จำกัดจำนวน Request (100 requests/min/IP)
- **CORS Configuration** - ตั้งค่า CORS อย่างเหมาะสม
- **Security Headers** - ใช้ Security Headers (X-Frame-Options, X-Content-Type-Options, etc.)
- **Request Timeout** - ตั้งค่า Timeout เพื่อป้องกัน Slowloris Attack
- **Input Validation** - ตรวจสอบข้อมูลทุก Input

### Payment Security
- **PCI DSS Compliance** - ปฏิบัติตามมาตรฐาน PCI DSS
- **Stripe Integration** - ใช้ Stripe API ที่ปลอดภัย (ไม่เก็บข้อมูลบัตร)
- **LINE Pay Integration** - ใช้ LINE Pay API อย่างปลอดภัย
- **Payment Verification** - ตรวจสอบการชำระเงินผ่าน Webhook
- **Transaction Logging** - บันทึก Log การชำระเงินทั้งหมด

### Infrastructure Security
- **Environment Variables** - เก็บข้อมูลสำคัญใน .env (ไม่ commit)
- **Database Backup** - สำรองข้อมูลทุกวัน
- **Error Handling** - ไม่แสดง Stack Trace ให้ผู้ใช้
- **Logging & Monitoring** - บันทึก Log และติดตามการใช้งาน
- **Regular Updates** - อัปเดต Dependencies เป็นประจำ

## 📝 หมายเหตุสำคัญ

### การตั้งค่า LINE
- ต้องสร้าง LINE Messaging API Channel ใน [LINE Developers Console](https://developers.line.biz/)
- ต้องสร้าง LIFF App และตั้งค่า Endpoint URL
- ต้องมี `LIFF_ID` และ `LIFF_LOGIN_ID` ที่ถูกต้องในไฟล์ `.env`
- ต้องตั้งค่า Callback URL สำหรับ LINE Login

### การตั้งค่า Payment Gateway
- **Stripe**: ต้องสร้างบัญชี Stripe และได้ API Keys (ดู `docs/PAYMENT_GATEWAY_SETUP.md`)
- **LINE Pay**: ต้องสมัครและได้ Channel ID, Channel Secret (ดู `docs/LINE_PAY_SETUP.md`)
- **QR Code**: ต้องตั้งค่า PromptPay ID ในหน้า CMS Settings

### การจัดเก็บไฟล์
- รูปภาพที่อัพโหลดจะถูกเก็บใน `uploads/images/`
- รูปภาพจะถูกแปลงเป็น WebP อัตโนมัติเพื่อลดขนาด
- Flex Message JSON จะถูกสร้างใน `json/`
- สามารถเชื่อมต่อ Google Drive สำหรับ Backup (Optional)

### Database
- ต้องสร้าง Database `line_flex_db` ใน PostgreSQL
- รัน `database/schema-full.sql` เพื่อสร้างตารางทั้งหมด
- รัน Migration files ตามลำดับ (ดู `database/README.md`)
- ตั้งค่า Database Connection ใน `.env`

### Production Deployment
- ต้องใช้ HTTPS สำหรับ Production
- ตั้งค่า Environment Variables ให้ถูกต้อง
- Build Frontend ด้วย `npm run build`
- ใช้ PM2 หรือ Process Manager อื่นๆ สำหรับรัน Server
- ตั้งค่า Nginx หรือ Reverse Proxy (ดู `docs/DEPLOY_VERIFY.md`)
- ตั้งค่า Database Backup อัตโนมัติ
- ติดตั้ง SSL Certificate (Let's Encrypt แนะนำ)

### Limitations
- ขนาดไฟล์อัพโหลดไม่เกิน 5MB
- รองรับไฟล์รูปภาพเท่านั้น (JPG, PNG, GIF, HEIC)
- Flex Message มีขนาดจำกัดตาม LINE API Specification
- Rate Limit: 100 requests/minute/IP

## ❓ FAQ (คำถามที่พบบ่อย)

### Q1: ผู้ใช้ต้องมี LINE Account ถึงจะใช้งานได้หรือไม่?
**A:** ใช่ครับ ระบบใช้ LINE Login เป็นหลัก ผู้ใช้ต้องมี LINE Account และเข้าสู่ระบบผ่าน LIFF

### Q2: รองรับการอัพโหลดรูปภาพประเภทไหนบ้าง?
**A:** รองรับ JPG, JPEG, PNG, GIF, และ HEIC โดยระบบจะแปลงเป็น WebP อัตโนมัติเพื่อลดขนาดไฟล์

### Q3: ขนาดไฟล์รูปภาพสูงสุดเท่าไหร่?
**A:** ขนาดไฟล์สูงสุด 5MB (สามารถปรับได้ใน `.env` → `MAX_FILE_SIZE`)

### Q4: สามารถสร้างการ์ดได้กี่ใบ?
**A:** ขึ้นอยู่กับแพ็กเกจที่ซื้อ:
- **Free**: จำกัดตามที่กำหนด (เช่น 3 ใบ)
- **Basic**: เช่น 20 ใบ
- **Premium**: เช่น 100 ใบ หรือไม่จำกัด

### Q5: แพ็กเกจมีอายุการใช้งานหรือไม่?
**A:** ใช่ครับ แต่ละแพ็กเกจมีอายุการใช้งาน (เช่น 30 วัน, 90 วัน, 365 วัน) ตามที่กำหนดในแพ็กเกจ

### Q6: ถ้าแพ็กเกจหมดอายุแล้วการ์ดที่สร้างไว้จะหายไหม?
**A:** ไม่หายครับ การ์ดที่สร้างไว้แล้วจะยังคงอยู่ แต่จะไม่สามารถสร้างการ์ดใหม่ได้จนกว่าจะซื้อแพ็กเกจใหม่

### Q7: รองรับการชำระเงินช่องทางไหนบ้าง?
**A:** รองรับ 3 ช่องทาง:
1. **Stripe** - บัตรเครดิต/เดบิต (ชำระเงินทันที)
2. **QR Code + สลิป** - สแกน QR และอัพโหลดสลิป (รอแอดมินอนุมัติ)
3. **LINE Pay** - ชำระผ่าน LINE Pay (ชำระเงินทันที)

### Q8: ถ้าชำระเงินผ่าน QR+สลิป ต้องรอนานแค่ไหน?
**A:** ขึ้นอยู่กับแอดมินตรวจสอบและอนุมัติ ปกติภายใน 24 ชั่วโมง (ในวันทำการ)

### Q9: สามารถแก้ไขการ์ดที่สร้างแล้วได้หรือไม่?
**A:** ปัจจุบันยังไม่รองรับการแก้ไข แต่สามารถลบและสร้างใหม่ได้

### Q10: Flex Message คืออะไร?
**A:** Flex Message คือรูปแบบข้อความที่ปรับแต่งได้บน LINE ซึ่งสามารถแสดงข้อมูลในรูปแบบที่สวยงามและมีปุ่มกดได้

### Q11: LIFF คืออะไร?
**A:** LIFF (LINE Front-end Framework) คือกรอบงานสำหรับสร้างเว็บแอปพลิเคชันที่ทำงานภายใน LINE App

### Q12: สามารถใช้งานบน Browser ทั่วไปได้หรือไม่?
**A:** ได้ครับ แต่บางฟีเจอร์ (เช่น การแชร์ Flex Message) จะต้องเปิดใน LINE App เท่านั้น

### Q13: รองรับหลายภาษาหรือไม่?
**A:** ปัจจุบันรองรับภาษาไทยเท่านั้น (สามารถเพิ่ม Multi-language ได้ในอนาคต)

### Q14: ข้อมูลส่วนบุคคลปลอดภัยหรือไม่?
**A:** ปลอดภัยครับ ระบบปฏิบัติตาม PDPA และใช้มาตรการรักษาความปลอดภัยตามมาตรฐาน (ดูเพิ่มเติมในส่วน [Security](#-ความปลอดภัย-security))

### Q15: สามารถ Export ข้อมูลการ์ดได้หรือไม่?
**A:** ปัจจุบันยังไม่รองรับ แต่สามารถพัฒนาเพิ่มเติมได้

### Q16: มี API Documentation หรือไม่?
**A:** มีครับ ดูได้ในส่วน [API Endpoints](#-api-endpoints) หรือใช้ Postman Collection (ถ้ามี)

### Q17: สามารถใช้ Google Drive เก็บรูปภาพได้หรือไม่?
**A:** ได้ครับ ระบบรองรับการอัพโหลดไปยัง Google Drive (ตั้งค่าใน `.env` → `GOOGLE_DRIVE_FOLDER_ID`)

### Q18: ถ้าต้องการเพิ่ม Template ใหม่ต้องทำอย่างไร?
**A:** แอดมินสามารถเพิ่ม Template ผ่าน CMS ได้ หรือใช้ Script `scripts/add-custom-template.js`

### Q19: รองรับการใช้งานบน Mobile App หรือไม่?
**A:** ปัจจุบันเป็น Web Application ที่ทำงานผ่าน Browser และ LINE App (LIFF) ยังไม่มี Native Mobile App

### Q20: มี Rate Limit หรือไม่?
**A:** มีครับ จำกัดที่ 100 requests ต่อนาทีต่อ IP Address เพื่อป้องกัน DDoS

## 🐛 Troubleshooting (แก้ไขปัญหา)

### ปัญหา Database Connection

**อาการ:** ไม่สามารถเชื่อมต่อ Database ได้

**วิธีแก้:**
1. ตรวจสอบว่า PostgreSQL กำลังรันอยู่
   ```bash
   # Windows
   pg_ctl status -D "C:\Program Files\PostgreSQL\16\data"
   
   # Linux/Mac
   sudo systemctl status postgresql
   ```
2. ตรวจสอบว่า Database `line_flex_db` ถูกสร้างแล้ว
   ```sql
   psql -U postgres -c "\l"
   ```
3. ตรวจสอบ Username, Password, Host, Port ใน `.env`
4. ตรวจสอบ Firewall ว่าเปิด Port 5432 หรือไม่
5. ลองเชื่อมต่อด้วย psql command line
   ```bash
   psql -U postgres -d line_flex_db
   ```

### ปัญหา LIFF Error

**อาการ:** LIFF ไม่ทำงานหรือเกิด Error

**วิธีแก้:**
1. ตรวจสอบ `LIFF_ID` ใน `.env` ว่าถูกต้อง
2. ตรวจสอบ LIFF App ใน [LINE Developers Console](https://developers.line.biz/)
   - ตรวจสอบ Endpoint URL ว่าตรงกับ BASE_URL
   - ตรวจสอบ Scope ที่เลือก (profile, openid)
3. ตรวจสอบว่าใช้ HTTPS ใน Production
4. ลองเปิดใน LINE App (ไม่ใช่ Browser)
5. ตรวจสอบ Console Log ใน Browser DevTools

### ปัญหา File Upload Error

**อาการ:** อัพโหลดรูปภาพไม่ได้

**วิธีแก้:**
1. ตรวจสอบว่าโฟลเดอร์ `uploads/images/` มีอยู่และมีสิทธิ์เขียน
   ```bash
   # Linux/Mac
   chmod 755 uploads/images/
   
   # Windows
   # ตรวจสอบ Properties > Security
   ```
2. ตรวจสอบขนาดไฟล์ (ต้องไม่เกิน 5MB)
3. ตรวจสอบประเภทไฟล์ (jpg, jpeg, png, gif, heic เท่านั้น)
4. ตรวจสอบว่าติดตั้ง `sharp` และ `heic-convert` แล้ว
   ```bash
   npm install sharp heic-convert
   ```
5. ตรวจสอบ Log ใน Console หรือ Terminal

### ปัญหา Payment Error

**อาการ:** การชำระเงินไม่สำเร็จ

**วิธีแก้:**

**Stripe:**
1. ตรวจสอบ `STRIPE_SECRET_KEY` และ `STRIPE_PUBLISHABLE_KEY` ใน `.env`
2. ตรวจสอบว่าใช้ Test Keys หรือ Live Keys
3. ตรวจสอบ Webhook Endpoint ใน Stripe Dashboard
4. ตรวจสอบ Webhook Secret (`STRIPE_WEBHOOK_SECRET`)
5. ดู Log ใน Stripe Dashboard > Developers > Logs

**LINE Pay:**
1. ตรวจสอบ `LINEPAY_CHANNEL_ID` และ `LINEPAY_CHANNEL_SECRET`
2. ตรวจสอบว่าใช้ Sandbox หรือ Production
3. ตรวจสอบ Callback URL ว่าถูกต้อง
4. ดู Log ใน LINE Pay Console

**QR + สลิป:**
1. ตรวจสอบว่าตั้งค่า QR Code ใน CMS Settings แล้ว
2. ตรวจสอบว่าแอดมินอนุมัติการชำระเงินแล้ว
3. ตรวจสอบว่าอัพโหลดสลิปสำเร็จ

### ปัญหา Build Error (Frontend)

**อาการ:** `npm run build` ล้มเหลว

**วิธีแก้:**
1. ลบ `node_modules` และ `package-lock.json` แล้วติดตั้งใหม่
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```
2. ลบ `.next` folder ใน frontend
   ```bash
   rm -rf frontend/.next
   ```
3. เพิ่ม Memory สำหรับ Node.js
   ```bash
   npm run build  # ใช้ --max-old-space-size=1536 อยู่แล้ว
   ```
4. ตรวจสอบ Error Message และแก้ไข Syntax Error
5. ตรวจสอบว่า Next.js version ตรงกับ package.json

### ปัญหา Port Already in Use

**อาการ:** Error: listen EADDRINUSE :::3000

**วิธีแก้:**
1. หา Process ที่ใช้ Port 3000
   ```bash
   # Windows
   netstat -ano | findstr :3000
   taskkill /PID <PID> /F
   
   # Linux/Mac
   lsof -i :3000
   kill -9 <PID>
   ```
2. เปลี่ยน Port ใน `.env`
   ```
   PORT=3001
   ```
3. ถ้าใช้ PM2 ให้ restart แทน start ใหม่
   ```bash
   pm2 restart linebizcard
   ```

### ปัญหา JWT Token Invalid

**อาการ:** Token หมดอายุหรือไม่ถูกต้อง

**วิธีแก้:**
1. ตรวจสอบ `JWT_SECRET` ใน `.env`
2. ลบ Token ใน LocalStorage และ Login ใหม่
3. ตรวจสอบว่า Token ไม่หมดอายุ (24 ชั่วโมง)
4. ตรวจสอบ Middleware `auth.js`

### ปัญหา Rate Limit Exceeded

**อาการ:** Error 429 Too Many Requests

**วิธีแก้:**
1. รอ 1 นาทีแล้วลองใหม่
2. ตรวจสอบว่าไม่มี Loop ที่เรียก API ซ้ำๆ
3. ปรับค่า Rate Limit ใน `middleware/rateLimit.js` (ถ้าจำเป็น)
4. ใช้ IP Whitelist สำหรับ Admin

### ปัญหาอื่นๆ

**ถ้ายังแก้ไขไม่ได้:**
1. ตรวจสอบ Log ใน Terminal/Console
2. ตรวจสอบ Browser DevTools > Console
3. ตรวจสอบ Network Tab ว่า API ตอบกลับอะไร
4. ดู Error Stack Trace
5. ค้นหา Error Message ใน Google
6. ถามใน LINE Developers Community
7. ติดต่อผู้พัฒนา (Boss Phiriyakorn)

## ⚡ Performance Optimization

### Backend Optimization
- **Database Indexing** - สร้าง Index ที่เหมาะสมสำหรับ Query ที่ใช้บ่อย
- **Connection Pooling** - ใช้ PostgreSQL Connection Pool
- **Caching** - Cache ข้อมูลที่ไม่เปลี่ยนแปลงบ่อย (เช่น Templates)
- **Compression** - ใช้ Gzip Compression สำหรับ Response
- **Rate Limiting** - จำกัด Request เพื่อป้องกัน Overload

### Frontend Optimization
- **Image Optimization** - แปลงรูปเป็น WebP เพื่อลดขนาด
- **Code Splitting** - แบ่ง JavaScript Bundle เป็นส่วนๆ
- **Lazy Loading** - โหลดข้อมูลเมื่อจำเป็นเท่านั้น
- **Static Generation** - ใช้ Next.js Static Generation สำหรับหน้าที่เหมาะสม
- **CDN** - ใช้ CDN สำหรับ Static Assets

### Database Optimization
- **Query Optimization** - เขียน Query ให้มีประสิทธิภาพ
- **Pagination** - ใช้ Pagination สำหรับข้อมูลจำนวนมาก
- **Batch Operations** - รวม Query หลายๆ อันเป็น Batch
- **Regular Maintenance** - VACUUM และ ANALYZE Database เป็นประจำ

## 📚 Best Practices

### Development
- ใช้ Git Flow สำหรับการจัดการ Branch
- เขียน Commit Message ที่ชัดเจน
- ทำ Code Review ก่อน Merge
- เขียน Unit Tests สำหรับ Business Logic
- ใช้ ESLint และ Prettier สำหรับ Code Quality

### Security
- อย่า Commit `.env` หรือไฟล์ที่มีข้อมูลสำคัญ
- ใช้ Environment Variables สำหรับ Sensitive Data
- อัปเดต Dependencies เป็นประจำ
- ตรวจสอบ Security Vulnerabilities ด้วย `npm audit`
- ใช้ HTTPS ใน Production เสมอ

### Database
- สำรองข้อมูลเป็นประจำ (Daily Backup)
- ใช้ Migration Scripts สำหรับการเปลี่ยนแปลง Schema
- อย่าลบข้อมูลโดยตรง ให้ใช้ Soft Delete (is_active = false)
- ตรวจสอบ Slow Queries และปรับปรุง

### API Design
- ใช้ RESTful API Conventions
- ส่ง HTTP Status Code ที่เหมาะสม
- ใช้ Pagination สำหรับ List Endpoints
- ใส่ API Version (เช่น `/api/v1/`)
- เขียน API Documentation ที่ชัดเจน

### Error Handling
- จัดการ Error อย่างเหมาะสม
- ไม่แสดง Stack Trace ให้ผู้ใช้
- Log Error สำหรับ Debug
- ส่ง Error Message ที่เข้าใจง่าย
- ใช้ Try-Catch Block ครอบคลุม

### File Upload
- ตรวจสอบ File Type และ Size
- ใช้ Unique Filename เพื่อป้องกัน Overwrite
- Sanitize Filename เพื่อป้องกัน Path Traversal
- Scan Virus ก่อนบันทึก (แนะนำ)
- จำกัดจำนวน Files ที่อัพโหลดพร้อมกัน

### Payment Processing
- ตรวจสอบ Payment Status ผ่าน Webhook
- บันทึก Log การชำระเงินทั้งหมด
- ใช้ Idempotency Key เพื่อป้องกัน Duplicate Payment
- ตรวจสอบ Amount และ Currency
- ทดสอบใน Test/Sandbox Mode ก่อน Production

## 🔄 Version History

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 2026-02-13 | Initial Release |
| - | - | - ระบบเข้าสู่ระบบผ่าน LINE |
| - | - | - ระบบสร้างและจัดการการ์ด |
| - | - | - ระบบแพ็กเกจและการชำระเงิน |
| - | - | - ระบบ CMS สำหรับแอดมิน |
| - | - | - รองรับ Stripe, QR+สลิป, LINE Pay |

## 🤝 Contributing

ถ้าต้องการมีส่วนร่วมในการพัฒนา:

1. Fork โปรเจกต์
2. สร้าง Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit การเปลี่ยนแปลง (`git commit -m 'Add some AmazingFeature'`)
4. Push ไปยัง Branch (`git push origin feature/AmazingFeature`)
5. เปิด Pull Request

## 📞 Support & Contact

- **Developer**: Boss Phiriyakorn
- **Email**: [your-email@example.com]
- **LINE**: [@your-line-id]
- **GitHub**: [https://github.com/your-username]

## 📚 เอกสารเพิ่มเติม

- [Software Requirements Specification (SRS)](./SRS_PROMPT_TEMPLATE.md) - เอกสารกำหนดความต้องการของระบบ
- [Payment Gateway Setup](./docs/PAYMENT_GATEWAY_SETUP.md) - คู่มือตั้งค่า Stripe
- [LINE Pay Setup](./docs/LINE_PAY_SETUP.md) - คู่มือตั้งค่า LINE Pay
- [Deployment Guide](./docs/DEPLOY_VERIFY.md) - คู่มือการ Deploy และตรวจสอบ
- [Database Migration Guide](./database/README.md) - คู่มือการจัดการ Database

## 🙏 Acknowledgments

- [LINE Developers](https://developers.line.biz/) - LINE Messaging API & LIFF SDK
- [Stripe](https://stripe.com/) - Payment Processing
- [Next.js](https://nextjs.org/) - React Framework
- [PostgreSQL](https://www.postgresql.org/) - Database
- [Sharp](https://sharp.pixelplumbing.com/) - Image Processing

## 📄 License

MIT License

Copyright (c) 2026 Boss Phiriyakorn

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

---

**Made with ❤️ by Boss Phiriyakorn**

**Last Updated:** February 13, 2026
