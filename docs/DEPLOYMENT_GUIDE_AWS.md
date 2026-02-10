# คู่มือ Deploy โปรเจค Line Biz Card บน AWS (แบบจับมือทำ)

โดเมน: **linebizcard.tectony.co.th**  
Repository: **https://github.com/BossPhiriyakorn/linebizcard.git** (Branch: **V.3**)

---

## สิ่งที่ต้องเตรียมก่อนเริ่ม

| รายการ | สถานะ |
|--------|--------|
| บัญชี AWS พร้อมใช้ | ✅ |
| โปรเจคบน Git (branch V.3) | ✅ |
| โดเมน linebizcard.tectony.co.th (จัดการ DNS ได้) | ✅ |
| ค่า LINE Developers (Channel ID, Secret, LIFF ID ฯลฯ) | เตรียมไว้ |
| ค่า Stripe / Brevo / อื่นๆ ตาม .env | เตรียมไว้ |

---

## สรุปภาพรวมการ Deploy

1. **สร้าง EC2** (เซิร์ฟเวอร์ Ubuntu) และเข้าด้วย SSH  
2. **ติดตั้งโหนด, PostgreSQL, Nginx, PM2** บน EC2  
3. **สร้างฐานข้อมูล** และรัน schema  
4. **โคลนโปรเจคจาก Git (branch V.3)** และตั้งค่า .env  
5. **Build โปรเจค** แล้วรันด้วย PM2  
6. **ติดตั้ง SSL (HTTPS)** ด้วย Certbot  
7. **ตั้งค่า DNS** ให้โดเมนชี้มาที่ EC2  
8. **อัปเดต LINE / LIFF** ให้ใช้โดเมนใหม่  

---

# ขั้นตอนที่ 1: สร้าง EC2 บน AWS

## 1.1 เข้า EC2 และสร้าง Instance

1. เข้า **AWS Console** → **EC2** → **Instances** → **Launch instance**
2. ตั้งค่า:
   - **Name:** `linebizcard-server` (หรือชื่ออื่น)
   - **OS:** **Ubuntu Server 22.04 LTS**
   - **Instance type:** ขั้นต่ำ `t3.small` (หรือ `t3.medium` ถ้าคาดว่ามี traffic สูง)
   - **Key pair:** สร้างใหม่หรือใช้คู่เดิม แล้ว **ดาวน์โหลดไฟล์ .pem** เก็บไว้
   - **Network:** เปิด **Allow HTTPS** และ **Allow HTTP** จากอินเทอร์เน็ต (สำหรับขอ SSL และเข้าเว็บ)
   - **Storage:** 20–30 GB ก็พอ

3. กด **Launch instance**

## 1.2 เปิดพอร์ตใน Security Group (ถ้ายังไม่ได้เปิด)

- EC2 → **Security Groups** → เลือกกลุ่มที่ผูกกับ instance นี้
- **Inbound rules** → **Edit** → เพิ่มกฎ:

| Type   | Port | Source     |
|--------|------|------------|
| SSH    | 22   | My IP (หรือ 0.0.0.0/0 ถ้าจำเป็น) |
| HTTP   | 80   | 0.0.0.0/0  |
| HTTPS  | 443  | 0.0.0.0/0  |

บันทึก **Public IP** หรือ **Public DNS** ของ EC2 (เช่น `3.xxx.xxx.xxx` หรือ `ec2-xx-xx-xx-xx.ap-southeast-1.compute.amazonaws.com`) ไว้ใช้ในขั้นตอนถัดไป  

**แนะนำ (ไม่บังคับ):** ถ้าไม่ต้องการให้ IP เปลี่ยนเมื่อปิด/เปิด instance ใหม่ ให้ไปที่ EC2 → **Elastic IPs** → **Allocate** → ได้ IP ใหม่ → **Actions** → **Associate** เลือก instance นี้ แล้วใช้ IP นี้ไปตั้งค่า DNS แทน (ในขั้นตอนที่ 7)

---

# ขั้นตอนที่ 2: เข้าเซิร์ฟเวอร์ด้วย SSH

## 2.1 บน Windows (PowerShell หรือ CMD)

เปลี่ยนไปโฟลเดอร์ที่เก็บไฟล์ `.pem` แล้วรัน (แก้ path และชื่อ key ให้ตรงกับของคุณ):

