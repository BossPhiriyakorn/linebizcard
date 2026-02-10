const pool = require('../config/database');
const { generateOTP, sendOTPEmail } = require('../services/emailService');
const { hashSha256 } = require('../utils/encryption');

/**
 * ส่ง OTP ไปยังอีเมล
 * POST /api/auth/send-otp
 * Body: { email }
 */
async function sendOTP(req, res) {
    try {
        const { email } = req.body;

        // Validation
        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'กรุณากรอกอีเมล'
            });
        }

        // ตรวจสอบ email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'รูปแบบอีเมลไม่ถูกต้อง'
            });
        }

        // ค้นหาผู้ใช้ด้วยอีเมล
        const userResult = await pool.query(
            'SELECT id, email, last_otp_sent_at, email_verified FROM users WHERE email = $1',
            [email]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'ไม่พบอีเมลนี้ในระบบ'
            });
        }

        const user = userResult.rows[0];

        // ตรวจสอบ cooldown (5 นาที)
        const cooldownMinutes = parseInt(process.env.OTP_COOLDOWN_MINUTES || '5');
        if (user.last_otp_sent_at) {
            const lastSentTime = new Date(user.last_otp_sent_at);
            const now = new Date();
            const diffMinutes = (now - lastSentTime) / (1000 * 60);

            if (diffMinutes < cooldownMinutes) {
                const remainingMinutes = Math.ceil(cooldownMinutes - diffMinutes);
                return res.status(429).json({
                    success: false,
                    message: `กรุณารอ ${remainingMinutes} นาที ก่อนขอรหัสใหม่`,
                    cooldown_remaining: Math.ceil(cooldownMinutes - diffMinutes)
                });
            }
        }

        // สร้าง OTP code
        const otpCode = generateOTP();
        const expiryMinutes = parseInt(process.env.OTP_EXPIRY_MINUTES || '5');
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + expiryMinutes);

        // ลบ OTP เก่าที่ยังไม่ยืนยัน
        await pool.query(
            'DELETE FROM email_verifications WHERE email = $1 AND verified_at IS NULL',
            [email]
        );

        // บันทึกแฮช OTP (SHA-256) แทน plaintext
        const otpHash = hashSha256(otpCode);
        await pool.query(
            `INSERT INTO email_verifications (user_id, email, otp_code, expires_at)
             VALUES ($1, $2, $3, $4)`,
            [user.id, email, otpHash, expiresAt]
        );

        // อัปเดต last_otp_sent_at
        await pool.query(
            'UPDATE users SET last_otp_sent_at = CURRENT_TIMESTAMP WHERE id = $1',
            [user.id]
        );

        // ส่งอีเมล OTP
        try {
            await sendOTPEmail(email, otpCode);
        } catch (emailError) {
            console.error('Error sending OTP email:', emailError);
            // ลบ OTP ที่บันทึกไว้ถ้าส่งอีเมลไม่สำเร็จ (ลบด้วยแฮชที่บันทึกไว้)
            await pool.query(
                'DELETE FROM email_verifications WHERE email = $1 AND otp_code = $2',
                [email, otpHash]
            );
            return res.status(500).json({
                success: false,
                message: 'ไม่สามารถส่งอีเมลได้ กรุณาลองใหม่อีกครั้ง'
            });
        }

        res.json({
            success: true,
            message: 'ส่งรหัส OTP ไปยังอีเมลของคุณแล้ว',
            expires_in_minutes: expiryMinutes
        });
    } catch (error) {
        console.error('Send OTP error:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการส่ง OTP'
        });
    }
}

/**
 * ยืนยัน OTP
 * POST /api/auth/verify-otp
 * Body: { email, otp_code }
 */
