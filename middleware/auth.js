const jwt = require('jsonwebtoken');
const pool = require('../config/database');
require('dotenv').config();

/** Secret สำหรับลูกค้า (LINE/LIFF) — ใช้กับ API ลูกค้าเท่านั้น */
function getCustomerSecret() {
    return process.env.JWT_SECRET || '';
}

/** Secret สำหรับแอดมิน (CMS) — แยกจากลูกค้าเพื่อความปลอดภัย */
function getCmsSecret() {
    return process.env.JWT_SECRET_CMS || process.env.JWT_SECRET || '';
}

/**
 * Middleware สำหรับตรวจสอบ JWT token (ลูกค้า) — ใช้ JWT_SECRET
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

    const secret = getCustomerSecret();
    if (!secret) {
        return res.status(500).json({ success: false, message: 'ระบบยังไม่ได้ตั้งค่า JWT_SECRET' });
    }

    jwt.verify(token, secret, (err, user) => {
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
 * Middleware สำหรับตรวจสอบ JWT token (แอดมิน CMS) — ใช้ JWT_SECRET_CMS แยกจากลูกค้า
 * ต้องใช้กับ route /api/cms/* ที่ต้อง login แอดมิน
 */
function authenticateCmsToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'กรุณาเข้าสู่ระบบ CMS'
        });
    }

    const secret = getCmsSecret();
    if (!secret) {
        return res.status(500).json({ success: false, message: 'ระบบยังไม่ได้ตั้งค่า JWT (CMS)' });
    }

    jwt.verify(token, secret, (err, user) => {
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
 * สร้าง JWT token สำหรับลูกค้า (LINE/LIFF) — ใช้ JWT_SECRET
 * @param {Object} user - User object { id, username, email }
 * @returns {string} JWT token
 */
function generateToken(user) {
    const secret = getCustomerSecret();
    if (!secret) throw new Error('JWT_SECRET is not set');
    return jwt.sign(
        { id: user.id, username: user.username, email: user.email },
        secret,
        { expiresIn: '7d' }
    );
}

/**
 * สร้าง JWT token สำหรับแอดมิน (CMS) — ใช้ JWT_SECRET_CMS แยกจากลูกค้า
 * @param {Object} admin - Admin object { id, username, email }
 * @returns {string} JWT token
 */
function generateCmsToken(admin) {
    const secret = getCmsSecret();
    if (!secret) throw new Error('JWT_SECRET_CMS or JWT_SECRET is not set');
    return jwt.sign(
        { id: admin.id, username: admin.username, email: admin.email },
        secret,
        { expiresIn: '7d' }
    );
}

module.exports = {
    authenticateToken,
    authenticateCmsToken,
    requireActiveUser,
    requireActiveMembership,
    generateToken,
    generateCmsToken
};