```powershell
# ตัวอย่าง: ไฟล์ key อยู่ที่ Desktop
cd $env:USERPROFILE\Desktop
ssh -i "your-key-name.pem" ubuntu@3.xxx.xxx.xxx
```

- แทน `your-key-name.pem` ด้วยชื่อไฟล์ key จริง  
- แทน `3.xxx.xxx.xxx` ด้วย **Public IP** ของ EC2  
- ถ้าถามว่า "Are you sure you want to continue connecting?" พิมพ์ `yes` แล้ว Enter  

เมื่อเข้าได้จะเห็นพรอมต์แบบ `ubuntu@ip-xxx-xxx-xxx-xxx:~$`

### แก้ปัญหา: SSH Connection timed out

ถ้ารัน `ssh -i "..." ubuntu@ec2-xxx...` แล้วขึ้น **Connection timed out** หรือ **Connection to ... port 22 timed out** แปลว่าคอมคุณเชื่อมถึง EC2 ไม่ได้ ทำตามนี้:

1. **เปิดพอร์ต 22 (SSH) ใน Security Group**
   - เข้า **AWS Console** → **EC2** → **Instances** → คลิก instance ที่ใช้ (เช่น `linebizcard-server`)
   - ไปที่แท็บ **Security** → คลิก **Security group** (ลิงก์ชื่อกลุ่ม เช่น `sg-0abc123...`)
   - กด **Edit inbound rules** → **Add rule**
   - ตั้งค่า:
     - **Type:** SSH
     - **Port:** 22
     - **Source:** เลือก **My IP** (จะใส่ IP ปัจจุบันของคุณให้อัตโนมัติ) หรือถ้าต้องการให้ทุก IP เข้าได้ (ไม่แนะนำสำหรับ production): **Anywhere-IPv4** `0.0.0.0/0`
   - กด **Save rules**

2. **ตรวจสอบว่า instance รันอยู่**
   - ใน EC2 → Instances ดู **Instance state** ต้องเป็น **Running**
   - ดู **Public IPv4 address** ว่าตรงกับที่ใช้ในคำสั่ง `ssh` หรือไม่ (ถ้า restart instance แล้ว IP อาจเปลี่ยน)

3. **ลอง SSH อีกครั้ง**
   ```powershell
   ssh -i "C:\Users\mahaw\.ssh\tectony-dev.pem" ubuntu@ec2-18-140-113-30.ap-southeast-1.compute.amazonaws.com
   ```
   ถ้า IP เปลี่ยน ให้ใช้ **Public IPv4** หรือ **Public IPv4 DNS** ใหม่จาก EC2 Console

**หมายเหตุ:** ถ้าใช้ **My IP** แล้วต่อมาอินเทอร์เน็ตเปลี่ยน IP (เช่น เปลี่ยน WiFi) ต้องเข้าไปเพิ่ม IP ใหม่ใน Security Group อีกครั้ง หรือใช้ **Elastic IP** สำหรับ instance และเปิด SSH จาก IP ที่ใช้จริงเท่านั้น

**ทางเลือก: ใช้ AWS CLI (ถ้าติดตั้งและ configure แล้ว)**  
จาก EC2 → Security Groups คัดลอก **Security group ID** (เช่น `sg-0123abcd`) แล้วรันใน PowerShell (แทน `sg-XXXXXXXX` ด้วย ID จริง):

```powershell
# ดึง IP ปัจจุบันของคุณแล้วเพิ่มเข้า Security Group (พอร์ต 22)
$myip = (Invoke-WebRequest -Uri "https://checkip.amazonaws.com" -UseBasicParsing).Content.Trim()
aws ec2 authorize-security-group-ingress --group-id sg-XXXXXXXX --protocol tcp --port 22 --cidr "$myip/32"
```

---

# ขั้นตอนที่ 3: ติดตั้งโปรแกรมบนเซิร์ฟเวอร์ (Node, PostgreSQL, Nginx, PM2)

รันทีละบล็อก ( Copy แล้ว Paste ใน Terminal ที่ SSH เข้าไปแล้ว )

## 3.1 อัปเดตระบบและติดตั้ง curl

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl
```

## 3.2 ติดตั้ง Node.js 20 (LTS)

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v
npm -v
```