async function verifyOTP(req, res) {
    try {
        const { email, otp_code } = req.body;

        // Validation
        if (!email || !otp_code) {
            return res.status(400).json({
                success: false,
                message: 'กรุณากรอกอีเมลและรหัส OTP'
            });
        }

        if (!/^\d{6}$/.test(otp_code)) {
            return res.status(400).json({
                success: false,
                message: 'รหัส OTP ต้องเป็นตัวเลข 6 หลัก'
            });
        }

        // ค้นหา OTP ใน database (เก็บเป็นแฮช SHA-256 — เปรียบเทียบด้วยแฮชที่ส่งมา)
        const otpHashInput = hashSha256(otp_code);
        const otpResult = await pool.query(
            `SELECT ev.*, u.id as user_id, u.email_verified
             FROM email_verifications ev
             JOIN users u ON ev.user_id = u.id
             WHERE ev.email = $1 AND ev.otp_code = $2 AND ev.verified_at IS NULL
             ORDER BY ev.created_at DESC
             LIMIT 1`,
            [email, otpHashInput]
        );

        if (otpResult.rows.length === 0) {
            // เพิ่ม attempts สำหรับ OTP ที่ไม่ถูกต้อง (อัปเดตแถวล่าสุดของอีเมลนี้)
            await pool.query(
                `UPDATE email_verifications SET attempts = attempts + 1
                 WHERE id = (SELECT id FROM email_verifications WHERE email = $1 AND verified_at IS NULL ORDER BY created_at DESC LIMIT 1)`,
                [email]
            );

            return res.status(400).json({
                success: false,
                message: 'รหัส OTP ไม่ถูกต้องหรือหมดอายุแล้ว'
            });
        }

        const otpRecord = otpResult.rows[0];

        // ตรวจสอบว่า OTP หมดอายุหรือไม่
        const expiresAt = new Date(otpRecord.expires_at);
        const now = new Date();

        if (now > expiresAt) {
            return res.status(400).json({
                success: false,
                message: 'รหัส OTP หมดอายุแล้ว กรุณาขอรหัสใหม่'
            });
        }

        // ตรวจสอบจำนวนครั้งที่พยายาม
        const maxAttempts = parseInt(process.env.MAX_OTP_ATTEMPTS || '5');
        if (otpRecord.attempts >= maxAttempts) {
            return res.status(400).json({
                success: false,
                message: 'กรอกรหัสผิดเกินจำนวนครั้งที่กำหนด กรุณาขอรหัสใหม่'
            });
        }

        // อัปเดต OTP เป็น verified
        await pool.query(
            'UPDATE email_verifications SET verified_at = CURRENT_TIMESTAMP WHERE id = $1',
            [otpRecord.id]
        );

        // อัปเดต users table
        await pool.query(
            `UPDATE users 
             SET email_verified = true, email_verified_at = CURRENT_TIMESTAMP 
             WHERE id = $1`,
            [otpRecord.user_id]
        );

        res.json({
            success: true,
            message: 'ยืนยันอีเมลสำเร็จ'
        });
    } catch (error) {
        console.error('Verify OTP error:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการยืนยัน OTP'
        });
    }
}

/**
 * ตรวจสอบสถานะการยืนยันอีเมล
 * GET /api/auth/verification-status
 * Query: ?email=xxx หรือใช้ token จาก auth middleware
 */
async function getVerificationStatus(req, res) {
    try {
        let email;

        // ถ้ามี token ให้ใช้ email จาก user ที่ login
        if (req.user && req.user.email) {
            email = req.user.email;
        } else if (req.query.email) {
            email = req.query.email;
        } else {
            return res.status(400).json({
                success: false,
                message: 'กรุณาระบุอีเมลหรือเข้าสู่ระบบ'
            });
        }

        const result = await pool.query(
            'SELECT id, email, email_verified, email_verified_at, last_otp_sent_at FROM users WHERE email = $1',
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'ไม่พบอีเมลนี้ในระบบ'
            });
        }

        const user = result.rows[0];

        // คำนวณ cooldown remaining
        let cooldown_remaining = null;
        if (user.last_otp_sent_at) {
            const cooldownMinutes = parseInt(process.env.OTP_COOLDOWN_MINUTES || '5');
            const lastSentTime = new Date(user.last_otp_sent_at);
            const now = new Date();
            const diffMinutes = (now - lastSentTime) / (1000 * 60);

            if (diffMinutes < cooldownMinutes) {
                cooldown_remaining = Math.ceil(cooldownMinutes - diffMinutes);
            }
        }

        res.json({
            success: true,
            email: user.email,
            email_verified: user.email_verified,
            email_verified_at: user.email_verified_at,
            cooldown_remaining: cooldown_remaining
        });
    } catch (error) {
        console.error('Get verification status error:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการตรวจสอบสถานะ'
        });
    }
}

module.exports = {
    sendOTP,
    verifyOTP,
    getVerificationStatus
};
