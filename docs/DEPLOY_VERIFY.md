# คู่มือ Deploy และตรวจสอบ Production (linebizcard)

ใช้คำสั่งด้านล่างบนเซิร์ฟเวอร์ (SSH เข้าแล้วรัน) — คัดลอกแล้ววางได้เลย

---

## 0. ไฟล์ที่ใช้ Install และ Build (ตรวจว่าครบ)

| ไฟล์ | ใช้ทำอะไร |
|------|------------|
| `package.json` (ราก) | ติดตั้ง backend + workspaces; scripts: `start`, `dev`, `install:all`, `build`, `build:clean` |
| `frontend/package.json` | Dependencies ของ Next.js; script `build` ใช้ตอน `npm run build -w frontend` |
| `scripts/clean-build.js` | ลบ `.next`, cache แล้วรัน build ใหม่ (ใช้กับ `npm run build:clean`) |
| `.env` / `.env.example` | ตัวแปรแวดล้อม (PORT, BASE_URL, DB_*, JWT_SECRET, LIFF_ID, MAX_FILE_SIZE ฯลฯ) |
| `frontend/next.config.js` | การตั้งค่า Next (path to .env, redirects, webpack) |

**ติดตั้ง:** จากโฟลเดอร์รากรัน `npm run install:all` หรือ `npm install` (ไม่ต้องไปติดตั้งใน frontend แยก)  
**Build:** `npm run build` หรือ `npm run build:clean`  
**รัน Production:** บนเซิร์ฟที่ใช้ PM2 **ไม่ต้องรัน `npm start` หลัง build** — ใช้ **`pm2 restart linebizcard`** เท่านั้น (ถ้ารัน `npm start` ซ้ำจะได้ error `EADDRINUSE: address already in use 0.0.0.0:3000` เพราะแอปถูก PM2 รันอยู่แล้ว)

---

## 0.2 หลัง build ใช้ pm2 restart — ห้ามรัน npm start ซ้ำ

แอปบน Production ควรรันผ่าน **PM2** (process manager) เท่านั้น ไม่ใช่รัน `npm start` เองในเทอร์มินัล

- **ลำดับที่ถูก:** `git pull` → `npm run install:all` → `npm run build:clean` → **`pm2 restart linebizcard`** → `pm2 save`
- **ห้าม:** หลัง build แล้วไปรัน `npm start` อีกครั้ง — จะ error **`EADDRINUSE: address already in use 0.0.0.0:3000`** เพราะพอร์ต 3000 ถูก process เดิม (ที่ PM2 รันอยู่) ใช้อยู่แล้ว

ถ้าเห็น error `EADDRINUSE` แปลว่ามี process ใช้พอร์ต 3000 อยู่แล้ว (มักเป็นแอปตัวเดียวกันที่ PM2 รัน) — ไม่ต้องรัน `npm start` อีก แค่ใช้ `pm2 restart linebizcard` เพื่อโหลดโค้ดใหม่หลัง build

---

## 0.1 เทียบ .env ระหว่าง Local (Dev) กับ Production — อะไรทำให้ฟังก์ชันทำงานไม่เหมือนกัน

ความต่างด้านล่างส่งผลโดยตรงต่อพฤติกรรมของแอป (ไม่รวมค่าลับ เช่น รหัสผ่าน/secret ที่ต้องคนละชุดอยู่แล้ว)