ควรเห็นเลขเวอร์ชัน (เช่น v20.x.x และ 10.x.x)

## 3.3 ติดตั้ง PostgreSQL

```bash
sudo apt install -y postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

## 3.4 สร้างฐานข้อมูลและผู้ใช้ PostgreSQL

```bash
sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD 'Boss112234';"
sudo -u postgres psql -c "CREATE DATABASE line_flex_db OWNER postgres;"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE line_flex_db TO postgres;"
sudo -u postgres psql -d line_flex_db -c "GRANT ALL ON SCHEMA public TO postgres;"
```

- แทน `ใส่รหัสผ่านที่แข็งแรง` ด้วยรหัสผ่านที่ใช้จริง แล้ว **จดเก็บไว้** สำหรับใส่ใน `.env` ด้านล่าง

## 3.5 ติดตั้ง Nginx (reverse proxy + ใช้กับ SSL)

```bash
sudo apt install -y nginx
sudo systemctl enable nginx
```

## 3.6 ติดตั้ง PM2 (ให้แอปรันต่อเนื่องและรีสตาร์ทอัตโนมัติ)

```bash
sudo npm install -g pm2
```

## 3.7 สร้าง Swap File (ทางรอดสำหรับ Server แรมน้อย) — แนะนำ

ถ้า instance แรมน้อย (เช่น t3.micro / t3.small) ตอนรัน `npm run build:clean` อาจค้างหรือเจอ memory error การสร้าง Swap จะจำลองพื้นที่ดิสก์มาใช้เป็นแรมเสริม ทำให้ build ผ่านได้ (อาจช้าลงนิดหน่อย)

รันใน Terminal ของ Server **ทีละบรรทัด** (สร้าง Swap 4GB):

```bash
# 1. สร้างไฟล์ขนาด 4GB
sudo fallocate -l 4G /swapfile

# 2. ปรับสิทธิ์ไฟล์ให้ปลอดภัย
sudo chmod 600 /swapfile

# 3. แปลงไฟล์เป็นพื้นที่ Swap
sudo mkswap /swapfile

# 4. เปิดใช้งาน
sudo swapon /swapfile

# 5. เช็คว่ามาหรือยัง (ต้องเห็นบรรทัด Swap)
sudo swapon --show
```

**ให้ Swap อยู่ต่อหลังรีบูต (ทำครั้งเดียว):**

```bash
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

ทำเสร็จแล้วไปขั้นตอนที่ 4 (โคลนโปรเจค) ได้เลย เมื่อถึงขั้น Build (4.5) จะมี Swap ช่วยแล้ว

---

# ขั้นตอนที่ 4: โคลนโปรเจคจาก Git และตั้งค่า .env

## 4.1 โคลนโปรเจค (branch V.3) ไปที่โฟลเดอร์ home

```bash
cd ~
git clone -b V.3 https://github.com/BossPhiriyakorn/linebizcard.git linebizcard
cd linebizcard
```

ถ้า repo เป็น private จะต้องใส่ username/password หรือใช้ Personal Access Token แทนรหัสผ่าน

## 4.2 ติดตั้ง dependencies

```bash
npm run install:all
```

หรือแยกรัน:

```bash
npm install
cd frontend && npm install && cd ..
```

## 4.3 สร้างไฟล์ .env

```bash
nano .env
```

แล้ววางเนื้อหาด้านล่าง **แล้วแก้ค่าทุกจุดให้ตรงกับของคุณ** (โดเมน, DB, LINE, LIFF, JWT, SMTP, Stripe ฯลฯ):

