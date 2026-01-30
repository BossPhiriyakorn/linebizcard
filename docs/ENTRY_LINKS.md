# ลิงค์เข้าใช้งานแพลตฟอร์ม

**ใช้แค่โดเมนในการเข้าใช้งาน** — แทนที่ `BASE_URL` ด้วยโดเมนจริง (เช่น จาก Cloudflare Tunnel หรือเซิร์ฟเวอร์) ลิงค์ LIFF Login (`/liff/login`) จะ redirect ไป LINE Login บนโดเมน

---

## ตัวแปรที่ใช้

- **BASE_URL** = ค่าจาก `.env` (เช่น `https://your-domain.trycloudflare.com` หรือ `http://localhost:3000`)
- **LIFF_ID** = ค่าจาก `.env` (จาก LINE Developers Console)

---

## ลิงค์หลัก (ใช้แค่โดเมนในการเข้าใช้งาน)

| การใช้งาน | URL | หมายเหตุ |
|-----------|-----|----------|
| **เข้าแอป / หน้าแรก** | `{BASE_URL}/` | ทางเข้าแอปหลัก — ใช้ลิงค์นี้ใน Rich Menu ได้ (ถ้าไม่มี name ใน URL จะพาไป LINE Login อัตโนมัติ) |
| **เริ่ม LINE Login** | `{BASE_URL}/api/auth/line/login` | กดแล้วไปหน้า LINE Login (Allow) |
| **LIFF Login (ลิงค์เก่า)** | `{BASE_URL}/liff/login` | redirect ไป LINE Login บนโดเมน — ไม่ใช้หน้า LIFF แยก |
| **ลงทะเบียน (ลูกค้าใหม่)** | `{BASE_URL}/register-line?token=...` | ระบบ redirect มาให้หลัง LINE Login |
| **สร้างการ์ด** | `{BASE_URL}/create` | ใช้ได้หลังมี token (หรือ `?token=...`) |
| **ดูการ์ดของตัวเอง** | `{BASE_URL}/my-cards` | ใช้ได้หลังมี token |

---

## ลิงค์ LIFF แชร์การ์ด

หลังลูกค้าสร้างการ์ดจะได้ลิงค์รูปแบบ:

```
https://liff.line.me/{LIFF_ID}?name={uniqueId}&id=1
```

- **LIFF_ID** = ค่าใน `.env`
- **uniqueId** = รหัสการ์ด (เช่น จาก `user_cards.unique_id`)

ลูกค้าแชร์ลิงค์นี้ใน LINE ได้ เมื่อใครกดจะเปิดหน้าแชร์การ์ด (Flex Message)

---

## ตัวอย่าง (localhost)

- หน้าแรก: `http://localhost:3000/`
- LIFF Login: `http://localhost:3000/liff/login`
- สร้างการ์ด: `http://localhost:3000/create`
- ดูการ์ด: `http://localhost:3000/my-cards`

---

## ตัวอย่าง (Cloudflare Tunnel / โดเมนจริง)

ถ้า `BASE_URL=https://xxx.trycloudflare.com`:

- หน้าแรก: `https://xxx.trycloudflare.com/`
- LIFF Login: `https://xxx.trycloudflare.com/liff/login`
- Callback (ตั้งใน LINE Developers): `https://xxx.trycloudflare.com/api/auth/line/callback`

---

*อัปเดตล่าสุด: ใช้แค่โดเมนในการเข้าใช้งาน — ลิงค์ LIFF Login redirect ไป LINE Login บนโดเมน*
