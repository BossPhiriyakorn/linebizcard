# โฟลเดอร์ Assets สำหรับตกแต่งแอป

- **`icons/`** — เก็บไอคอนแอป (PNG, SVG ฯลฯ) เช่น โลโก้, ไอคอนเมนู
- **`images/`** — เก็บรูปพื้นหลังและภาพประกอบ (พื้นหลังหน้า, การ์ด ฯลฯ)

## ไอคอนเมนู (ต้องมีใน `icons/`)

| ไฟล์ | เมนู |
|------|------|
| `home.png` | หน้าแรก |
| `identification-card.png` | การ์ดของฉัน |
| `new.png` | สร้างการ์ด |
| `crown.png` | แพ็กเกจ |
| `user.png` | โปรไฟล์ |
| `coupon.png` | หัวข้อคูปอง (ในหน้าแพ็กเกจ) |

## ไอคอนเมนู CMS (แอดมิน)

| ไฟล์ | เมนู |
|------|------|
| `dashboard.png` | แดชบอร์ด |
| `flash-card.png` | จัดการแทมเพลต |
| `project-management.png` | จัดการผู้ใช้ |
| `admin.png` | จัดการแอดมิน |
| `history.png` | ประวัติ |
| `settings.png` | ตั้งค่า |

## การใช้งานในโค้ด (Next.js)

- ไฟล์ใน `public/` ใช้ path จาก root เช่น:
  - `/assets/icons/logo.png`
  - `/assets/images/background.png`

ตัวอย่างใน JSX:
```jsx
<img src="/assets/icons/logo.png" alt="โลโก้" />
<div style={{ backgroundImage: 'url(/assets/images/background.png)' }} />
```
