const express = require('express');
const router = express.Router();
const { authenticateToken, requireActiveUser, requireActiveMembership } = require('../middleware/auth');
const templateController = require('../controllers/templateController');
const cardController = require('../controllers/cardController');
const packageController = require('../controllers/packageController');
const couponController = require('../controllers/couponController');
const paymentChannelController = require('../controllers/paymentChannelController');
const pendingPaymentController = require('../controllers/pendingPaymentController');
const linePayController = require('../controllers/linePayController');
const { uploadSingle, uploadMultiple, uploadSlip, handleUploadError } = require('../middleware/upload');
const { rateLimitCreateCard, rateLimitPayment, rateLimitPaymentChannels } = require('../middleware/rateLimit');
const pool = require('../config/database');
const { decryptIfEncrypted } = require('../utils/encryption');

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

// แพ็กเกจ (สำหรับลูกค้าเลือกหลังสมัคร) — rate limit ลด abuse
router.get('/packages', packageController.getActivePackages);
router.post('/choose-package', rateLimitPayment, authenticateToken, packageController.choosePackage);
router.post('/confirm-payment-after-3ds', rateLimitPayment, authenticateToken, requireActiveUser, packageController.confirmPaymentAfter3ds);
router.post('/validate-coupon', rateLimitPayment, authenticateToken, packageController.validateCoupon);
router.post('/create-pending-payment', rateLimitPayment, authenticateToken, requireActiveUser, packageController.createPendingPayment);

// LINE Pay (รอเชื่อมต่อ API จริง)
router.get('/line-pay/status', (req, res) => {
    try {
        const linePayService = require('../services/linePayService');
        const status = linePayService.getStatus();
        res.json({ success: true, data: status });
    } catch (err) {
        res.json({ success: true, data: { configured: false, provider: null } });
    }
});
router.post('/line-pay/reserve', authenticateToken, requireActiveUser, linePayController.reserve);
router.get('/line-pay/confirm', linePayController.confirm);

// ช่องทางการชำระเงิน (ลูกค้า) — rate limit ลด abuse
router.get('/payment-channels', rateLimitPaymentChannels, authenticateToken, requireActiveUser, paymentChannelController.getMyChannels);
router.post('/payment-channels', rateLimitPaymentChannels, authenticateToken, requireActiveUser, paymentChannelController.createChannel);
router.put('/payment-channels/:id', rateLimitPaymentChannels, authenticateToken, requireActiveUser, paymentChannelController.updateChannel);
router.delete('/payment-channels/:id', rateLimitPaymentChannels, authenticateToken, requireActiveUser, paymentChannelController.deleteChannel);

router.get('/user/payment-history', authenticateToken, requireActiveUser, packageController.getMyPaymentHistory);
router.get('/payment-requests/:id', authenticateToken, requireActiveUser, pendingPaymentController.getPaymentRequest);
router.post('/payment-requests/:id/upload-slip', authenticateToken, requireActiveUser, uploadSlip, handleUploadError, pendingPaymentController.uploadSlip);

// สถานะ Payment Gateway (สำหรับตรวจสอบว่าเปิดใช้บัตรเครดิต/เดบิตได้หรือยัง)
router.get('/payment-gateway/status', (req, res) => {
    try {
        const paymentGatewayService = require('../services/paymentGatewayService');
        const status = paymentGatewayService.getStatus();
        res.json({ success: true, data: status });
    } catch (err) {
        res.json({ success: true, data: { configured: false, provider: null, publicKey: null } });
    }
});

// คูปอง (ลูกค้า)
router.get('/coupons/my', authenticateToken, requireActiveUser, couponController.getMyCoupons);
router.post('/coupons/save-for-next-payment', authenticateToken, requireActiveUser, couponController.saveForNextPayment);
router.post('/coupons/redeem', authenticateToken, requireActiveUser, couponController.redeemCoupon);

// เนื้อหาสำหรับการยินยอม (นโยบายความเป็นส่วนตัว / ข้อกำหนด) — ใช้แสดงบนหน้าลงทะเบียน (ไม่ต้อง login)
router.get('/consent-documents', async (req, res) => {
    try {
        const r = await pool.query(
            'SELECT privacy_policy_content, terms_of_service_content FROM cms_settings WHERE id = 1 LIMIT 1'
        );
        const row = r.rows[0] || {};
        res.json({
            success: true,
            data: {
                privacy_policy: row.privacy_policy_content || '',
                terms_of_service: row.terms_of_service_content || ''
            }
        });
    } catch (err) {
        res.json({ success: true, data: { privacy_policy: '', terms_of_service: '' } });
    }
});

