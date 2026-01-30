# Checklist การตั้งค่า LIFF App

## ⚠️ สำคัญ: แยก LIFF App เป็น 2 ตัว (Login และ Share)

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

## ✅ Checklist การตั้งค่า

### LIFF App สำหรับ Login (`2009003364-mn9VYzUq`):
- [ ] Endpoint URL = `https://quarterly-javascript-press-functions.trycloudflare.com/liff/login`
- [ ] shareTargetPicker = OFF
- [ ] Scope = `profile`, `openid`

### LIFF App สำหรับ Share (`2008995579-bGPQiNTN`):
- [ ] Endpoint URL = `https://quarterly-javascript-press-functions.trycloudflare.com` (โดเมนหลัก ไม่มี path)
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

## 📖 ดูรายละเอียดเพิ่มเติม

สำหรับ checklist แบบละเอียดและขั้นตอนการตรวจสอบ:
👉 **[LIFF_SETUP_VERIFICATION.md](./LIFF_SETUP_VERIFICATION.md)**

---

## หมายเหตุ

- ถ้า BASE_URL เปลี่ยน (เช่น Cloudflare Tunnel URL เปลี่ยน) → ต้องอัปเดต Endpoint URL ใน LINE Developers Console ให้ตรงกัน
- shareTargetPicker ต้องเปิดใน LIFF app ที่ตั้ง Endpoint URL = โดเมนหลักเท่านั้น
- แยก Login และ Share เป็นคนละ LIFF app เพื่อความชัดเจนและง่ายต่อการจัดการ
