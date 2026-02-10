# วิเคราะห์: ทำไม bamboo-DB build ไม่ค้าง แต่ line_flex_tem (ของเรา) บางครั้งรันอ็อค

## สรุปความต่างหลัก

| หัวข้อ | bamboo-DB | line_flex_tem (ของเรา) |
|--------|------------|--------------------------|
| **Next.js** | ^15.1.0 | ^16.1.6 |
| **React** | ^19.1.0 | ^18.2.0 |
| **Turbopack** | ไม่ได้เปิดใน config | เปิด `turbopack: { root }` ใน next.config |
| **Webpack** | มี custom splitChunks, externals | ไม่มี แค่ config พื้นฐาน |
| **Cache ที่ลบตอน clean** | `.next`, `node_modules/.cache`, `.turbo` | เฉพาะ `frontend/.next` |
| **Build script** | `next build` ตรงๆ | `next build` + NODE_OPTIONS=--max-old-space-size=2048 |
| **next.config โหลด .env** | ไม่โหลด dotenv ใน config | โหลด `dotenv` จาก `../.env` ตอน build |
| **Output** | `output: 'standalone'` ใน production | ไม่ได้ตั้ง |

---

## สาเหตุที่ build ของเรา “รันอ็อค” ได้บ่อยกว่า

1. **Next.js 16 + Turbopack**  
   Next 16 ใช้ Turbopack เป็น default สำหรับ build; ถ้า cache หรือ dependency พัง หรือ memory ไม่พอ build อาจค้างหรือช้ามาก bamboo ใช้ Next 15 ไม่มี Turbopack ใน config จึงใช้ webpack เก่าที่เสถียรกว่าในหลายเครื่อง

2. **ลบ cache ไม่ครบ**  
   bamboo ลบ `.next`, `node_modules/.cache`, และ `.turbo` ตอน clear-cache ของเราลบแค่ `frontend/.next` ถ้า `.turbo` หรือ cache ใน `node_modules` เสีย build อาจค้างหรือผลเก่าค้าง

3. **ไม่มี Webpack optimization**  
   bamboo ตั้ง splitChunks (vendor/common), runtimeChunk และ externals (leaflet) ช่วยแบ่ง memory และลดโอกาส build ค้างจาก bundle ใหญ่ของเราไม่มี custom webpack จึงพึ่ง default ของ Next อย่างเดียว

4. **โหลด dotenv ใน next.config**  
   เราใช้ `require('dotenv').config({ path: '../.env' })` ใน `frontend/next.config.js` ตอน build ถ้า path ไม่ตรง, ไฟล์ไม่มี หรือมี env ผิดพลาด อาจทำให้ config โหลดช้าหรือมี side effect ที่ทำให้ build ดูเหมือนค้าง

5. **Memory**  
   เราเพิ่ม `--max-old-space-size=2048` แล้วดีอยู่แล้ว bamboo ไม่ได้เขียนไว้ใน package.json แต่ถ้าเครื่อง memory น้อย การไม่มี splitChunks อาจทำให้ของเรากิน memory มากกว่า

---

## แนวทางให้ build ของเราเสถียรแบบ bamboo (ไม่รันอ็อค)

1. **ลบ cache ครบก่อน build (ทำใน clean-build)**  
   - ลบ `frontend/.next`  
   - ลบ `frontend/node_modules/.cache`  
   - ลบ `frontend/.turbo` (มีเมื่อใช้ Turbopack)

2. **ไม่บังคับใช้ Turbopack ตอน build (ถ้ายังค้าง)**  
   - ใน Next 16 ถ้า build ยังค้าง ลองปิด turbopack สำหรับ production (หรือใช้แค่ตอน dev)  
   - หรือรัน build ด้วย flag ที่ใช้ webpack แทน (ตามที่ Next 16 รองรับ)

3. **เพิ่ม Webpack optimization ใน next.config (แบบ bamboo)**  
   - ตั้ง `splitChunks` (เช่น แยก vendor / common)  
   - ตั้ง `runtimeChunk`  
   - ไม่ต้อง externals ถ้าไม่มี leaflet/pdf.js แบบ bamboo

4. **กัน dotenv ใน next.config**  
   - ใช้ `path.resolve(__dirname, '../.env')` และตรวจว่าไฟล์มีก่อนโหลด  
   - หรือย้ายการอ่าน env ไปใช้แค่ใน runtime (เช่นใน server หรือ API) แทนโหลดใน next.config ตอน build

5. **ใช้ build แบบ clean เป็นค่าเริ่มต้นตอน deploy**  
   - ตอน deploy ให้รัน `npm run build:clean` (ที่ลบ .next แล้วค่อย build) แทน `npm run build` ตรงๆ  
   - เหมือนแนวทาง “ลบ cache ก่อน build” ที่ช่วยแก้ build ค้างได้บ่อย

---

## สรุปหนึ่งบรรทัด

bamboo-DB build ไม่ค้างเพราะใช้ **Next 15, ไม่พึ่ง Turbopack ใน config, ลบ cache ครบ (.next + .turbo + node_modules/.cache), และมี Webpack splitChunks** ส่วนของเราใช้ Next 16 + Turbopack และลบแค่ `.next` จึงมีโอกาสรันอ็อคมากกว่า ถ้าทำ 4 ข้อด้านบน (ลบ cache ครบ / กัน turbopack ตอน build ถ้าจำเป็น / เพิ่ม webpack optimization / กัน dotenv ใน next.config) และใช้ build:clean ตอน deploy โอกาสที่ build จะไม่รันอ็อคจะใกล้เคียง bamboo-DB
