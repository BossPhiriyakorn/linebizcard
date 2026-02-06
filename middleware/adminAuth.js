const pool = require('../config/database');

/**
 * ตรวจสอบว่าเป็น admin (ต้องใช้หลัง authenticateToken ใน route chain)
 * ใช้กับ route /api/cms/* — อ้างอิงตาราง admins
 */
async function requireAdmin(req, res, next) {
    try {
        const adminId = req.user && req.user.id;
        if (!adminId) {
            return res.status(401).json({
                success: false,
                message: 'กรุณาเข้าสู่ระบบ CMS'
            });
        }
        const result = await pool.query(
            'SELECT id, username, email, COALESCE(is_active, true) AS is_active FROM admins WHERE id = $1',
            [adminId]
        );
        if (result.rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'ไม่พบแอดมิน'
            });
        }
        const admin = result.rows[0];
        if (admin.is_active !== true) {
            return res.status(403).json({
                success: false,
                message: 'บัญชีถูกระงับการใช้งาน'
            });
        }
        req.adminUser = admin;
        next();
    } catch (err) {
        console.error('requireAdmin error:', err);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์'
        });
    }
}

module.exports = {
    requireAdmin
};
