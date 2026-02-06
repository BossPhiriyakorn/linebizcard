const jwt = require('jsonwebtoken');
const pool = require('../config/database');
require('dotenv').config();

/**
 * Middleware สำหรับตรวจสอบ JWT token
 */
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'ไม่พบ token กรุณาเข้าสู่ระบบ'
        });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({
                success: false,
                message: 'Token ไม่ถูกต้องหรือหมดอายุ'
            });
        }
        req.user = user;
        next();
    });
}

/**
 * ตรวจสอบว่าผู้ใช้ยังมีในระบบและเปิดใช้งานอยู่ (ใช้หลัง authenticateToken บน route ลูกค้า)
 * - ถ้า user ถูกลบออกจาก DB (เช่น หลังรันล้างข้อมูล) → 401 ให้เข้าสู่ระบบใหม่
 * - ถ้าถูกระงับจาก CMS → 403
 */
async function requireActiveUser(req, res, next) {
    try {
        if (!req.user || !req.user.id) return next();
        const result = await pool.query(
            'SELECT COALESCE(is_active, true) AS is_active FROM users WHERE id = $1',
            [req.user.id]
        );
        if (result.rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'ไม่พบผู้ใช้ในระบบ กรุณาเข้าสู่ระบบใหม่'
            });
        }
        if (result.rows[0].is_active !== true) {
            return res.status(403).json({
                success: false,
                message: 'บัญชีถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ'
            });
        }
        next();
    } catch (err) {
        console.error('requireActiveUser error:', err);
        next();
    }
}

/**
 * ตรวจสอบว่าสมาชิกยังไม่หมดอายุ (มี membership ที่ active และ end_date > วันนี้)
 * ใช้กับ route ที่เกี่ยวกับการ์ด (สร้าง/ดู/แก้/ลบ/แชร์) — ถ้าหมดอายุแล้วใช้การ์ดไม่ได้
 */
async function requireActiveMembership(req, res, next) {
    try {
        if (!req.user || !req.user.id) return next();
        const result = await pool.query(
            `SELECT 1 FROM memberships 
             WHERE user_id = $1 AND status = 'active' AND end_date > CURRENT_TIMESTAMP 
             LIMIT 1`,
            [req.user.id]
        );
        if (result.rows.length === 0) {
            return res.status(403).json({
                success: false,
                message: 'สมาชิกหมดอายุ ไม่สามารถสร้างหรือใช้งานการ์ดได้ กรุณาต่ออายุสมาชิก',
                code: 'MEMBERSHIP_EXPIRED'
            });
        }
        next();
    } catch (err) {
        console.error('requireActiveMembership error:', err);
        next();
    }
}

/**
 * สร้าง JWT token
 * @param {Object} user - User object { id, username, email }
 * @returns {string} JWT token
 */
function generateToken(user) {
    return jwt.sign(
        { id: user.id, username: user.username, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );
}

module.exports = {
    authenticateToken,
    requireActiveUser,
    requireActiveMembership,
    generateToken
};
