require('dotenv').config();

// โหมด dev บังคับใช้ webpack แทน Turbopack (เลี่ยง error infer root เป็น frontend/app)
// Next อ่าน turbo: !!process.env.TURBOPACK — ต้องไม่ตั้งหรือลบให้เป็น undefined (ถ้าตั้งเป็น '0' จะยังเป็น truthy)
if (process.env.NODE_ENV !== 'production') {
  delete process.env.TURBOPACK;
}

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs-extra');
const next = require('next');

const apiRoutes = require('./routes/api');
const authRoutes = require('./routes/auth');
const cmsApiRoutes = require('./routes/cmsApi');

const projectRoot = __dirname;
const PORT = process.env.PORT || 3000;
const dev = process.env.NODE_ENV !== 'production';
const nextApp = next({ dev, dir: path.join(projectRoot, 'frontend') });
const handle = nextApp.getRequestHandler();

const app = express();

// ต้องเปิดเมื่อรันหลัง proxy (เช่น Cloudflare Tunnel) เพื่อให้ rate-limit อ่าน IP ถูกต้อง
app.set('trust proxy', 1);

// Security headers — ลดความเสี่ยง XSS, clickjacking, MIME sniffing
app.use((req, res, next) => {
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

app.use(cors());
// เพิ่ม limit สำหรับ body parser (ป้องกัน 413 จาก Express)
// หมายเหตุ: multer จัดการ multipart/form-data แยก แต่ตั้งค่าไว้เพื่อความปลอดภัย
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const dirs = ['uploads/images', 'uploads/cms/settings', 'uploads/cms/qr', 'json'];
dirs.forEach((dir) => { fs.ensureDirSync(path.join(projectRoot, dir)); });

app.use('/api/cms', cmsApiRoutes);
app.use('/api', apiRoutes);
app.use('/api', authRoutes);
app.use('/api/auth', authRoutes);

app.use('/uploads', express.static(path.join(projectRoot, 'uploads')));
app.use('/json', express.static(path.join(projectRoot, 'json')));

app.all('*', (req, res) => handle(req, res));

app.use((err, req, res, nextHandler) => {
  console.error('Error:', err.message || err);
  res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาดในระบบ: ' + err.message });
});

app.use((req, res) => {
  res.status(404).json({ success: false, message: 'ไม่พบหน้าที่ต้องการ' });
});

// ป้องกัน process crash จาก unhandled rejection (เช่น ใน create-card) — log แล้วไม่ exit
process.on('unhandledRejection', (reason, promise) => {
  const msg = reason && typeof reason === 'object' && reason.message ? reason.message : String(reason);
  console.error('Unhandled Rejection:', msg);
});

const HOST = process.env.HOST || '0.0.0.0'; // 0.0.0.0 ให้ Cloudflare Tunnel / proxy เข้าถึงได้

nextApp.prepare().then(() => {
  app.listen(PORT, HOST, () => {
    console.log('🚀 Server is running on http://' + (HOST === '0.0.0.0' ? 'localhost' : HOST) + ':' + PORT);
    console.log('📁 Environment: ' + (process.env.NODE_ENV || 'development'));
    console.log('🔗 LIFF ID: ' + (process.env.LIFF_ID || ''));
    console.log('📦 Frontend: Next.js (same port)');
  });
}).catch((err) => {
  console.error('Next.js prepare failed:', err);
  process.exit(1);
});

module.exports = app;
