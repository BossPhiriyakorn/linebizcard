const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const templateController = require('../controllers/templateController');
const cardController = require('../controllers/cardController');
const { uploadSingle, uploadMultiple, handleUploadError } = require('../middleware/upload');
const pool = require('../config/database');

// Health check: ตรวจสอบการเชื่อมต่อ API และฐานข้อมูล
router.get('/health', async (req, res) => {
    try {
        await pool.query('SELECT 1');
        res.json({ success: true, db: 'connected', message: 'API และฐานข้อมูลเชื่อมต่อปกติ' });
    } catch (err) {
        console.error('Health check error:', err.message);
        res.status(503).json({ success: false, db: 'disconnected', message: 'ไม่สามารถเชื่อมต่อฐานข้อมูลได้: ' + err.message });
    }
});

// Templates
router.get('/templates', templateController.getAllTemplates);
router.get('/templates/:id', templateController.getTemplateById);

// Cards (ต้อง authenticate) - ใช้ uploadMultiple สำหรับ 2 รูปภาพ
router.post('/create-card', authenticateToken, uploadMultiple, handleUploadError, cardController.createCard);
router.get('/my-cards', authenticateToken, cardController.getMyCards);
router.get('/cards/:id', authenticateToken, cardController.getCardById);
router.put('/cards/:id', authenticateToken, uploadMultiple, handleUploadError, cardController.updateCard);
router.delete('/cards/:id', authenticateToken, cardController.deleteCard);

// LIFF ID
router.get('/liff-id', (req, res) => {
    res.json({
        success: true,
        liff_id: process.env.LIFF_ID
    });
});

// LIFF Login ID
router.get('/liff-login-id', (req, res) => {
    res.json({
        success: true,
        liff_id: process.env.LIFF_LOGIN_ID || process.env.LIFF_ID
    });
});

// User Profile (ต้อง authenticate)
router.get('/user/profile', authenticateToken, async (req, res) => {
    try {
        const pool = require('../config/database');
        const userId = req.user.id;

        // ดึงข้อมูล user profile (รวม messaging_api_user_id สำหรับ Push การ์ดใน LINE)
        const userResult = await pool.query(
            `SELECT id, username, email, first_name, last_name, nickname, phone, line_user_id, login_type, messaging_api_user_id 
            FROM users WHERE id = $1`,
            [userId]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'ไม่พบ user'
            });
        }

        // ตรวจสอบว่ามี card อยู่แล้วหรือไม่
        const cardResult = await pool.query(
            'SELECT id, unique_id, liff_url FROM user_cards WHERE user_id = $1 LIMIT 1',
            [userId]
        );

        res.json({
            success: true,
            data: userResult.rows[0],
            has_card: cardResult.rows.length > 0,
            existing_card: cardResult.rows[0] || null
        });
    } catch (error) {
        console.error('Get user profile error:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการดึงข้อมูล profile'
        });
    }
});

// บันทึก Messaging API User ID (สำหรับ Push การ์ดไป LINE) — ต้อง authenticate
router.put('/user/messaging-api-user-id', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { messaging_api_user_id } = req.body;
        if (!messaging_api_user_id || typeof messaging_api_user_id !== 'string') {
            return res.status(400).json({
                success: false,
                message: 'กรุณาส่ง messaging_api_user_id (User ID จาก Messaging API Channel)'
            });
        }
        await pool.query(
            'UPDATE users SET messaging_api_user_id = $1 WHERE id = $2',
            [messaging_api_user_id.trim(), userId]
        );
        res.json({
            success: true,
            message: 'บันทึก Messaging API User ID เรียบร้อย — ระบบจะส่งการ์ดให้คุณใน LINE เมื่อสร้างการ์ดเสร็จ'
        });
    } catch (error) {
        if (error.code === '42703') {
            return res.status(503).json({
                success: false,
                message: 'ยังไม่ได้รัน migration สำหรับ messaging_api_user_id — รัน database/add_messaging_api_user_id.sql'
            });
        }
        console.error('Save messaging_api_user_id error:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาด: ' + error.message
        });
    }
});

module.exports = router;
