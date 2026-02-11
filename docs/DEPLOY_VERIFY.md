# คู่มือ Deploy และตรวจสอบ Production (linebizcard)

ใช้คำสั่งด้านล่างบนเซิร์ฟเวอร์ (SSH เข้าแล้วรัน) — คัดลอกแล้ววางได้เลย

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

## 5. ลำดับ Deploy แนะนำ (ทำทุกครั้งหลัง pull)

รันตามลำดับ:

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

---

## 7. ทดสอบ API สุขภาพ

```bash
curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/api/health
```

ได้ `200` แปลว่า API ตอบปกติ (แก้พอร์ตถ้าไม่ใช่ 3000)