| ตัวแปร | Local (Dev) โดยทั่วไป | Production (เซิร์ฟ deploy แล้ว) | ผลต่อการทำงาน |
|--------|------------------------|----------------------------------|----------------|
| **NODE_ENV** | `development` | `production` | Dev: Next รันโหมด dev (hot reload, error แสดงละเอียด). Prod: ใช้ผลจาก `npm run build` + cache, พฤติกรรมและ performance ต่างกัน |
| **BASE_URL** | มักเป็น URL Tunnel หรือ localhost | โดเมนจริง เช่น `https://linebizcard.tectony.co.th` | ใช้ใน LINE callback, ลิงก์ในอีเมล, ลิงก์แชร์การ์ด — **ต้องตรงกับที่ตั้งใน LINE Developers (Callback URL, LIFF Endpoint)** ถ้าไม่ตรง Login/Share จะใช้ไม่ได้ |
| **HOST** | มักไม่ตั้ง (ใช้ default ในโค้ด) | `0.0.0.0` | ให้แอปฟังทุก interface (ใช้เมื่อมี Nginx reverse proxy) — ถ้า Prod ไม่ตั้งและโค้ด default เป็น 0.0.0.0 ก็ไม่ต่าง |
| **LINE_CHANNEL_ID / LIFF_ID / LIFF_LOGIN_ID** | ชุด Channel/LIFF ของ Dev หรือ Tunnel | ชุด Channel/LIFF ของโดเมนจริง | **คนละ Channel = คนละแอปใน LINE** — token/cookie จาก Channel หนึ่งใช้กับอีก Channel ไม่ได้. ต้องให้ Production ใช้ค่าที่ผูกกับโดเมนจริงเท่านั้น |
| **PAYMENT_GATEWAY_ENABLED** | `true` หรือ `false` | มัก `true` | ถ้า Prod เป็น `false` ฟีเจอร์บัตรเครดิต/เดบิตจะปิด (ไม่ตัดเงิน) |
| **PAYMENT_GATEWAY_PUBLIC_KEY / SECRET_KEY** | มักเป็น **test** key (`pk_test_...`, `sk_test_...`) | ควรเป็น **live** key (`pk_live_...`, `sk_live_...`) | Test key = ชำระแบบทดสอบ (บัตรทดสอบของ Stripe). Live key = ตัดเงินจริง — **ถ้า Prod ใช้ test key จะไม่ตัดเงินจริง**; ฟลูว์ 3DS / การยืนยันอาจต่างกัน |
| **FRONTEND_URL / APP_URL** | มักไม่ตั้ง | แนะนำตั้งเป็นโดเมนจริง | ใช้ใน redirect หลังชำระ (เช่น pay-by-qr). ถ้าว่าง redirect อาจเป็น path ล้วน ไม่มีโดเมน — บางครั้งทำให้เปิดลิงก์ผิด |

**สรุปจุดที่มักทำให้ “ทำบน Dev ได้ แต่บน Prod ไม่เหมือนกัน”:**

1. **BASE_URL / LINE Channel / LIFF** ไม่ตรงกัน — หน้า Login หรือแชร์การ์ดเปิดใน Prod แล้วไปเรียก callback/LIFF ที่ยังชี้ไปที่ URL เดิม (เช่น Tunnel) จะล้มหรือ redirect ผิด  
2. **NODE_ENV** — โหมด dev กับ production ของ Next และการ serve ต่างกัน (รวมถึงการอัปโหลด/แปลงรูปที่อาจช้ากว่าใน Prod ถ้าไม่มี timeout เพิ่ม)  
3. **Stripe ใช้ test key บน Prod** — กดชำระแล้วไม่ตัดเงินจริง และอาจได้ flow คนละแบบ  
4. **ไม่มี FRONTEND_URL บน Prod** — redirect หลังสร้างรายการชำระ (เช่น QR) อาจไม่ครบ URL  

แนะนำให้ Production ตั้ง `FRONTEND_URL` (หรือ `APP_URL`) = ค่าเดียวกับ `BASE_URL` ของโดเมนจริง และตรวจใน LINE Developers ว่า Callback URL / LIFF Endpoint ชี้ไปที่โดเมนจริง ไม่ใช่ URL ของ Dev/Tunnel.

---

## 1. ตรวจสอบ Nginx (ขนาดอัปโหลด + timeout)

### 1.1 ดู config Nginx ที่ใช้อยู่

```bash
sudo nginx -t
```

```bash
ls -la /etc/nginx/sites-enabled/
```

### 1.2 ดูค่า client_max_body_size และ proxy timeout

```bash
grep -r "client_max_body_size\|proxy_read_timeout\|proxy_connect_timeout\|proxy_send_timeout" /etc/nginx/
```

**แนะนำสำหรับอัปโหลดรูปจาก iPhone (HEIC อาจ 3–10MB):**
- `client_max_body_size` อย่างน้อย **20m** หรือ **50m**
- `proxy_read_timeout` และ `proxy_send_timeout` อย่างน้อย **120** วินาที

