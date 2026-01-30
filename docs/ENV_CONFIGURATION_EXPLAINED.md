# อธิบายการตั้งค่าในไฟล์ `.env`

## 📋 สรุป

### ✅ **ไม่ต้องแยก** LINE Channel (LINE_CHANNEL_ID, LINE_CHANNEL_SECRET)
- ใช้ **Channel เดียวกัน** สำหรับทั้ง Login และ Share
- เป็น Channel หลักที่สร้างใน LINE Developers Console

### ✅ **ต้องแยก** LIFF App (LIFF_ID, LIFF_LOGIN_ID)
- **LIFF App #1** สำหรับ Login (`LIFF_LOGIN_ID`)
- **LIFF App #2** สำหรับ Share (`LIFF_ID`)

---

## 🔍 อธิบายรายละเอียด

### 1. LINE Channel (ไม่ต้องแยก)

#### LINE_CHANNEL_ID และ LINE_CHANNEL_SECRET

**คืออะไร:**
- เป็น **Channel หลัก** ที่สร้างใน LINE Developers Console
- ใช้สำหรับ **LINE Login OAuth flow** (แลก authorization code เป็น access token)
- ใช้ร่วมกันทั้ง Login และ Share

**ใช้ที่ไหน:**
- `services/lineService.js` - สร้าง LINE Login URL
- `controllers/lineAuthController.js` - แลก code เป็น token

**ตัวอย่าง:**
```env
LINE_CHANNEL_ID=2008995579
LINE_CHANNEL_SECRET=20e8d8760c532c16473a7ff4d5a72f14
LINE_CALLBACK_URL=https://quarterly-javascript-press-functions.trycloudflare.com/api/auth/line/callback
```

**ทำไมไม่ต้องแยก:**
- Channel เดียวสามารถมี LIFF App หลายตัวได้
- OAuth flow ใช้ Channel เดียวกัน
- ไม่มีปัญหาเรื่องการแยก

---

### 2. LIFF App (ต้องแยก)

#### LIFF_ID (สำหรับ Share)

**คืออะไร:**
- เป็น **LIFF App** ที่ใช้สำหรับแชร์การ์ด
- ต้องเปิด `shareTargetPicker`
- Endpoint URL = โดเมนหลัก (ไม่มี path)

**ตัวอย่าง:**
```env
LIFF_ID=2008995579-bGPQiNTN
```

**การตั้งค่าใน LINE Developers Console:**
- LIFF app name: `Magic-Contact-Card-Share`
- Endpoint URL: `https://quarterly-javascript-press-functions.trycloudflare.com`
- shareTargetPicker: **ON** ✅

---

#### LIFF_LOGIN_ID (สำหรับ Login)

**คืออะไร:**
- เป็น **LIFF App** ที่ใช้สำหรับ login
- ไม่ต้องเปิด `shareTargetPicker`
- Endpoint URL = `/liff/login`

**ตัวอย่าง:**
```env
LIFF_LOGIN_ID=2009003364-mn9VYzUq
```

**การตั้งค่าใน LINE Developers Console:**
- LIFF app name: `Magic-Contact-Card-Login`
- Endpoint URL: `https://quarterly-javascript-press-functions.trycloudflare.com/liff/login`
- shareTargetPicker: **OFF** ✅

---

## 📊 ตารางเปรียบเทียบ

| รายการ | ต้องแยก? | จำนวน | ใช้สำหรับ |
|--------|---------|-------|-----------|
| **LINE Channel** | ❌ ไม่ต้อง | 1 ตัว | OAuth flow (Login และ Share) |
| **LIFF App** | ✅ ต้องแยก | 2 ตัว | Login และ Share |

---

## 🔄 Flow การทำงาน

### Flow 1: Login

1. ผู้ใช้เปิด LIFF Login URL: `https://liff.line.me/2009003364-mn9VYzUq`
2. LIFF App (`LIFF_LOGIN_ID`) เปิดหน้า `/liff/login`
3. ถ้ายังไม่ login → redirect ไป LINE Login (ใช้ `LINE_CHANNEL_ID`)
4. LINE Login สำเร็จ → กลับมาที่ `/liff/login`
5. Backend แลก code เป็น token (ใช้ `LINE_CHANNEL_ID` และ `LINE_CHANNEL_SECRET`)

### Flow 2: Share

1. ผู้ใช้เปิด LIFF Share URL: `https://liff.line.me/2008995579-bGPQiNTN?name=card_xxx&id=1`
2. LIFF App (`LIFF_ID`) เปิดหน้า `/` (ตรวจสอบ query parameters)
3. ถ้ายังไม่ login → redirect ไป LINE Login (ใช้ `LINE_CHANNEL_ID`)
4. LINE Login สำเร็จ → กลับมาที่ `/` พร้อม query parameters
5. Backend แลก code เป็น token (ใช้ `LINE_CHANNEL_ID` และ `LINE_CHANNEL_SECRET`)
6. เรียก `liff.shareTargetPicker()` เพื่อแชร์การ์ด

---

## ✅ สรุปการตั้งค่าใน `.env`

```env
# LINE Login Configuration
# ⚠️ ไม่ต้องแยก - ใช้ Channel เดียวกัน
LINE_CHANNEL_ID=2008995579
LINE_CHANNEL_SECRET=20e8d8760c532c16473a7ff4d5a72f14
LINE_CALLBACK_URL=https://quarterly-javascript-press-functions.trycloudflare.com/api/auth/line/callback

# LIFF Configuration
# ⚠️ ต้องแยก - แยก Login และ Share เป็นคนละ LIFF App

# LIFF ID สำหรับ Share (แชร์การ์ด)
LIFF_ID=2008995579-bGPQiNTN

# LIFF ID สำหรับ Login (เข้าสู่ระบบ)
LIFF_LOGIN_ID=2009003364-mn9VYzUq
```

---

## 🎯 คำตอบสำหรับคำถาม

**Q: LINE_CHANNEL_ID และ LINE_CHANNEL_SECRET ต้องแยกหรือไม่?**

**A: ไม่ต้องแยก** ✅
- ใช้ Channel เดียวกันสำหรับทั้ง Login และ Share
- เป็น Channel หลักที่สร้างใน LINE Developers Console
- OAuth flow ใช้ Channel เดียวกัน

**Q: แล้วต้องตั้งค่าแบบไหน?**

**A: ตั้งค่าตามนี้:**
1. **LINE Channel:** ใช้ตัวเดียว (ไม่ต้องแยก)
2. **LIFF App:** แยกเป็น 2 ตัว (Login และ Share)

---

## 📝 Checklist

### LINE Channel (ไม่ต้องแยก):
- [ ] มี `LINE_CHANNEL_ID` (1 ตัว)
- [ ] มี `LINE_CHANNEL_SECRET` (1 ตัว)
- [ ] มี `LINE_CALLBACK_URL` (1 ตัว)

### LIFF App (ต้องแยก):
- [ ] มี `LIFF_ID` (สำหรับ Share)
- [ ] มี `LIFF_LOGIN_ID` (สำหรับ Login)
- [ ] ทั้ง 2 ตัวอยู่ใน Channel เดียวกัน (`LINE_CHANNEL_ID`)

---

## 🔗 เอกสารที่เกี่ยวข้อง

- [LIFF_SETUP_VERIFICATION.md](./LIFF_SETUP_VERIFICATION.md) - Checklist การตั้งค่า LIFF App
- [LIFF_SETUP_CHECKLIST.md](./LIFF_SETUP_CHECKLIST.md) - Checklist แบบย่อ