```env
# =============================================================================
# Server
# =============================================================================
PORT=3000
NODE_ENV=production
BASE_URL=https://linebizcard.tectony.co.th

# =============================================================================
# LINE
# =============================================================================
LINE_CHANNEL_ID=ใส่จาก LINE Developers
LINE_CHANNEL_SECRET=ใส่จาก LINE Developers
LINE_CALLBACK_URL=https://linebizcard.tectony.co.th/api/auth/line/callback
LIFF_ID=ใส่ LIFF ID (Flex Share)
LIFF_LOGIN_ID=ใส่ LIFF ID (Flex Login)

# =============================================================================
# PostgreSQL (ใช้ค่าที่สร้างในขั้นตอน 3.4)
# =============================================================================
DB_HOST=localhost
DB_PORT=5432
DB_NAME=line_flex_db
DB_USER=linebizcard_user
DB_PASSWORD=รหัสผ่านที่ตั้งไว้ในขั้นตอน 3.4

# =============================================================================
# Upload
# =============================================================================
UPLOAD_DIR=uploads/images
MAX_FILE_SIZE=1073741824
ALLOWED_FILE_TYPES=jpg,jpeg,png,gif,webp,heic,heif,bmp,tiff,tif,ico,avif

# =============================================================================
# JWT / Session (สร้างค่าสุ่มใหม่สำหรับ production)
# =============================================================================
JWT_SECRET=สร้างด้วยคำสั่ง: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_SECRET_CMS=สร้างอีกหนึ่งค่า (คำสั่งเดียวกัน)
SESSION_SECRET=สร้างอีกหนึ่งค่า (คำสั่งเดียวกัน)
ENCRYPTION_KEY=สร้างอีกหนึ่งค่า (คำสั่งเดียวกัน)
OTP_PEPPER=สร้างอีกหนึ่งค่า (คำสั่งเดียวกัน)

# =============================================================================
# Email (Brevo)
# =============================================================================
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=อีเมล Brevo
SMTP_PASS=รหัส SMTP จาก Brevo
EMAIL_FROM=อีเมลที่ยืนยันแล้วใน Brevo
EMAIL_FROM_NAME=Magic

OTP_EXPIRY_MINUTES=5
OTP_COOLDOWN_MINUTES=5
OTP_CODE_LENGTH=6
MAX_OTP_ATTEMPTS=5

# =============================================================================
# Stripe
# =============================================================================
PAYMENT_GATEWAY_ENABLED=true
PAYMENT_GATEWAY_PUBLIC_KEY=pk_live_xxx หรือ pk_test_xxx
PAYMENT_GATEWAY_SECRET_KEY=sk_live_xxx หรือ sk_test_xxx
```

สร้างค่าสุ่ม JWT/Session (รันบนเซิร์ฟเวอร์หรือบนเครื่องคุณ):

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

รันหลายครั้งแล้วนำไปใส่ใน `JWT_SECRET`, `JWT_SECRET_CMS`, `SESSION_SECRET`, `ENCRYPTION_KEY`, `OTP_PEPPER`  
บันทึกไฟล์: `Ctrl+O` → Enter → `Ctrl+X`

## 4.4 รัน Schema ฐานข้อมูล

```bash
cd ~/linebizcard
node scripts/setup-database.js
```

ถ้ามีสคริปต์อื่นที่ต้องรันก่อน (เช่น migration) ให้รันตาม docs ของโปรเจค

## 4.5 Build Frontend (Next.js)

แนะนำใช้ **clean build** (ลบ cache ก่อน build) เพื่อลดโอกาส build ค้างหรือผลเก่าค้าง:

```bash
cd ~/linebizcard
npm run build:clean
```

หรือใช้ `npm run build` โดยตรงก็ได้

ถ้า memory ไม่พออาจเห็น error; ลองเพิ่ม memory ชั่วคราว:

```bash
export NODE_OPTIONS=--max-old-space-size=2048
npm run build
```

---

# ขั้นตอนที่ 5: รันแอปด้วย PM2

## 5.1 สตาร์ทแอป

```bash
cd ~/linebizcard
pm2 start server.js --name linebizcard
```

## 5.2 ตั้งให้รันเมื่อรีบูตเซิร์ฟเวอร์

```bash
pm2 startup
```

จะขึ้นคำสั่งให้ copy แล้วรัน (มักเป็น `sudo env PATH=... pm2 startup ...`) — ให้รันตามที่แสดง

```bash
pm2 save
```

## 5.3 ตรวจสอบ

```bash
pm2 status
pm2 logs linebizcard
```

แอปจะรันที่พอร์ต 3000 ในเครื่อง (ยังไม่เปิดออกอินเทอร์เน็ตโดยตรง เพราะจะให้ Nginx เป็นตัวรับแล้วส่งต่อ)

---

# ขั้นตอนที่ 6: ตั้งค่า Nginx (reverse proxy)

## 6.1 สร้าง config สำหรับ linebizcard.tectony.co.th

