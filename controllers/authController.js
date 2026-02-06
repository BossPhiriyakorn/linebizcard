const pool = require('../config/database');
const bcrypt = require('bcrypt');
const { generateToken } = require('../middleware/auth');
const { addCmsNotification } = require('../utils/cmsNotification');
const { generateOTP, sendOTPEmail } = require('../services/emailService');

/**
 * ลงทะเบียนผู้ใช้ใหม่
 */
async function register(req, res) {
    try {
        const { username, email, password } = req.body;

        // Validation
        if (!username || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'กรุณากรอกข้อมูลให้ครบถ้วน'
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร'
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

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert user
        const result = await pool.query(
            'INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING id, username, email, created_at',
            [username, email, hashedPassword]
        );

        const user = result.rows[0];
        addCmsNotification(pool, {
            notification_type: 'new_signup',
            title: 'ลูกค้าสมัครใหม่',
            message: `${user.username} (${user.email})`,
            link_url: '/cms/users',
            related_user_id: user.id
        }).catch(() => {});

        // ส่ง OTP อัตโนมัติหลัง register
        try {
            const otpCode = generateOTP();
            const expiryMinutes = parseInt(process.env.OTP_EXPIRY_MINUTES || '5');
            const expiresAt = new Date();
            expiresAt.setMinutes(expiresAt.getMinutes() + expiryMinutes);

            // บันทึก OTP ใน database
            await pool.query(
                `INSERT INTO email_verifications (user_id, email, otp_code, expires_at)
                 VALUES ($1, $2, $3, $4)`,
                [user.id, user.email, otpCode, expiresAt]
            );

            // อัปเดต last_otp_sent_at
            await pool.query(
                'UPDATE users SET last_otp_sent_at = CURRENT_TIMESTAMP WHERE id = $1',
                [user.id]
            );

            // ส่งอีเมล OTP (ไม่ต้องรอผลลัพธ์)
            sendOTPEmail(user.email, otpCode).catch(err => {
                console.error('Failed to send OTP email after registration:', err);
            });
        } catch (otpError) {
            console.error('Error creating OTP after registration:', otpError);
            // ไม่ต้อง fail registration ถ้าส่ง OTP ไม่สำเร็จ
        }

        const token = generateToken(user);

        res.status(201).json({
            success: true,
            message: 'ลงทะเบียนสำเร็จ กรุณาตรวจสอบอีเมลเพื่อยืนยันบัญชี',
            token: token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                email_verified: false
            },
            requires_verification: true
        });
    } catch (error) {
        console.error('Register error:', error);
        
        // Handle unique constraint violation
        if (error.code === '23505') {
            const field = error.constraint.includes('username') ? 'username' : 'email';
            return res.status(400).json({
                success: false,
                message: `${field === 'username' ? 'ชื่อผู้ใช้' : 'อีเมล'}นี้ถูกใช้งานแล้ว`
            });
        }

        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการลงทะเบียน'
        });
    }
}

/**
 * เข้าสู่ระบบ
 */
async function login(req, res) {
    try {
        const { email, username, password } = req.body;
        const loginField = email || username;

        if (!loginField || !password) {
            return res.status(400).json({
                success: false,
                message: 'กรุณากรอกอีเมล/ชื่อผู้ใช้และรหัสผ่าน'
            });
        }

        // Find user by email or username
        const result = await pool.query(
            'SELECT * FROM users WHERE email = $1 OR username = $1',
            [loginField]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'อีเมล/ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง'
            });
        }

        const user = result.rows[0];

        // ถ้าบัญชีถูกระงับ → ห้ามเข้าสู่ระบบ
        if (user.is_active === false) {
            return res.status(403).json({
                success: false,
                message: 'บัญชีถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ'
            });
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                message: 'อีเมล/ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง'
            });
        }

        // Generate token
        const token = generateToken(user);

        // ตรวจสอบสถานะการยืนยันอีเมล
        const emailVerified = user.email_verified || false;
        let message = 'เข้าสู่ระบบสำเร็จ';
        
        if (!emailVerified && user.login_type === 'email') {
            message = 'เข้าสู่ระบบสำเร็จ แต่กรุณายืนยันอีเมลของคุณ';
        }

        res.json({
            success: true,
            message: message,
            token: token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                email_verified: emailVerified
            },
            requires_verification: !emailVerified && user.login_type === 'email'
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ'
        });
    }
}

/**
 * ออกจากระบบ
 */
async function logout(req, res) {
    // JWT เป็น stateless ดังนั้น logout อยู่ฝั่ง client
    // แต่เราสามารถส่ง response สำเร็จได้
    res.json({
        success: true,
        message: 'ออกจากระบบสำเร็จ'
    });
}

module.exports = {
    register,
    login,
    logout
};