// Templates
router.get('/templates', templateController.getAllTemplates);
router.get('/templates/:id', templateController.getTemplateById);

// Cards (ต้อง authenticate + ยังไม่ระงับ + สมาชิกยังไม่หมดอายุ) - สร้าง/ดู/แก้/ลบ/แชร์การ์ดใช้ไม่ได้ถ้าหมดอายุ
// create-card: ไม่จำกัด timeout เพื่อรองรับอัปโหลดและแปลงรูปช้า (production / HEIC)
function logCreateCardRequest(req, res, next) {
    console.log('[create-card] POST /api/create-card reached (before auth/upload)');
    next();
}
router.post('/create-card',
    logCreateCardRequest,
    rateLimitCreateCard,
    authenticateToken,
    requireActiveUser,
    requireActiveMembership,
    uploadMultiple,
    handleUploadError,
    cardController.createCard
);
router.get('/my-cards', authenticateToken, requireActiveUser, requireActiveMembership, cardController.getMyCards);
router.get('/cards/:id', authenticateToken, requireActiveUser, requireActiveMembership, cardController.getCardById);
router.put('/cards/:id', authenticateToken, requireActiveUser, requireActiveMembership, uploadMultiple, handleUploadError, cardController.updateCard);
router.delete('/cards/:id', authenticateToken, requireActiveUser, requireActiveMembership, cardController.deleteCard);

// JSON การ์ดสำหรับหน้าแชร์ (ไม่ต้อง auth — ดึงจาก Drive หรือโฟลเดอร์ json/)
router.get('/card-json/:name', cardController.getCardJson);

// Proxy รูปจาก Google Drive — แก้ปัญหา Drive redirect ที่ LINE/browser ไม่แสดง
// ใช้ cache 1 ชม. เพื่อลดการเรียก Drive API ซ้ำ
router.get('/drive-image/:fileId', async (req, res) => {
    try {
        const { getImageBuffer, isDriveEnabled } = require('../utils/googleDrive');
        const fileId = req.params.fileId;
        if (!fileId || !isDriveEnabled()) {
            return res.status(404).send('Not found');
        }
        const { buffer, mimeType } = await getImageBuffer(fileId);
        res.set('Content-Type', mimeType);
        res.set('Content-Length', buffer.length);
        res.set('Cache-Control', 'public, max-age=3600, s-maxage=86400'); // cache 1 ชม. (browser), 24 ชม. (CDN)
        res.set('Access-Control-Allow-Origin', '*');
        res.send(buffer);
    } catch (err) {
        console.error('[drive-image] Error serving image:', err && err.message ? err.message : '');
        if (err.code === 404 || (err.errors && err.errors[0] && err.errors[0].reason === 'notFound')) {
            return res.status(404).send('Image not found');
        }
        return res.status(502).send('Failed to load image');
    }
});

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

// Config endpoint: ส่งค่าการตั้งค่าสำหรับ frontend (ขนาดไฟล์สูงสุด, compress threshold)
router.get('/config', (req, res) => {
    try {
        const MAX_FILE_SIZE_DEFAULT = 1073741824; // 1GB
        const COMPRESS_THRESHOLD_MB_DEFAULT = 2; // 2MB
        
        const maxFileSize = parseInt(process.env.MAX_FILE_SIZE, 10) || MAX_FILE_SIZE_DEFAULT;
        const compressThresholdMB = parseInt(process.env.COMPRESS_THRESHOLD_MB, 10) || COMPRESS_THRESHOLD_MB_DEFAULT;
        
        res.json({
            success: true,
            data: {
                maxFileSize: maxFileSize,
                maxFileSizeMB: Math.round(maxFileSize / 1024 / 1024),
                compressThresholdMB: compressThresholdMB
            }
        });
    } catch (err) {
        console.error('Config endpoint error:', err);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการดึงค่าการตั้งค่า'
        });
    }
});

// Debug Log Endpoint (สำหรับ frontend ส่ง log มาแสดงใน pm2 logs)
router.post('/debug-log', (req, res) => {
    try {
        const { level = 'info', message, timestamp } = req.body;
        const logPrefix = '[Frontend-Log]';
        const timeStr = timestamp ? new Date(timestamp).toLocaleTimeString('th-TH', { hour12: false }) : new Date().toLocaleTimeString('th-TH', { hour12: false });
        
        if (level === 'error') {
            console.error(`${logPrefix} [${timeStr}] ${message}`);
        } else {
            console.log(`${logPrefix} [${timeStr}] ${message}`);
        }
        
        res.json({ success: true });
    } catch (err) {
        // Silent fail - ไม่ให้ log เอง error
        res.json({ success: false });
    }
});

