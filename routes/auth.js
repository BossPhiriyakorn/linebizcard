const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const lineAuthController = require('../controllers/lineAuthController');
const emailVerificationController = require('../controllers/emailVerificationController');
const { rateLimitLogin, rateLimitOTPRequest, rateLimitOTPVerify } = require('../middleware/rateLimit');

// Email/Password Authentication (rate limit ป้องกัน brute force)
router.post('/register', authController.register);
router.post('/login', rateLimitLogin, authController.login);
router.post('/logout', authController.logout);

// Email Verification (OTP)
router.post('/send-otp', rateLimitOTPRequest, emailVerificationController.sendOTP);
router.post('/verify-otp', rateLimitOTPVerify, emailVerificationController.verifyOTP);
router.get('/verification-status', emailVerificationController.getVerificationStatus);

// LINE Authentication
router.get('/line/login', lineAuthController.lineLogin);
router.get('/line/callback', lineAuthController.lineCallback);
router.get('/line/user', lineAuthController.getLineUser);
router.post('/line/complete-profile', require('../middleware/auth').authenticateToken, lineAuthController.completeProfile);

// LIFF Login (สำหรับ LIFF app) — rate limit ป้องกัน spam
router.post('/line/liff-login', rateLimitLogin, async (req, res) => {
    try {
        const pool = require('../config/database');
        const { generateToken } = require('../middleware/auth');
        const { line_user_id, display_name } = req.body;

        if (!line_user_id) {
            return res.status(400).json({
                success: false,
                message: 'ไม่พบ LINE User ID'
            });
        }

        // ค้นหาหรือสร้าง user
        let user;
        const existingUser = await pool.query(
            'SELECT * FROM users WHERE line_user_id = $1',
            [line_user_id]
        );

        if (existingUser.rows.length > 0) {
            user = existingUser.rows[0];
        } else {
            // สร้าง user ใหม่
            const result = await pool.query(
                `INSERT INTO users (username, email, password, line_user_id, login_type) 
                VALUES ($1, $2, $3, $4, $5) 
                RETURNING id, username, email, line_user_id, login_type`,
                [
                    display_name || 'LINE User',
                    `line_${line_user_id}@line.local`,
                    require('crypto').randomBytes(32).toString('hex'),
                    line_user_id,
                    'line'
                ]
            );
            user = result.rows[0];
        }

        // สร้าง token
        const token = generateToken(user);

        res.json({
            success: true,
            token: token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                line_user_id: user.line_user_id,
                login_type: user.login_type
            }
        });
    } catch (error) {
        console.error('LIFF login error:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ'
        });
    }
});

module.exports = router;
