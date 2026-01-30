require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs-extra');

// Import routes
const indexRoutes = require('./routes/index');
const apiRoutes = require('./routes/api');
const authRoutes = require('./routes/auth');
const shareRoutes = require('./routes/share');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));
app.use('/json', express.static('json'));

// สร้างโฟลเดอร์ที่จำเป็น
const dirs = ['uploads/images', 'json'];
dirs.forEach(dir => {
    fs.ensureDirSync(dir);
});

// Routes
app.use('/', indexRoutes);
app.use('/api', apiRoutes);
app.use('/api', authRoutes); // /api/login, /api/register, /api/logout, /api/line/login, /api/line/callback
app.use('/api/auth', authRoutes); // /api/auth/line/login, /api/auth/line/callback (duplicate for compatibility)
app.use('/share', shareRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({
        success: false,
        message: 'เกิดข้อผิดพลาดในระบบ: ' + err.message
    });
});

// 404 handler — ถ้าเป็น GET ไปหน้าแก้ไขการ์ดแต่ route ไม่ตรง ให้ส่ง HTML พร้อมลิงค์กลับ
app.use((req, res) => {
    const wantsHtml = req.method === 'GET' && (!req.get('Accept') || req.get('Accept').includes('text/html'));
    if (wantsHtml && req.path.startsWith('/edit-card')) {
        res.status(404).type('html').send(`
<!DOCTYPE html>
<html lang="th">
<head><meta charset="UTF-8"><title>ไม่พบหน้า</title></head>
<body style="font-family: sans-serif; padding: 20px; text-align: center;">
  <h1>ไม่พบหน้าที่ต้องการ</h1>
  <p><a href="/my-cards">กลับไปรายการการ์ด</a></p>
  <p style="color:#666;">ถ้ากดปุ่มแก้ไขแล้วเจอหน้านี้ กรุณารีสตาร์ทเซิร์ฟเวอร์ (npm start) แล้วลองใหม่</p>
</body></html>`);
        return;
    }
    res.status(404).json({
        success: false,
        message: 'ไม่พบหน้าที่ต้องการ'
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
    console.log(`📁 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 LIFF ID: ${process.env.LIFF_ID}`);
});

module.exports = app;
