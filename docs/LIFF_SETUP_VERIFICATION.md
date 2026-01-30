# Checklist การตรวจสอบการตั้งค่า LIFF App

## 📋 สรุปการตั้งค่า

### LIFF App #1: สำหรับ Login
- **LIFF ID:** `2009003364-mn9VYzUq`
- **Endpoint URL:** `https://quarterly-javascript-press-functions.trycloudflare.com/liff/login`
- **shareTargetPicker:** OFF (ไม่ต้องเปิด)

### LIFF App #2: สำหรับ Share
- **LIFF ID:** `2008995579-bGPQiNTN`
- **Endpoint URL:** `https://quarterly-javascript-press-functions.trycloudflare.com` (โดเมนหลัก)
- **shareTargetPicker:** ON (ต้องเปิด)

---

## ✅ ขั้นตอนการตรวจสอบ

### ขั้นตอนที่ 1: ตรวจสอบ LIFF App สำหรับ Login

1. ไปที่ [LINE Developers Console](https://developers.line.biz/console/)
2. เลือก Channel ที่ใช้ (Channel ID: `2008995579`)
3. ไปที่ **LIFF** → ดูรายการ LIFF Apps ทั้งหมด
4. **หา LIFF App ที่มี LIFF ID = `2009003364-mn9VYzUq`**
5. **คลิกเข้าไปดูรายละเอียด** (คลิกที่แถวหรือปุ่ม Edit)

#### ตรวจสอบการตั้งค่า:

- [ ] **LIFF app name:** (ควรเป็นชื่อที่ระบุว่าเป็น Login เช่น `Magic-Contact-Card-Login`)
- [ ] **LIFF ID:** `2009003364-mn9VYzUq` ✅
- [ ] **Size:** Full
- [ ] **Endpoint URL:** `https://quarterly-javascript-press-functions.trycloudflare.com/liff/login` ✅
  - ⚠️ **ต้องตรงกับ** `BASE_URL` ใน `.env` + `/liff/login`
- [ ] **Scope:** 
  - ✅ `profile`
  - ✅ `openid`
- [ ] **shareTargetPicker:** OFF (ปิดอยู่) ✅
  - ⚠️ **ไม่ต้องเปิด** สำหรับ Login app

#### ถ้าไม่ถูกต้อง:

1. **แก้ไข Endpoint URL:**
   - คลิก **Edit**
   - เปลี่ยน **Endpoint URL** เป็น: `https://quarterly-javascript-press-functions.trycloudflare.com/liff/login`
   - คลิก **Update**

2. **ตรวจสอบ shareTargetPicker:**
   - ถ้าเปิดอยู่ → ปิด (OFF)
   - คลิก **Update**

---

### ขั้นตอนที่ 2: ตรวจสอบ LIFF App สำหรับ Share

1. ไปที่ **LIFF** → ดูรายการ LIFF Apps ทั้งหมด
2. **หา LIFF App ที่มี LIFF ID = `2008995579-bGPQiNTN`**
3. **คลิกเข้าไปดูรายละเอียด** (คลิกที่แถวหรือปุ่ม Edit)

#### ตรวจสอบการตั้งค่า:

- [ ] **LIFF app name:** (ควรเป็นชื่อที่ระบุว่าเป็น Share เช่น `Magic-Contact-Card-Share`)
- [ ] **LIFF ID:** `2008995579-bGPQiNTN` ✅
- [ ] **Size:** Full
- [ ] **Endpoint URL:** `https://quarterly-javascript-press-functions.trycloudflare.com` ✅
  - ⚠️ **ต้องตรงกับ** `BASE_URL` ใน `.env` (โดเมนหลัก ไม่มี path)
  - ⚠️ **ไม่ใช่** `/share` หรือ `/liff/login`
- [ ] **Scope:** 
  - ✅ `profile`
  - ✅ `openid`
- [ ] **shareTargetPicker:** ON (เปิดอยู่) ✅
  - ⚠️ **ต้องเปิด** สำหรับ Share app

#### ถ้าไม่ถูกต้อง:

1. **แก้ไข Endpoint URL:**
   - คลิก **Edit**
   - เปลี่ยน **Endpoint URL** เป็น: `https://quarterly-javascript-press-functions.trycloudflare.com`
   - ⚠️ **เอา `/share` ออก** (ถ้ามี)
   - คลิก **Update**

2. **เปิด shareTargetPicker:**
   - ถ้าปิดอยู่ → เปิด (ON)
   - คลิก **Update**
   - **รอ 1-2 นาที** เพื่อให้การตั้งค่า sync

---

### ขั้นตอนที่ 3: ตรวจสอบ `.env` file

เปิดไฟล์ `.env` ตรวจสอบว่า:

```env
# LIFF Configuration
# ⚠️ สำคัญ: แยก LIFF ID ระหว่าง Login และ Share

# LIFF ID สำหรับ Share (แชร์การ์ด)
LIFF_ID=2008995579-bGPQiNTN

# LIFF ID สำหรับ Login (เข้าสู่ระบบ)
LIFF_LOGIN_ID=2009003364-mn9VYzUq
```

- [ ] `LIFF_ID=2008995579-bGPQiNTN` ✅ (ตรงกับ Share app)
- [ ] `LIFF_LOGIN_ID=2009003364-mn9VYzUq` ✅ (ตรงกับ Login app)
- [ ] `BASE_URL=https://quarterly-javascript-press-functions.trycloudflare.com` ✅

---

### ขั้นตอนที่ 4: รีสตาร์ทเซิร์ฟเวอร์

หลังแก้ไข `.env` หรือการตั้งค่า LIFF App:

1. **หยุดเซิร์ฟเวอร์** (กด `Ctrl+C` ใน terminal)
2. **รันเซิร์ฟเวอร์ใหม่:**
   ```bash
   npm start
   ```
3. **ตรวจสอบ log** ว่า:
   - `🔗 LIFF ID: 2008995579-bGPQiNTN` (แสดง LIFF_ID สำหรับ Share)

---

## 🧪 การทดสอบ

### ทดสอบ Login:

1. เปิดลิงค์ LIFF Login:
   ```
   https://liff.line.me/2009003364-mn9VYzUq
   ```
2. ควรเปิดหน้า `/liff/login` และสามารถ login ได้
3. ตรวจสอบ Browser Console:
   - `Initializing LIFF with ID: 2009003364-mn9VYzUq`
   - `isInClient: true` (ถ้าเปิดจาก LINE app)

### ทดสอบ Share:

1. สร้างการ์ดใหม่ (จะได้ลิงค์ LIFF Share)
2. ลิงค์จะมีรูปแบบ:
   ```
   https://liff.line.me/2008995579-bGPQiNTN?name=card_xxx&id=1
   ```
3. ส่งลิงค์ใน LINE chat แล้วกดจาก LINE app
4. ควรเปิดหน้า share และแสดง shareTargetPicker
5. ตรวจสอบ Browser Console:
   - `Initializing LIFF with ID: 2008995579-bGPQiNTN`
   - `isInClient: true` (ถ้าเปิดจาก LINE app)
   - `shareTargetPicker available: true`

---

## ⚠️ ปัญหาที่พบบ่อย

### ปัญหา 1: shareTargetPicker ไม่ทำงาน

**สาเหตุ:**
- LIFF App สำหรับ Share ไม่ได้เปิด shareTargetPicker
- LIFF ID ไม่ตรงกัน
- Endpoint URL ไม่ถูกต้อง

**วิธีแก้:**
1. ตรวจสอบ LIFF App `2008995579-bGPQiNTN`:
   - Endpoint URL = โดเมนหลัก (ไม่มี path)
   - shareTargetPicker = ON
2. ตรวจสอบ `.env`:
   - `LIFF_ID=2008995579-bGPQiNTN`
3. รอ 1-2 นาที หลังเปิด shareTargetPicker
4. รีสตาร์ทเซิร์ฟเวอร์

### ปัญหา 2: Login ไม่ทำงาน

**สาเหตุ:**
- LIFF App สำหรับ Login ไม่ถูกต้อง
- Endpoint URL ไม่ตรงกัน

**วิธีแก้:**
1. ตรวจสอบ LIFF App `2009003364-mn9VYzUq`:
   - Endpoint URL = `/liff/login`
   - shareTargetPicker = OFF
2. ตรวจสอบ `.env`:
   - `LIFF_LOGIN_ID=2009003364-mn9VYzUq`
3. รีสตาร์ทเซิร์ฟเวอร์

### ปัญหา 3: LIFF URL เปิดใน Browser แทน LIFF View

**สาเหตุ:**
- Endpoint URL ไม่ตรงกับ LIFF app
- กดลิงค์จาก browser แทน LINE app

**วิธีแก้:**
1. ตรวจสอบ Endpoint URL ใน LINE Developers Console
2. ตรวจสอบว่า BASE_URL ใน `.env` ตรงกับ Endpoint URL หรือไม่
3. **กดลิงค์จาก LINE app** (ไม่ใช่ browser)

---

## 📝 สรุป Checklist

### LIFF App สำหรับ Login (`2009003364-mn9VYzUq`):
- [ ] Endpoint URL = `https://quarterly-javascript-press-functions.trycloudflare.com/liff/login`
- [ ] shareTargetPicker = OFF
- [ ] Scope = `profile`, `openid`

### LIFF App สำหรับ Share (`2008995579-bGPQiNTN`):
- [ ] Endpoint URL = `https://quarterly-javascript-press-functions.trycloudflare.com` (โดเมนหลัก)
- [ ] shareTargetPicker = ON
- [ ] Scope = `profile`, `openid`

### `.env` file:
- [ ] `LIFF_ID=2008995579-bGPQiNTN` (Share)
- [ ] `LIFF_LOGIN_ID=2009003364-mn9VYzUq` (Login)
- [ ] `BASE_URL=https://quarterly-javascript-press-functions.trycloudflare.com`

### เซิร์ฟเวอร์:
- [ ] รีสตาร์ทเซิร์ฟเวอร์หลังแก้ไข `.env`
- [ ] รอ 1-2 นาที หลังเปิด shareTargetPicker

---

## 📞 หมายเหตุ

- ถ้า BASE_URL เปลี่ยน (เช่น Cloudflare Tunnel URL เปลี่ยน) → ต้องอัปเดต Endpoint URL ใน LINE Developers Console ให้ตรงกัน
- shareTargetPicker ต้องเปิดใน LIFF app ที่ตั้ง Endpoint URL = โดเมนหลักเท่านั้น
- ถ้าใช้ LIFF app หลายตัว → แยก Login และ Share เป็นคนละตัว (ตามที่ตั้งค่าไว้แล้ว)