### 1.3 ตัวอย่างแก้ไข (ถ้าค่าน้อยเกินไป)

เปิดไฟล์ config (แก้ path ตามที่ใช้จริง):

```bash
sudo nano /etc/nginx/sites-available/default
```

ภายในบล็อก `location` ที่ proxy ไปแอป Node ให้มีอย่างน้อย:

```nginx
client_max_body_size 50M;
proxy_read_timeout 120s;
proxy_connect_timeout 120s;
proxy_send_timeout 120s;
```

จากนั้นทดสอบและรีโหลด:

```bash
sudo nginx -t && sudo systemctl reload nginx
```

### 1.4 ดู error log Nginx (เมื่ออัปโหลดแล้ว error)

```bash
sudo tail -50 /var/log/nginx/error.log
```

---

## 2. ยืนยันว่าแอปเป็นโค้ดล่าสุด

### 2.1 ไปโฟลเดอร์โปรเจกต์ (แก้ path ตามจริง)

```bash
cd /home/ubuntu/linebizcard
```

หรือ path ที่ clone โปรเจกต์ไว้

### 2.2 ดู branch และ commit ล่าสุด

```bash
git branch
git log -1 --oneline
git status
```

### 2.3 ดึงโค้ดล่าสุดจาก Git

```bash
git fetch origin
git pull origin V.4
```

(แก้ `V.4` เป็น branch ที่ใช้จริง)

### 2.4 ดูว่ามีการเปลี่ยนแปลงหลัง pull หรือไม่

```bash
git log -1 --oneline
```

---

## 3. ติดตั้ง dependencies + Build (ทำทุกครั้งหลัง pull)

### 3.1 ติดตั้ง (ให้ Sharp / heic-convert build ตรงกับ OS เซิร์ฟเวอร์)

```bash
cd /home/ubuntu/linebizcard
npm run install:all
```

หรือ:

```bash
npm install
```

### 3.2 Build frontend (production)

```bash
npm run build:clean
```

หรือถ้าไม่ต้องการล้าง cache:

```bash
npm run build
```

### 3.3 รีสตาร์ทแอป

```bash
pm2 restart linebizcard
pm2 save
```

---

## 4. ตรวจสอบว่าแอปรันและมี log

### 4.1 สถานะ PM2

```bash
pm2 list
```

### 4.2 ดู log ล่าสุด (รวม create-card)

```bash
pm2 logs linebizcard --lines 80
```

### 4.3 ดูเฉพาะ error log

```bash
pm2 logs linebizcard --err --lines 50
```

### 4.4 ทดสอบอัปโหลดรูปจาก iPhone แล้วดู log

หลังกดสร้างการ์ดจากแอป ให้รัน:

```bash
pm2 logs linebizcard --lines 30
```

**ลำดับ log ที่ควรเห็นถ้าข้อมูลถึงแอป:**
1. `[create-card] POST /api/create-card reached (before auth/upload)`
2. `[create-card] request received`
3. `[imageToWebp] convertUploadedToWebp start user_id=...`
4. `[imageToWebp] convert start ext=.heic ...` หรือ `ext=.jpg ...`
5. ถ้าเป็น HEIC: `[imageToWebp] HEIC/HEIF path, using heic-convert` หรือ `.jpg detected as HEIC by magic bytes`
6. `[create-card] success card_id=...` หรือ `[create-card] failure: ...`

ถ้าไม่เห็นข้อ 1 แปลว่า request ไม่ถึง Express (เช่น Nginx ตัด หรือ URL ผิด)

---

## 4.5 แก้ปัญหา: รูปจากกล้องมือถือสร้างการ์ดไม่ได้บนเซิร์ฟเวอร์ (ขึ้น "เกิดปัญหาจากเซิร์ฟเวอร์")

เมื่อกดเลือกรูปที่ถ่ายจากกล้องมือถือแล้วกดสร้างการ์ด แล้วขึ้นข้อความว่าเกิดปัญหาจากเซิร์ฟเวอร์ (เฉพาะบนเซิร์ฟเวอร์ deploy แล้ว ไม่เกิดบนเครื่องตัวเอง) — **โดยเฉพาะถ้าเป็นทุกรูปจากกล้องมือถือทุกรุ่น (ไม่ใช่แค่ iPhone)** สาเหตุที่เป็นไปได้และวิธีแก้:

