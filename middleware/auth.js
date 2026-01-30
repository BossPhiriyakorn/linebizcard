const jwt = require('jsonwebtoken');
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
    generateToken
};
