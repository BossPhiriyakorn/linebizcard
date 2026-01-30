# แก้ไขปัญหา shareTargetPicker ไม่ทำงาน

## ปัญหา: "shareTargetPicker is not allowed in this LIFF app"

แม้ว่าจะเปิด `shareTargetPicker` ใน LINE Developers Console แล้ว แต่ยังได้ error นี้

---

## แก้ด่วน: ตรวจสอบ LIFF ID ตัวอักษรให้ตรงทุกตัว

**สาเหตุที่พบบ่อย:** LIFF ID ใน `.env` ไม่ตรงกับ LIFF app ที่เปิด shareTargetPicker — **รวมตัวพิมพ์ใหญ่/เล็ก**

- ใน LINE Developers จะแสดงเช่น `2008995579-bGPQINTN` (ตัว I อาจดูเหมือน l หรือ 1)
- ใน `.env` ต้องคัดลอกจาก Console แล้ววาง — **ห้ามพิมพ์เอง** เพราะตัว **I (ไอใหญ่)** กับ **l (แอลเล็ก)** กับ **1 (เลขหนึ่ง)** ดูคล้ายกัน
- ตัวอย่างที่ถูก: `LIFF_ID=2008995579-bGPQiNTN` (ตัว i ตัวสุดท้ายก่อน NTN เป็น **ไอเล็ก**)
- หลังแก้ `.env` แล้ว **รีสตาร์ทเซิร์ฟเวอร์** แล้วลองใหม่

---

## สาเหตุที่เป็นไปได้

### 1. LIFF App ไม่ตรงกัน
**ปัญหาที่พบบ่อยที่สุด:** LIFF app ที่ตั้ง **Endpoint URL = โดเมนหลัก** (เช่น `https://quarterly-javascript-press-functions.trycloudflare.com`) **ไม่ใช่ตัวเดียวกับ** ที่เปิด `shareTargetPicker`

### 2. LIFF ID ไม่ตรงกัน
LIFF ID ใน `.env` ไม่ตรงกับ LIFF app ที่เปิด `shareTargetPicker` (รวมตัวอักษรทุกตัว)

### 3. ยังไม่ sync
หลังเปิด `shareTargetPicker` ต้องรอ 1-2 นาที เพื่อให้การตั้งค่า sync

### 4. Endpoint URL ไม่ตรงกับ URL หน้านี้ (กรณี LIFF ID ตรงแล้วแต่ยัง error)
ถ้า LIFF ID ตรงและ shareTargetPicker = ON แล้ว แต่ยังขึ้น "shareTargetPicker is not allowed":

- **Endpoint URL** ใน LINE Developers ต้องตรงกับ **URL ที่หน้าโหลดจริง** ทุกตัวอักษร (รวม path และ / ท้าย)
- ถ้า error แสดง URL ว่า `.../share` แต่ตั้ง Endpoint URL = `.../share` แล้วยัง error → **ลองเปลี่ยนเป็นโดเมนหลักเท่านั้น (ไม่มี /share):**
  1. ใน LINE Developers → LIFF → Magic-Contact-Card → **Edit**
  2. ตั้ง **Endpoint URL** = `https://quarterly-javascript-press-functions.trycloudflare.com` (ไม่มี path ไม่มี /share)
  3. **Update** แล้วรอ **1–2 นาที**
  4. กดลิงค์แชร์การ์ดอีกครั้ง — ตอนนี้ LINE จะเปิดที่ `/` (root) และเราเสิร์ฟ share.html ที่ `/` อยู่แล้ว จึงทำงานได้
- หรือลองสลับ **slash ท้าย**: ถ้าตั้งไว้ `.../share` ให้ลอง `.../share/` หรือกลับกัน
- บันทึก (Update) แล้วรอ 1–2 นาที แล้วลองใหม่

---

## วิธีตรวจสอบและแก้ไข

### ขั้นตอนที่ 1: ตรวจสอบ LIFF App ที่ตั้ง Endpoint URL = โดเมนหลัก

1. ไปที่ **LINE Developers Console** → Channel → **LIFF**
2. ดูรายการ LIFF Apps ทั้งหมด
3. **หาตัวที่ตั้ง Endpoint URL = โดเมนหลัก** (ไม่มี path หรือ `/` ท้าย):
   - ควรเป็น: `https://quarterly-javascript-press-functions.trycloudflare.com`
   - หรือ: `https://your-domain.com`
4. **จด LIFF ID** ของตัวนี้ — คัดลอกจาก Console (ห้ามพิมพ์เอง)

### ขั้นตอนที่ 2: ตรวจสอบ shareTargetPicker ใน LIFF App นั้น

1. **คลิกที่ LIFF App** ที่ตั้ง Endpoint URL = โดเมนหลัก (จากขั้นตอนที่ 1)
2. ดูหน้า **Edit LIFF App** (หรือ LIFF detail)
3. ตรวจสอบ:
   - ✅ **Endpoint URL** = โดเมนหลัก (ตรงกับ BASE_URL)
   - ✅ **shareTargetPicker toggle** = **ON** (เปิดอยู่)
4. ถ้า **shareTargetPicker = OFF**:
   - เปิด toggle
   - คลิก **Update**
   - **รอ 1-2 นาที**

### ขั้นตอนที่ 3: ตรวจสอบ LIFF ID ใน `.env`