### สาเหตุหลักที่พบบ่อย (เรียงตามความน่าจะเป็น)

| ลำดับ | สาเหตุ | อาการใน log / การตอบกลับ | วิธีแก้ |
|------|--------|----------------------------|--------|
| **1** | **Nginx จำกัดขนาดอัปโหลด (413)** | Request **ไม่ถึง Express** — ไม่เห็น `[create-card] POST /api/create-card reached` ใน pm2 logs; หรือ Nginx error log มี "client intended to send too large body" | เพิ่ม `client_max_body_size 50m;` ใน Nginx (ดูมาตรา 1.2–1.3) |
| **2** | **Nginx/Proxy timeout (504)** | เห็น `[create-card] POST /api/create-card reached` แต่ไม่เห็น `success` หรือ `failure`; อัปโหลด/แปลงรูปใช้เวลานาน — proxy ตัดก่อนแอปตอบ | เพิ่ม `proxy_read_timeout 180s;` และ `proxy_send_timeout 180s;` ใน Nginx |
| **3** | **Sharp/libvips บนเซิร์ฟเวอร์ต่างจาก Local** | เห็น `[create-card] Convert to WebP failed` พร้อมข้อความ error จาก Sharp (เช่น "unsupported image format", "VipsJpeg: Corrupt JPEG data") | รัน `npm run install:all` บนเซิร์ฟเวอร์ใหม่เพื่อให้ Sharp build ตรงกับ OS; ตรวจว่า Sharp โหลดได้: `node -e "const s=require('sharp'); console.log('Sharp version:', s.versions)"` |
| **4** | **รูป HEIC (iPhone) — heic-convert ล้มบนเซิร์ฟเวอร์** | เห็น `[create-card] Convert to WebP failed` และข้อความเกี่ยวกับ HEIC/iPhone | ติดตั้ง libheif บนเซิร์ฟเวอร์ (ดูด้านล่าง) หรือให้ผู้ใช้ตั้งค่า iPhone: กล้อง > รูปแบบ > Most Compatible |
| **5** | **Memory ไม่พอ (OOM)** | Process หลุดหรือ restart หลังอัปโหลด; pm2 logs มี "JavaScript heap out of memory" หรือ process หาย | เพิ่ม RAM หรือลด `MAX_FILE_SIZE` ใน .env (เช่น 10485760 = 10MB) เพื่อบังคับให้ผู้ใช้ลดขนาดรูปก่อนอัปโหลด |
| **6** | **ไฟล์เสียหรือ metadata ผิดปกติ** | เห็น `[create-card] Convert to WebP failed` พร้อมข้อความเกี่ยวกับ "corrupt", "invalid", "unsupported" | ให้ผู้ใช้ลองบันทึกรูปใหม่ในแอปแก้รูป (เช่น crop/save as new) แล้วอัปโหลดใหม่; หรือลองรูปอื่น |

**ติดตั้ง libheif บน Ubuntu/Debian (เพื่อให้ heic-convert แปลงรูปจาก iPhone ได้):**

```bash
sudo apt update
sudo apt install -y libheif-dev
```

จากนั้นในโฟลเดอร์โปรเจกต์รัน `npm run install:all` (หรือ `npm install`) อีกครั้งเพื่อให้ native module  link กับ libheif ได้

**ขั้นตอนการวินิจฉัยปัญหา (ทำตามลำดับ):**

**1. ตรวจ pm2 logs ว่า request ถึงแอปหรือไม่**

```bash
pm2 logs linebizcard --lines 50
```

- **ไม่เห็น** `[create-card] POST /api/create-card reached` เลย → ปัญหาที่ Nginx/proxy (ขนาดอัปโหลด หรือ timeout) — ไปข้อ 2
- **เห็น** `POST /api/create-card reached` แต่ตามด้วย `Convert to WebP failed` → ปัญหาที่การแปลงรูป (Sharp/libvips หรือ HEIC) — ไปข้อ 3
- **เห็น** `POST /api/create-card reached` แต่ไม่เห็น `success` หรือ `failure` → ปัญหา timeout หรือ process หลุด — ไปข้อ 4