// User Profile (ต้อง authenticate + ยังเปิดใช้งานอยู่) — รวม created_at และ membership (วันสมัคร, วันหมดอายุ, แพ็กเกจ)
router.get('/user/profile', authenticateToken, requireActiveUser, async (req, res) => {
    try {
        const pool = require('../config/database');
        const userId = req.user.id;

        const userResult = await pool.query(
            `SELECT id, username, email, first_name, last_name, nickname, phone, line_user_id, login_type, messaging_api_user_id, profile_image_url, created_at, 
             COALESCE(email_verified, false) AS email_verified
            FROM users WHERE id = $1`,
            [userId]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'ไม่พบ user'
            });
        }

        const rawUser = userResult.rows[0];
        // ถอดรหัส PII ก่อนส่งให้ frontend แสดงผล (ชื่อ นามสกุล ชื่อเล่น เบอร์โทร)
        const user = {
            ...rawUser,
            first_name: decryptIfEncrypted(rawUser.first_name) ?? rawUser.first_name,
            last_name: decryptIfEncrypted(rawUser.last_name) ?? rawUser.last_name,
            nickname: decryptIfEncrypted(rawUser.nickname) ?? rawUser.nickname,
            phone: decryptIfEncrypted(rawUser.phone) ?? rawUser.phone
        };

        // ตรวจสอบว่ามี card อยู่แล้วหรือไม่
        const cardResult = await pool.query(
            'SELECT id, unique_id, liff_url FROM user_cards WHERE user_id = $1 LIMIT 1',
            [userId]
        );

        // สมาชิกภาพ (แพ็กเกจ) — ดึง membership ล่าสุด (รวมหมดอายุ) เพื่อแสดงวันสมัคร/หมดอายุ
        // แต่ถ้าหมดอายุแล้ว → package_name = null (ใช้เป็นตัวบ่งชี้ว่า "ไม่มีแพ็กเกจ")
        let membership = null;
        let remainingDays = null;
        try {
            const memResult = await pool.query(
                `SELECT m.id, m.membership_type, m.start_date, m.end_date, m.status, p.name AS package_name,
                 GREATEST(0, EXTRACT(EPOCH FROM (m.end_date - CURRENT_TIMESTAMP)) / 86400)::INTEGER AS remaining_days,
                 (m.end_date > CURRENT_TIMESTAMP AND m.status = 'active') AS is_active
                 FROM memberships m 
                 LEFT JOIN packages p ON p.id = m.package_id 
                 WHERE m.user_id = $1 AND m.status = 'active'
                 ORDER BY m.end_date DESC LIMIT 1`,
                [userId]
            );
            if (memResult.rows.length > 0) {
                const row = memResult.rows[0];
                remainingDays = row.remaining_days;
                membership = {
                    membership_type: row.membership_type,
                    start_date: row.start_date,
                    end_date: row.end_date,
                    status: row.status,
                    // ถ้าหมดอายุแล้ว → package_name = null (ใช้เป็นตัวบ่งชี้ว่า "ยังไม่ได้สมัครแพ็กเกจ")
                    package_name: row.is_active ? (row.package_name || row.membership_type) : null,
                    remaining_days: remainingDays
                };
            }
        } catch (e) {
            // ตาราง memberships หรือ packages อาจยังไม่มี
        }

        res.json({
            success: true,
            data: {
                ...user,
                has_card: cardResult.rows.length > 0,
                existing_card: cardResult.rows[0] || null,
                membership: membership || null
            }
        });
    } catch (error) {
        console.error('Get user profile error:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการดึงข้อมูล profile'
        });
    }
});

// ยกเลิกแพ็กเกจปัจจุบัน (ลูกค้า) — ตั้งสมาชิกภาพเป็น cancelled และ end_date = วันนี้
router.post('/cancel-membership', authenticateToken, requireActiveUser, async (req, res) => {
    try {
        const userId = parseInt(req.user?.id, 10);
        if (isNaN(userId)) return res.status(401).json({ success: false, message: 'กรุณาเข้าสู่ระบบ' });
        const result = await pool.query(
            `UPDATE memberships SET status = 'cancelled', end_date = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP 
             WHERE user_id = $1 AND status = 'active' RETURNING id`,
            [userId]
        );
        if (result.rows.length === 0) {
            return res.status(400).json({ success: false, message: 'ไม่พบแพ็กเกจที่ใช้งานอยู่ หรือยกเลิกแล้ว' });
        }
        res.json({ success: true, message: 'ยกเลิกแพ็กเกจแล้ว' });
    } catch (err) {
        console.error('Cancel membership error:', err);
        res.status(500).json({ success: false, message: 'ดำเนินการไม่สำเร็จ' });
    }
});

module.exports = router;