1. เปิดไฟล์ `.env`
2. ดูค่า `LIFF_ID`:
   ```env
   LIFF_ID=2008995579-bGPQiNTN
   ```
3. **เปรียบเทียบกับ LIFF ID** จากขั้นตอนที่ 1:
   - ต้อง**ตรงกันทุกตัวอักษร** (รวมตัวพิมพ์ใหญ่/เล็ก)
   - ถ้าไม่ตรง → แก้ไข `.env` ให้ตรงกับ LIFF app ที่เปิด `shareTargetPicker`

### ขั้นตอนที่ 4: ตรวจสอบด้วย Browser Console

1. เปิดหน้า `/share?name=card_xxx&id=1` ใน browser
2. เปิด **Developer Tools** (F12) → **Console**
3. ดู log:
   ```
   Initializing LIFF with ID: 2008995579-bGPQiNTN
   shareTargetPicker available: false
   ```
4. **ตรวจสอบว่า LIFF ID ตรงกับ** LIFF app ที่เปิด `shareTargetPicker` หรือไม่

---

## วิธีแก้ไข (กรณีที่พบบ่อย)

### กรณีที่ 1: มี LIFF App เดียว (ใช้ทั้ง Login และ Share)

**ปัญหา:** ใช้ LIFF app เดียวกันทั้ง login และ share แต่เปิด `shareTargetPicker` แล้วยังไม่ได้

**วิธีแก้:**
1. ตรวจสอบว่า LIFF app นี้:
   - ✅ Endpoint URL = `/share` (ไม่ใช่ `/liff/login`)
   - ✅ shareTargetPicker = ON
2. ถ้า Endpoint URL = `/liff/login`:
   - **ต้องเปลี่ยนเป็น** `/share`
   - หรือ **สร้าง LIFF app ใหม่** สำหรับ share

### กรณีที่ 2: มี LIFF App 2 ตัว (แยก Login และ Share)

**แนะนำ:** แยก LIFF app เป็น 2 ตัว

#### LIFF App #1: สำหรับ Login
- **LIFF app name:** `Magic-Contact-Card-Login`
- **Endpoint URL:** `https://your-domain.com/liff/login`
- **LIFF ID:** → ใส่ใน `.env` เป็น `LIFF_LOGIN_ID`
- **shareTargetPicker:** OFF (ไม่ต้องเปิด)

#### LIFF App #2: สำหรับ Share ⚠️ สำคัญ!
- **LIFF app name:** `Magic-Contact-Card-Share`
- **Endpoint URL:** `https://your-domain.com/share` ⚠️ ต้องเป็น `/share`
- **LIFF ID:** → ใส่ใน `.env` เป็น `LIFF_ID`
- **shareTargetPicker:** ON ⚠️ ต้องเปิด

### กรณีที่ 3: LIFF ID ไม่ตรงกัน

**ปัญหา:** LIFF ID ใน `.env` ไม่ตรงกับ LIFF app ที่เปิด `shareTargetPicker`

**วิธีแก้:**
1. ไปที่ LINE Developers Console → LIFF
2. หา LIFF app ที่:
   - Endpoint URL = `/share`
   - shareTargetPicker = ON
3. คัดลอก **LIFF ID** ของตัวนี้
4. อัปเดต `.env`:
   ```env
   LIFF_ID=2008995579-xxxxx  # ใส่ LIFF ID ที่ถูกต้อง
   ```
5. **รีสตาร์ทเซิร์ฟเวอร์**

---

## Checklist การตรวจสอบ

- [ ] LIFF app ที่ตั้ง Endpoint URL = `/share` มี **shareTargetPicker = ON**
- [ ] LIFF ID ใน `.env` **ตรงกับ** LIFF app ที่เปิด `shareTargetPicker`
- [ ] รอ **1-2 นาที** หลังเปิด `shareTargetPicker`
- [ ] **รีสตาร์ทเซิร์ฟเวอร์** หลังแก้ไข `.env`
- [ ] ตรวจสอบ Browser Console ว่าใช้ LIFF ID ถูกต้อง

---

## Debug: ดู Log ใน Browser Console

เมื่อเปิดหน้า `/share` ใน browser:

1. กด **F12** → **Console**
2. ดู log:
   ```
   Initializing LIFF with ID: 2008995579-bGPQiNTN
   shareTargetPicker available: true/false
   ```
3. ถ้า `shareTargetPicker available: false`:
   - ตรวจสอบว่า LIFF ID ตรงกับ LIFF app ที่เปิด `shareTargetPicker` หรือไม่
   - ตรวจสอบว่า LIFF app นั้นมี Endpoint URL = `/share` หรือไม่

---

## สรุป

**ปัญหาหลัก:** LIFF app ที่ตั้ง Endpoint URL = `/share` **ไม่ได้เปิด `shareTargetPicker`** หรือ LIFF ID ไม่ตรงกัน

**วิธีแก้:**
1. หา LIFF app ที่ตั้ง Endpoint URL = `/share`
2. เปิด `shareTargetPicker` ใน LIFF app นั้น
3. ตรวจสอบว่า LIFF ID ใน `.env` ตรงกับ LIFF app นั้น
4. รอ 1-2 นาที และรีสตาร์ทเซิร์ฟเวอร์