**2. ตรวจ Nginx error log (ถ้า request ไม่ถึงแอป)**

```bash
sudo tail -100 /var/log/nginx/error.log | grep -i "client\|body\|timeout"
```

- เห็น "client intended to send too large body" → เพิ่ม `client_max_body_size 50m;` (มาตรา 1.2–1.3)
- เห็น "upstream timed out" → เพิ่ม `proxy_read_timeout 180s;` และ `proxy_send_timeout 180s;`

**3. ตรวจข้อความ error จาก Sharp (ถ้าเห็น "Convert to WebP failed")**

ดูข้อความหลัง `Convert to WebP failed:` ใน pm2 logs:

- มี "HEIC", "iPhone", "Most Compatible" → ติดตั้ง libheif (ดูด้านล่าง)
- มี "unsupported", "VipsJpeg", "corrupt" → Sharp/libvips บนเซิร์ฟเวอร์อาจต่างจาก Local → รัน `npm run install:all` ใหม่บนเซิร์ฟเวอร์
- มี "out of memory", "heap" → เพิ่ม RAM หรือลด MAX_FILE_SIZE

**4. ตรวจ process status (ถ้า process หลุด)**

```bash
pm2 list
pm2 logs linebizcard --err --lines 30
```

- เห็น "JavaScript heap out of memory" → เพิ่ม RAM
- Process restart บ่อย → ดู error log ว่ามี unhandled rejection หรือไม่

---

## 5. ลำดับ Deploy แนะนำ (ทำทุกครั้งหลัง pull)

รันตามลำดับ — **หลัง build ใช้ `pm2 restart` เท่านั้น ไม่รัน `npm start`** (ดูมาตรา 0.2):

```bash
cd /home/ubuntu/linebizcard
git pull origin V.4
npm run install:all
npm run build:clean
pm2 restart linebizcard
pm2 save
pm2 logs linebizcard --lines 20
```

(แก้ path และ branch ตามจริง)

---

## 6. ตรวจสอบ Sharp / heic-convert ว่าทำงานบนเซิร์ฟเวอร์

รันจากโฟลเดอร์โปรเจกต์:

```bash
node -e "const s=require('sharp'); console.log('Sharp OK', s);"
```

```bash
node -e "const h=require('heic-convert'); console.log('heic-convert OK', typeof h);"
```

ถ้า error แปลว่าโหลดไม่ได้ (เช่น build ไม่ตรง OS) — ต้องรัน `npm install` บนเครื่องเซิร์ฟเวอร์ใหม่

**รูปจาก iPhone (HEIC):** บน Linux เซิร์ฟเวอร์บางตัวต้องติดตั้ง libheif ก่อน heic-convert จะแปลง HEIC ได้ (ดูมาตรา 4.5)

---

## 7. ทดสอบ API สุขภาพ

```bash
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/api/health
```

ได้ `200` แปลว่า API ตอบปกติ (แก้พอร์ตถ้าไม่ใช่ 3000)

---

## 8. แก้แพ็กเกจฟรีขึ้น "กรุณาลงทะเบียนช่องทางชำระเงินก่อน" (Production)

ถ้าลูกค้ากดแพ็กเกจฟรีแล้วขึ้นข้อความให้ใส่ช่องทางชำระเงิน แสดงว่าใน DB แพ็กเกจนั้นมี `requires_payment = true` หรือไม่ได้ตั้ง รัน SQL นี้ครั้งเดียว:

```bash
psql -U <user> -d <dbname> -f database/fix-free-package-requires-payment.sql
```

หรือรันใน psql:

```sql
UPDATE packages SET requires_payment = false WHERE (price IS NULL OR price = 0) AND (COALESCE(requires_payment, true) = true);
```

หลัง deploy โค้ดล่าสุด ระบบจะถือว่าแพ็กเกจที่ `price = 0` เป็นฟรีแม้ DB ยังตั้งผิด (ทั้งฝั่ง frontend และ backend)
