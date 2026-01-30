const pool = require('../config/database');
const bcrypt = require('bcrypt');
const { generateToken } = require('../middleware/auth');

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
        const token = generateToken(user);

        res.status(201).json({
            success: true,
            message: 'ลงทะเบียนสำเร็จ',
            token: token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email
            }
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

        res.json({
            success: true,
            message: 'เข้าสู่ระบบสำเร็จ',
            token: token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email
            }
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
