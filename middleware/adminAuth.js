const pool = require('../config/database');

/** ปกติค่า permissions จาก DB (null/{} = สิทธิ์เต็ม) */
function normalizePermissions(perms) {
    if (perms == null || (typeof perms === 'object' && Object.keys(perms || {}).length === 0)) {
        return { view_only: true, can_delete_admins: true, can_manage_users: true };
    }
    if (typeof perms !== 'object') return { view_only: true, can_delete_admins: true, can_manage_users: true };
    return {
        view_only: perms.view_only === true,
        can_delete_admins: perms.can_delete_admins === true,
        can_manage_users: perms.can_manage_users === true
    };
}

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
            'SELECT id, username, email, full_name, nickname, COALESCE(is_active, true) AS is_active, permissions FROM admins WHERE id = $1',
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
        admin.permissions = normalizePermissions(admin.permissions);
        req.adminUser = admin;
        if (req.method !== 'GET' && req.method !== 'HEAD') {
            const p = admin.permissions;
            if (p.view_only === true && p.can_manage_users !== true && p.can_delete_admins !== true) {
                return res.status(403).json({ success: false, message: 'ไม่มีสิทธิ์แก้ไข (ดูได้อย่างเดียว)' });
            }
        }
        next();
    } catch (err) {
        console.error('requireAdmin error:', err);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการตรวจสอบสิทธิ์'
        });
    }
}

/**
 * ต้องมีสิทธิ์อย่างน้อยหนึ่งในรายการ (ใช้หลัง requireAdmin)
 * @param {...string} permissionKeys - 'view_only' | 'can_delete_admins' | 'can_manage_users'
 */
function requireAdminPermission(...permissionKeys) {
    return (req, res, next) => {
        const admin = req.adminUser;
        if (!admin || !admin.permissions) {
            return res.status(403).json({ success: false, message: 'ไม่มีสิทธิ์ดำเนินการ' });
        }
        const hasAny = permissionKeys.some((key) => admin.permissions[key] === true);
        if (!hasAny) {
            return res.status(403).json({ success: false, message: 'ไม่มีสิทธิ์ดำเนินการ' });
        }
        next();
    };
}

module.exports = {
    requireAdmin,
    requireAdminPermission,
    normalizePermissions
};
