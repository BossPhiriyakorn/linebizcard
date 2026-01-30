const express = require('express');
const router = express.Router();
const path = require('path');

// Entry: LIFF Share app มี Endpoint URL = BASE_URL (โดเมนหลัก)
// เสิร์ฟ share.html เสมอ เพื่อให้:
// 1. เมื่อมี ?name=...&id=... → หน้า share ทำงานปกติ
// 2. เมื่อไม่มี query (เช่น หลัง liff.login() redirect กลับมา) → share.html จะใช้ name/id จาก localStorage
// 3. ไม่ redirect ไป /api/auth/line/login เพราะจะทำให้ไป /my-cards หลัง callback
router.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/share.html'));
});

// ไม่ใช้ระบบ login/register ผ่านอีเมล → redirect ไป LINE Login
router.get('/login', (req, res) => {
    res.redirect('/api/auth/line/login');
});

router.get('/register', (req, res) => {
    res.redirect('/api/auth/line/login');
});

router.get('/create', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/create.html'));
});

router.get('/my-cards', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/my-cards.html'));
});

router.get('/edit-card/:id', (req, res) => {
    const filePath = path.resolve(__dirname, '../public/edit-card.html');
    res.sendFile(filePath);
});

// LIFF Pages — ใช้แค่โดเมนในการเข้าใช้งาน: /liff/login redirect ไป LINE Login (โดเมน)
// ถ้ามี ?error=... แสดงหน้า error แทน redirect เพื่อไม่ให้วนลูป
router.get('/liff/login', (req, res) => {
    const baseUrl = process.env.BASE_URL || (req.protocol + '://' + req.get('host'));
    const errorMsg = req.query.error;
    if (errorMsg) {
        const escaped = String(errorMsg)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
        return res.type('html').send(`
<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>เกิดข้อผิดพลาด - LINE Login</title>
    <style>
        body { font-family: 'Segoe UI', sans-serif; max-width: 500px; margin: 40px auto; padding: 20px; }
        .error-box { background: #f8d7da; color: #721c24; padding: 16px; border-radius: 8px; margin: 16px 0; }
        .btn { display: inline-block; background: #06c755; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 12px; }
        .btn:hover { background: #05b04b; }
    </style>
</head>
<body>
    <h1>เกิดข้อผิดพลาดในการเข้าสู่ระบบ</h1>
    <p class="error-box">${escaped}</p>
    <p>กรุณาตรวจสอบการตั้งค่า Callback URL และ Channel ID/Secret ใน LINE Developers ให้ตรงกับโดเมนปัจจุบัน</p>
    <a href="${baseUrl}/api/auth/line/login" class="btn">ลองเข้าสู่ระบบใหม่</a>
</body>
</html>`);
    }
    res.redirect(`${baseUrl}/api/auth/line/login`);
});

router.get('/liff/create', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/create.html'));
});

router.get('/register-line', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/register-line.html'));
});

module.exports = router;