```bash
sudo nano /etc/nginx/sites-available/linebizcard
```

วาง**เฉพาะส่วนนี้** (ห้าม copy บรรทัด `` ```nginx `` หรือ `` ``` `` ปิดท้าย — ต้องขึ้นต้นด้วย `server {` เท่านั้น):

```nginx
server {
    listen 80;
    server_name linebizcard.tectony.co.th;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300;
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
    }
}
```

บันทึก: `Ctrl+O` → Enter → `Ctrl+X`

## 6.2 เปิดใช้ site และทดสอบ Nginx

```bash
sudo ln -s /etc/nginx/sites-available/linebizcard /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

- **ถ้า `ln` แจ้ง "File exists"** = มี symlink แล้ว ไม่ต้องรัน `ln` อีก ข้ามไปรัน `sudo nginx -t` ได้เลย  
- **ถ้า `nginx -t` แจ้ง `unknown directive "nginx"`** = ในไฟล์ config มีคำว่า `nginx` หรือ `` ```nginx `` อยู่ (มักเพราะ copy บรรทัดนั้นมาจากคู่มือ) → เปิดแก้ไฟล์:

```bash
sudo nano /etc/nginx/sites-available/linebizcard
```

ลบบรรทัดแรก/บรรทัดที่มีแค่ `` ```nginx `` หรือคำว่า `nginx` ออก ให้บรรทัดแรกของไฟล์เป็น `server {` และปิดท้ายด้วย `}` เท่านั้น แล้วบันทึก (`Ctrl+O` → Enter → `Ctrl+X`) จากนั้นรัน `sudo nginx -t` อีกครั้ง

---

# ขั้นตอนที่ 7: ตั้งค่า DNS ให้โดเมนชี้มาที่ EC2

ไปที่ผู้ให้บริการโดเมน (ที่จัดการ **linebizcard.tectony.co.th** หรือ **tectony.co.th**):

1. หาหน้า **DNS / DNS Management / แก้ไขเรคอร์ด**
2. เพิ่ม (หรือแก้) เรคอร์ด:

| Type | Name/Host | Value | TTL |
|------|------------|--------|-----|
| A    | linebizcard | **Public IP ของ EC2** | 300 หรือ 3600 |

- ถ้าโดเมนเป็น `linebizcard.tectony.co.th` แล้วคุณแก้ที่ zone ของ `tectony.co.th` → ชื่อมักเป็น `linebizcard`  
- ถ้าใช้ CNAME แทน A: ชื่อ `linebizcard` ชี้ไปที่ **Public DNS ของ EC2** (เช่น `ec2-xx-xx-xx-xx.ap-southeast-1.compute.amazonaws.com`) ก็ได้ แต่แนะนำ A record กับ IP ตรงๆ

รอ 5–30 นาที (หรือตาม TTL) แล้วทดสอบ:

```bash
ping linebizcard.tectony.co.th
```

ควรเห็น IP เป็น Public IP ของ EC2

จากนั้นเปิดเบราว์เซอร์: `http://linebizcard.tectony.co.th` ควรเข้าได้ (ยังไม่มี HTTPS)

---

# ขั้นตอนที่ 8: ติดตั้ง SSL (HTTPS) ด้วย Certbot

## 8.1 ติดตั้ง Certbot

```bash
sudo apt install -y certbot python3-certbot-nginx
```

## 8.2 ขอใบรับรอง (ใช้โดเมนที่ตั้งใน Nginx แล้ว)

```bash
sudo certbot --nginx -d linebizcard.tectony.co.th
```

- ใส่อีเมลสำหรับการแจ้งหมดอายุ  
- ยอมรับข้อกำหนด  
- เลือก redirect HTTP → HTTPS (แนะนำ)

## 8.3 ทดสอบการต่ออายุอัตโนมัติ

```bash
sudo certbot renew --dry-run
```

ถ้าผ่าน แสดงว่าเมื่อครบอายุ Certbot จะต่ออายุให้อัตโนมัติ

จากนี้เข้าเว็บด้วย **https://linebizcard.tectony.co.th** ได้

---

# ขั้นตอนที่ 9: อัปเดต LINE Developers และ LIFF

1. เข้า **LINE Developers Console** → Channel ที่ใช้
2. **Messaging API** (หรือ Channel settings):
   - ใส่ **Webhook URL:** `https://linebizcard.tectony.co.th/api/...` (ถ้ามี endpoint สำหรับ webhook)
   - ตรวจ **Callback URL** ว่าเป็น `https://linebizcard.tectony.co.th/api/auth/line/callback`
3. **LIFF**:
   - แก้ LIFF แต่ละตัว (Flex Share / Flex Login) ให้ **Endpoint URL** เป็น `https://linebizcard.tectony.co.th` (และ path ตามที่แอปใช้ เช่น `/liff/login`)
4. บันทึกแล้วรอสักครู่ แล้วทดสอบล็อกอิน/แชร์จาก LINE

---

# ขั้นตอนที่ 10: สร้างแอดมินคนแรก (ถ้าต้องการ)

บนเซิร์ฟเวอร์:

```bash
cd ~/linebizcard
node scripts/create-admin.js
```

รันตามที่สคริปต์ถาม (อีเมล/รหัสผ่าน ฯลฯ)

---

# สรุปคำสั่งสำคัญหลัง Deploy

| งาน | คำสั่ง |
|-----|--------|
| ดูสถานะแอป | `pm2 status` |
| ดู log | `pm2 logs linebizcard` |
| รีสตาร์ทแอป | `pm2 restart linebizcard` |
| ดึงโค้ดล่าสุดแล้ว build ใหม่ | `cd ~/linebizcard && git pull origin V.3 && npm run install:all && npm run build:clean && pm2 restart linebizcard` |
| ตรวจ Nginx | `sudo nginx -t` แล้ว `sudo systemctl status nginx` |
| ตรวจ PostgreSQL | `sudo systemctl status postgresql` |

**แนะนำ:** ใช้ `npm run build:clean` แทน `npm run build` ตอน deploy — สคริปต์จะลบ cache (frontend/.next) ก่อน build ใหม่ ช่วยลดโอกาส build ค้างหรือผลลัพธ์เก่าค้าง (อัปเดตแล้วยังเหมือนเดิม)

---

# กรณีใช้ RDS (PostgreSQL บน AWS) แทน PostgreSQL บน EC2

1. ใน AWS สร้าง **RDS** → **PostgreSQL** เลือกเวอร์ชันที่รองรับ
2. ตั้งค่า:
   - **Public accessibility:** Yes (หรือถ้าใช้ VPC เดียวกับ EC2 ไม่ต้อง public ก็ได้)
   - **Security Group:** เปิดพอร์ต **5432** จาก IP ของ EC2 (หรือ Security Group ของ EC2)
3. สร้าง DB name, user, password แล้วจด **Endpoint** (host)
4. บน EC2 แก้ `.env`:
   - `DB_HOST=xxx.rds.amazonaws.com` (ค่า Endpoint จาก RDS)
   - `DB_PORT=5432`
   - `DB_NAME=...`
   - `DB_USER=...`
   - `DB_PASSWORD=...`
5. รัน schema จากเครื่อง EC2 (ต้องติดตั้ง `psql` หรือใช้ `node scripts/setup-database.js` ที่อ่าน `.env` อยู่แล้ว):

```bash
cd ~/linebizcard
node scripts/setup-database.js
```

6. รีสตาร์ทแอป: `pm2 restart linebizcard`

---

# เช็กลิสต์ก่อนถือว่า Deploy เสร็จ

- [ ] เข้า https://linebizcard.tectony.co.th ได้
- [ ] ล็อกอินด้วย LINE / LIFF ได้
- [ ] ตั้งค่า LINE callback / LIFF endpoint เป็นโดเมนใหม่แล้ว
- [ ] หน้า CMS เข้าได้และล็อกอินแอดมินได้
- [ ] อัปโหลดรูป/สร้างการ์ดได้
- [ ] จ่ายเงิน (Stripe) ทดสอบได้ (ถ้าเปิดใช้)
- [ ] ตั้งค่า DNS ถูกต้อง และ SSL ไม่ error
- [ ] จดเก็บรหัสผ่าน DB, .env และ key EC2 ไว้ในที่ปลอดภัย

ถ้าติดขั้นตอนใด ให้ดู log ด้วย `pm2 logs linebizcard` และ `sudo tail -f /var/log/nginx/error.log` เพื่อไล่แก้ครับ
