const path = require('path');
const pool = require('../config/database');
const bcrypt = require('bcrypt');
const { generateCmsToken } = require('../middleware/auth');
const { addCmsNotification } = require('../utils/cmsNotification');
const { convertToWebp } = require('../utils/imageToWebp');
const { encrypt, decryptIfEncrypted } = require('../utils/encryption');

/**
 * CMS Login: อีเมล + รหัสผ่าน — ตรวจจากตาราง admins
 */
async function cmsLogin(req, res) {
    try {
        const { email, password } = req.body || {};
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'กรุณากรอกอีเมลและรหัสผ่าน'
            });
        }
        const result = await pool.query(
            'SELECT id, username, email, password, COALESCE(is_active, true) AS is_active FROM admins WHERE email = $1',
            [email.trim()]
        );
        if (result.rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง'
            });
        }
        const admin = result.rows[0];
        if (admin.is_active !== true) {
            return res.status(403).json({
                success: false,
                message: 'บัญชีถูกระงับการใช้งาน'
            });
        }
        const match = await bcrypt.compare(password, admin.password);
        if (!match) {
            return res.status(401).json({
                success: false,
                message: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง'
            });
        }
        const ip = (req.headers['x-forwarded-for'] && req.headers['x-forwarded-for'].split(',')[0].trim()) || req.ip || req.socket?.remoteAddress || null;
        try {
            const logResult = await pool.query(
                'INSERT INTO login_logs (admin_id, username, email, ip_address) VALUES ($1, $2, $3, $4)',
                [admin.id, encrypt(admin.username), encrypt(admin.email), ip ? encrypt(ip) : null]
            );
            if (logResult.rowCount > 0) {
                console.log('[cmsLogin] Login log recorded for admin_id=' + admin.id);
            }
        } catch (logErr) {
            console.error('[cmsLogin] Login log insert error:', logErr.message, 'Code:', logErr.code);
            // ไม่ throw error เพื่อไม่ให้กระทบการล็อกอิน แต่ log ให้เห็นชัดเจน
        }
        addCmsNotification(pool, {
            notification_type: 'admin_login',
            title: 'แอดมินเข้าใช้งาน',
            message: `${admin.username || admin.email} (${ip || 'N/A'})`,
            link_url: '/cms/login-history',
            related_admin_id: admin.id
        }).catch(() => {});
        const token = generateCmsToken({ id: admin.id, username: admin.username, email: admin.email });
        res.json({
            success: true,
            token: token,
            user: { id: admin.id, username: admin.username, email: admin.email }
        });
    } catch (err) {
        console.error('CMS login error:', err.message || err);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ'
        });
    }
}

/**
 * Dashboard: users_count, templates_count, cards_count, notifications_count (จำนวนการเข้าใช้งานล่าสุด 7 วัน)
 */
async function getDashboard(req, res) {
    try {
        const usersResult = await pool.query('SELECT COUNT(*) AS c FROM users');
        const templatesResult = await pool.query(
            'SELECT COUNT(*) AS c FROM templates WHERE COALESCE(is_active, true) = true'
        );
        const cardsResult = await pool.query('SELECT COUNT(*) AS c FROM user_cards');
        const notificationsResult = await pool.query('SELECT COUNT(*) AS c FROM cms_notifications');
        res.json({
            success: true,
            data: {
                users_count: parseInt(usersResult.rows[0]?.c ?? 0, 10),
                templates_count: parseInt(templatesResult.rows[0]?.c ?? 0, 10),
                cards_count: parseInt(cardsResult.rows[0]?.c ?? 0, 10),
                notifications_count: parseInt(notificationsResult.rows[0]?.c ?? 0, 10)
            }
        });
    } catch (err) {
        console.error('CMS dashboard error:', err);
        res.status(500).json({
            success: false,
            message: 'โหลดข้อมูลไม่สำเร็จ'
        });
    }
}

/**
 * รายการแจ้งเตือนสำหรับแดชบอร์ด CMS (แบบเลื่อนดูได้)
 */
async function getNotifications(req, res) {
    try {
        const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
        const result = await pool.query(
            `SELECT id, notification_type, title, message, link_url, related_user_id, related_card_id, related_admin_id, related_pending_payment_id, created_at, is_read
             FROM cms_notifications
             ORDER BY created_at DESC
             LIMIT $1`,
            [limit]
        );
        res.json({ success: true, data: result.rows });
    } catch (err) {
        console.error('CMS getNotifications error:', err);
        res.status(500).json({ success: false, message: 'โหลดแจ้งเตือนไม่สำเร็จ' });
    }
}

/**
 * รายการแทมเพลต (รวมที่ปิดใช้) สำหรับ CMS
 */
async function getTemplates(req, res) {
    try {
        const result = await pool.query(
            'SELECT id, name, description, preview_image, sample_image_urls, COALESCE(card_type, \'normal\') AS card_type, default_expires_at, COALESCE(is_active, true) AS is_active, created_at, updated_at FROM templates ORDER BY id ASC'
        );
        res.json({ success: true, data: result.rows });
    } catch (err) {
        console.error('CMS get templates error:', err);
        res.status(500).json({ success: false, message: 'โหลดรายการไม่สำเร็จ' });
    }
}

/**
 * แกมเพลตเดียว (สำหรับแก้ไข)
 */
async function getTemplateById(req, res) {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) {
            return res.status(400).json({ success: false, message: 'ID ไม่ถูกต้อง' });
        }
        const result = await pool.query('SELECT * FROM templates WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'ไม่พบแทมเพลต' });
        }
        const row = result.rows[0];
        const template_json = typeof row.template_json === 'string' ? row.template_json : JSON.stringify(row.template_json);
        res.json({
            success: true,
            data: {
                id: row.id,
                name: row.name,
                description: row.description,
                preview_image: row.preview_image,
                sample_image_urls: row.sample_image_urls,
                template_json: template_json,
                card_type: row.card_type || 'normal',
                default_expires_at: row.default_expires_at || null,
                is_active: row.is_active !== false,
                created_at: row.created_at,
                updated_at: row.updated_at
            }
        });
    } catch (err) {
        console.error('CMS get template error:', err);
        res.status(500).json({ success: false, message: 'โหลดข้อมูลไม่สำเร็จ' });
    }
}

/**
 * รวม template_json กับข้อความส่งการ (linemsg)
 * - ถ้าวาง JSON แบบเต็ม (มี tectony1) ใช้โครงนั้น แล้วใส่ linemsg จาก send_message
 * - ถ้าวางแค่ส่วน Flex Message (ไม่มี tectony1) ระบบห่อให้เป็น tectony1: [{ linemsg }, flexContent]
 */
function assembleTemplateJson(templateJson, sendMessage) {
    const parsed = typeof templateJson === 'string' ? JSON.parse(templateJson) : templateJson;
    const linemsg = (sendMessage && String(sendMessage).trim()) ? String(sendMessage).trim() : 'การ์ดของ {name}';
    if (parsed.tectony1 && Array.isArray(parsed.tectony1) && parsed.tectony1[1] != null) {
        const out = { tectony1: [...parsed.tectony1] };
        out.tectony1[0] = (typeof out.tectony1[0] === 'object' && out.tectony1[0] !== null)
            ? { ...out.tectony1[0], linemsg }
            : { linemsg };
        return out;
    }
    return { tectony1: [{ linemsg }, parsed] };
}

/**
 * เพิ่มแทมเพลต (รับ name, description, template_json, send_message)
 * template_json: วางได้ทั้งโครงเต็ม (tectony1) หรือแค่ส่วน Flex Message จาก Flex Simulator
 * send_message: ข้อความแสดงตอนส่งการ (เช่น "การ์ดของ {name}") ระบบจะประกอบให้
 */
async function createTemplate(req, res) {
    try {
        const { name, description, template_json, send_message, sample_image_urls, card_type, default_expires_at } = req.body || {};
        if (!name || template_json === undefined) {
            return res.status(400).json({
                success: false,
                message: 'กรุณากรอกชื่อและ JSON แทมเพลต'
            });
        }
        let jsonObj;
        try {
            jsonObj = assembleTemplateJson(template_json, send_message);
        } catch (e) {
            return res.status(400).json({
                success: false,
                message: 'รูปแบบ JSON ไม่ถูกต้อง หรือวางเฉพาะส่วน Flex Message จาก Flex Simulator'
            });
        }
        if (!jsonObj.tectony1 || !Array.isArray(jsonObj.tectony1) || jsonObj.tectony1[1] == null) {
            return res.status(400).json({
                success: false,
                message: 'กรุณาวางโค้ด JSON ส่วน Flex Message จาก Flex Simulator'
            });
        }
        const jsonString = JSON.stringify(jsonObj, null, 0);
        const sampleUrlsJson = Array.isArray(sample_image_urls) ? JSON.stringify(sample_image_urls) : (sample_image_urls != null && typeof sample_image_urls === 'string' ? sample_image_urls : '[]');
        const templateCardType = (card_type === 'special' || card_type === 'event') ? String(card_type).toLowerCase() : 'normal';
        const defaultExpires = (default_expires_at && String(default_expires_at).trim()) ? new Date(String(default_expires_at).trim()) : null;
        const result = await pool.query(
            'INSERT INTO templates (name, description, template_json, sample_image_urls, card_type, default_expires_at, is_active) VALUES ($1, $2, $3, $4, $5, $6, true) RETURNING id, name, description, card_type, default_expires_at, is_active, created_at',
            [name.trim(), description ? description.trim() : null, jsonString, sampleUrlsJson, templateCardType, defaultExpires]
        );
        res.status(201).json({
            success: true,
            message: 'เพิ่มแทมเพลตแล้ว',
            data: result.rows[0]
        });
    } catch (err) {
        if (err.message && err.message.includes('JSON')) {
            return res.status(400).json({ success: false, message: err.message });
        }
        console.error('CMS create template error:', err);
        res.status(500).json({ success: false, message: 'บันทึกไม่สำเร็จ' });
    }
}

/**
 * แก้ไขแทมเพลต (รับ send_message ด้วย ระบบประกอบ linemsg ให้)
 */
async function updateTemplate(req, res) {
    try {
        const id = parseInt(req.params.id, 10);
        const { name, description, template_json, send_message, sample_image_urls, card_type, default_expires_at } = req.body || {};
        if (isNaN(id)) {
            return res.status(400).json({ success: false, message: 'ID ไม่ถูกต้อง' });
        }
        if (!name || template_json === undefined) {
            return res.status(400).json({
                success: false,
                message: 'กรุณากรอกชื่อและ JSON แทมเพลต'
            });
        }
        let jsonObj;
        try {
            jsonObj = assembleTemplateJson(template_json, send_message);
        } catch (e) {
            return res.status(400).json({
                success: false,
                message: 'รูปแบบ JSON ไม่ถูกต้อง หรือวางเฉพาะส่วน Flex Message จาก Flex Simulator'
            });
        }
        if (!jsonObj.tectony1 || !Array.isArray(jsonObj.tectony1) || jsonObj.tectony1[1] == null) {
            return res.status(400).json({
                success: false,
                message: 'กรุณาวางโค้ด JSON ส่วน Flex Message จาก Flex Simulator'
            });
        }
        const jsonString = JSON.stringify(jsonObj, null, 0);
        const sampleUrlsJson = Array.isArray(sample_image_urls) ? JSON.stringify(sample_image_urls) : (sample_image_urls != null && typeof sample_image_urls === 'string' ? sample_image_urls : null);
        const templateCardType = (card_type === 'special' || card_type === 'event') ? String(card_type).toLowerCase() : 'normal';
        const defaultExpires = (default_expires_at && String(default_expires_at).trim()) ? new Date(String(default_expires_at).trim()) : null;
        await pool.query(
            'UPDATE templates SET name = $1, description = $2, template_json = $3, sample_image_urls = COALESCE($4, sample_image_urls), card_type = $5, default_expires_at = $6 WHERE id = $7',
            [name.trim(), description ? description.trim() : null, jsonString, sampleUrlsJson, templateCardType, defaultExpires, id]
        );
        res.json({ success: true, message: 'แก้ไขแล้ว' });
    } catch (err) {
        if (err.message && err.message.includes('JSON')) {
            return res.status(400).json({ success: false, message: err.message });
        }
        console.error('CMS update template error:', err);
        res.status(500).json({ success: false, message: 'บันทึกไม่สำเร็จ' });
    }
}

/**
 * สลับสถานะเปิดใช้/ปิดใช้ (ไม่ลบ แค่ซ่อนจากผู้ใช้)
 */
async function toggleTemplate(req, res) {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) {
            return res.status(400).json({ success: false, message: 'ID ไม่ถูกต้อง' });
        }
        const current = await pool.query('SELECT COALESCE(is_active, true) AS is_active FROM templates WHERE id = $1', [id]);
        if (current.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'ไม่พบแทมเพลต' });
        }
        const newActive = !current.rows[0].is_active;
        await pool.query('UPDATE templates SET is_active = $1 WHERE id = $2', [newActive, id]);
        res.json({
            success: true,
            message: newActive ? 'เปิดใช้แล้ว' : 'ปิดใช้แล้ว',
            data: { is_active: newActive }
        });
    } catch (err) {
        console.error('CMS toggle template error:', err);
        res.status(500).json({ success: false, message: 'ดำเนินการไม่สำเร็จ' });
    }
}

/**
 * ลบแทมเพลตออกจากฐานข้อมูล — ต้องปิดใช้งานการ์ดก่อนจึงจะลบได้
 */
async function deleteTemplate(req, res) {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) {
            return res.status(400).json({ success: false, message: 'ID ไม่ถูกต้อง' });
        }
        const check = await pool.query('SELECT id, COALESCE(is_active, true) AS is_active FROM templates WHERE id = $1', [id]);
        if (check.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'ไม่พบแทมเพลต' });
        }
        if (check.rows[0].is_active === true) {
            return res.status(400).json({
                success: false,
                message: 'กรุณาปิดใช้งานการ์ดก่อนจึงจะลบได้'
            });
        }
        await pool.query('DELETE FROM templates WHERE id = $1', [id]);
        res.json({ success: true, message: 'ลบแทมเพลตแล้ว' });
    } catch (err) {
        console.error('CMS delete template error:', err);
        res.status(500).json({ success: false, message: 'ลบไม่สำเร็จ' });
    }
}

/**
 * รายการผู้ใช้ (ลูกค้า) สำหรับ CMS — จากตาราง users + จำนวนรายการรอตรวจสอบยอด (สลิป)
 * ถ้ามี pending_payments สถานะ slip_uploaded จะแสดงสถานะ "ตรวจสอบยอด" ในหน้าจัดการผู้ใช้
 */
async function getUsers(req, res) {
    try {
        const result = await pool.query(
            `SELECT u.id, u.username, u.email, u.first_name, u.last_name, u.phone, u.login_type, 
             COALESCE(u.is_active, true) AS is_active, COALESCE(u.email_verified, false) AS email_verified, u.created_at,
             (SELECT COUNT(*) FROM pending_payments pp WHERE pp.user_id = u.id AND pp.status = 'slip_uploaded') AS pending_slip_count
             FROM users u ORDER BY u.id ASC`
        );
        const rows = (Array.isArray(result.rows) ? result.rows : []).map((r) => ({
            ...r,
            first_name: decryptIfEncrypted(r.first_name),
            last_name: decryptIfEncrypted(r.last_name),
            phone: decryptIfEncrypted(r.phone),
            nickname: decryptIfEncrypted(r.nickname)
        }));
        res.json({ success: true, data: rows });
    } catch (err) {
        console.error('CMS get users error:', err);
        res.status(500).json({ success: false, message: 'โหลดรายการไม่สำเร็จ' });
    }
}

/**
 * สถิติสำหรับหน้าจัดการผู้ใช้: จำนวนผู้ใช้ทั้งหมด, ยืนยันตัวตนแล้ว, รอตรวจสอบยอดโอน (สลิป)
 */
async function getUsersStats(req, res) {
    try {
        const totalResult = await pool.query('SELECT COUNT(*) AS c FROM users');
        const verifiedResult = await pool.query('SELECT COUNT(*) AS c FROM users WHERE email_verified = true');
        const pendingResult = await pool.query(
            "SELECT COUNT(*) AS c FROM pending_payments WHERE status = 'slip_uploaded'"
        );
        const suspendedResult = await pool.query("SELECT COUNT(*) AS c FROM users WHERE is_active = false");
        const total_users = parseInt(totalResult.rows[0]?.c ?? 0, 10);
        const verified_users = parseInt(verifiedResult.rows[0]?.c ?? 0, 10);
        const pending_transfer_count = parseInt(pendingResult.rows[0]?.c ?? 0, 10);
        const suspended_users = parseInt(suspendedResult.rows[0]?.c ?? 0, 10);
        res.json({
            success: true,
            data: { total_users, verified_users, pending_transfer_count, suspended_users }
        });
    } catch (err) {
        console.error('CMS getUsersStats error:', err);
        res.status(500).json({ success: false, message: 'โหลดสถิติไม่สำเร็จ' });
    }
}

/**
 * รายละเอียดลูกค้าเดียว — ข้อมูลส่วนตัว, สมาชิก (แพ็กเกจ/วันหมดอายุ), รายการการ์ดที่สร้าง
 * ใช้: users (id, username, email, first_name, last_name, phone, nickname, profile_image_url, is_active, created_at),
 *      memberships (membership_type, start_date, end_date) ถ้ามี,
 *      user_cards + templates สำหรับรายการการ์ด
 * รัน schema-full.sql หรือ node scripts/setup-database.js ถ้าฐานข้อมูลเก่าไม่มี profile_image_url, nickname, memberships
 */
async function getUserById(req, res) {
    try {
        const userId = parseInt(req.params.id, 10);
        if (isNaN(userId)) {
            return res.status(400).json({ success: false, message: 'ID ไม่ถูกต้อง' });
        }
        const userResult = await pool.query(
            `SELECT id, username, email, first_name, last_name, phone, nickname, login_type, 
             COALESCE(is_active, true) AS is_active, COALESCE(email_verified, false) AS email_verified, created_at, profile_image_url 
             FROM users WHERE id = $1`,
            [userId]
        );
        if (userResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'ไม่พบผู้ใช้' });
        }
        const rawUser = userResult.rows[0];
        const user = {
            ...rawUser,
            first_name: decryptIfEncrypted(rawUser.first_name),
            last_name: decryptIfEncrypted(rawUser.last_name),
            phone: decryptIfEncrypted(rawUser.phone),
            nickname: decryptIfEncrypted(rawUser.nickname)
        };

        let membership = null;
        try {
            const memResult = await pool.query(
                `SELECT m.id, m.membership_type, m.start_date, m.end_date, m.status, m.package_id, m.created_at,
                 p.name AS package_name,
                 GREATEST(0, EXTRACT(EPOCH FROM (m.end_date - CURRENT_TIMESTAMP)) / 86400)::INTEGER AS remaining_days
                 FROM memberships m
                 LEFT JOIN packages p ON p.id = m.package_id
                 WHERE m.user_id = $1 AND m.status = 'active' AND m.end_date > CURRENT_TIMESTAMP 
                 ORDER BY m.end_date DESC LIMIT 1`,
                [userId]
            );
            if (memResult.rows.length > 0) membership = memResult.rows[0];
        } catch (e) {
            // ตาราง memberships อาจยังไม่มี
        }

        let cards = [];
        try {
            const cardsResult = await pool.query(
                `SELECT uc.id, uc.unique_id, uc.user_name, uc.liff_url, uc.created_at, uc.expires_at, uc.card_type,
                  t.name AS template_name
                 FROM user_cards uc
                 LEFT JOIN templates t ON t.id = uc.template_id
                 WHERE uc.user_id = $1 ORDER BY uc.created_at DESC`,
                [userId]
            );
            cards = (Array.isArray(cardsResult.rows) ? cardsResult.rows : []).map((c) => ({
                ...c,
                user_name: decryptIfEncrypted(c.user_name)
            }));
        } catch (e) {
            console.error('CMS getUserById cards error:', e.message);
        }

        res.json({
            success: true,
            data: {
                user,
                membership,
                cards
            }
        });
    } catch (err) {
        console.error('CMS getUserById error:', err);
        res.status(500).json({ success: false, message: 'โหลดรายละเอียดไม่สำเร็จ' });
    }
}

/**
 * ช่องทางการชำระเงินของลูกค้า (สำหรับ CMS แสดงในรายละเอียดผู้ใช้)
 */
async function getUserPaymentChannels(req, res) {
    try {
        const userId = parseInt(req.params.id, 10);
        if (isNaN(userId)) return res.status(400).json({ success: false, message: 'ID ไม่ถูกต้อง' });
        const result = await pool.query(
            `SELECT id, channel_type, full_name, card_last_four, card_brand, bank_name, bank_account_masked, promptpay_phone, promptpay_id, display_label, is_default, created_at, updated_at
             FROM payment_channels WHERE user_id = $1 ORDER BY is_default DESC, created_at DESC`,
            [userId]
        );
        res.json({ success: true, data: result.rows || [] });
    } catch (err) {
        console.error('CMS getUserPaymentChannels error:', err);
        res.status(500).json({ success: false, message: 'โหลดช่องทางการชำระเงินไม่สำเร็จ' });
    }
}

/**
 * รายการรอตรวจสอบการชำระ (QR แนบสลิปแล้ว) ของลูกค้า
 */
async function getUserPendingPayments(req, res) {
    try {
        const userId = parseInt(req.params.id, 10);
        if (isNaN(userId)) return res.status(400).json({ success: false, message: 'ID ไม่ถูกต้อง' });
        const result = await pool.query(
            `SELECT pp.id, pp.user_id, pp.package_id, pp.amount, pp.original_amount, pp.discount_amount, pp.extra_days, pp.status, pp.slip_image_url, pp.slip_uploaded_at, pp.created_at, p.name AS package_name
             FROM pending_payments pp
             LEFT JOIN packages p ON p.id = pp.package_id
             WHERE pp.user_id = $1 AND pp.status IN ('pending', 'slip_uploaded')
             ORDER BY pp.created_at DESC`,
            [userId]
        );
        res.json({ success: true, data: result.rows || [] });
    } catch (err) {
        console.error('CMS getUserPendingPayments error:', err);
        res.status(500).json({ success: false, message: 'โหลดรายการรอตรวจสอบไม่สำเร็จ' });
    }
}

/**
 * ยืนยันหรือปฏิเสธการชำระ (QR) — เมื่อยืนยันจะสร้างสมาชิก + payment_history
 */
async function verifyPendingPayment(req, res) {
    try {
        const id = parseInt(req.params.id, 10);
        const { action, rejection_reason } = req.body || {};
        const adminId = req.adminUser?.id;
        if (isNaN(id)) return res.status(400).json({ success: false, message: 'ID ไม่ถูกต้อง' });
        if (action !== 'approve' && action !== 'reject') {
            return res.status(400).json({ success: false, message: 'ระบุ action เป็น approve หรือ reject' });
        }
        const row = await pool.query(
            'SELECT id, user_id, package_id, amount, original_amount, discount_amount, extra_days, coupon_id, status FROM pending_payments WHERE id = $1',
            [id]
        );
        if (row.rows.length === 0) return res.status(404).json({ success: false, message: 'ไม่พบรายการ' });
        const pending = row.rows[0];
        if (pending.status !== 'pending' && pending.status !== 'slip_uploaded') {
            return res.status(400).json({ success: false, message: 'รายการนี้ตรวจสอบแล้ว' });
        }
        if (action === 'reject') {
            await pool.query(
                `UPDATE pending_payments SET status = 'rejected', rejection_reason = $1, verified_at = CURRENT_TIMESTAMP, verified_by_admin_id = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3`,
                [rejection_reason != null ? String(rejection_reason).trim() : null, adminId != null ? adminId : null, id]
            );
            return res.json({ success: true, message: 'ปฏิเสธรายการแล้ว' });
        }
        const pkgRow = await pool.query('SELECT id, name, duration_days FROM packages WHERE id = $1', [pending.package_id]);
        if (pkgRow.rows.length === 0) return res.status(400).json({ success: false, message: 'ไม่พบแพ็กเกจ' });
        const pkg = pkgRow.rows[0];
        const baseDays = parseInt(pkg.duration_days, 10) || 0;
        const durationDays = baseDays + (parseInt(pending.extra_days, 10) || 0);
        const startDate = new Date();
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + durationDays);
        const existing = await pool.query('SELECT id FROM memberships WHERE user_id = $1 AND status = $2 LIMIT 1', [pending.user_id, 'active']);
        let membershipId = null;
        const paymentType = existing.rows.length > 0 ? 'renew' : 'purchase';
        if (existing.rows.length > 0) {
            membershipId = existing.rows[0].id;
            await pool.query(
                `UPDATE memberships SET membership_type = $1, start_date = $2, end_date = $3, package_id = $4, updated_at = CURRENT_TIMESTAMP WHERE id = $5`,
                [pkg.name, startDate, endDate, pending.package_id, membershipId]
            );
        } else {
            const ins = await pool.query(
                `INSERT INTO memberships (user_id, membership_type, start_date, end_date, status, package_id) VALUES ($1, $2, $3, $4, 'active', $5) RETURNING id`,
                [pending.user_id, pkg.name, startDate, endDate, pending.package_id]
            );
            membershipId = ins.rows[0].id;
        }
        const origAmount = pending.original_amount != null ? pending.original_amount : pending.amount;
        const discAmount = pending.discount_amount != null ? pending.discount_amount : 0;
        const extraDaysVal = pending.extra_days != null ? parseInt(pending.extra_days, 10) : null;
        await pool.query(
            `INSERT INTO payment_history (user_id, package_id, amount, original_amount, discount_amount, extra_days, paid_at, membership_id, payment_type) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [pending.user_id, pending.package_id, pending.amount, origAmount, discAmount, extraDaysVal, startDate, membershipId, paymentType]
        );
        if (pending.coupon_id) {
            await pool.query(
                'INSERT INTO coupon_redemptions (coupon_id, user_id, package_id) VALUES ($1, $2, $3)',
                [pending.coupon_id, pending.user_id, pending.package_id]
            );
            await pool.query(
                'UPDATE coupons SET use_count = COALESCE(use_count, 0) + 1, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
                [pending.coupon_id]
            );
        }
        await pool.query(
            `UPDATE pending_payments SET status = 'approved', verified_at = CURRENT_TIMESTAMP, verified_by_admin_id = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
            [adminId != null ? adminId : null, id]
        );
        addCmsNotification(pool, {
            notification_type: 'payment_done',
            title: 'ลูกค้าชำระเงิน',
            message: `ยืนยันรายการ #${id} แพ็กเกจ ${pkg.name} (User ID: ${pending.user_id})`,
            link_url: `/cms/users/${pending.user_id}`,
            related_user_id: pending.user_id,
            related_pending_payment_id: id
        }).catch(() => {});
        res.json({ success: true, message: 'ยืนยันเงินเข้าแล้ว สมาชิกถูกเปิดใช้งาน' });
    } catch (err) {
        console.error('CMS verifyPendingPayment error:', err);
        res.status(500).json({ success: false, message: 'ดำเนินการไม่สำเร็จ' });
    }
}

/**
 * คูปองที่ลูกค้าเก็บไว้ใช้รอบชำระอัตโนมัติถัดไป (แสดงในประวัติการชำระเป็นสถานะ รอชำระ)
 */
async function getUserSavedCouponNextPayment(req, res) {
    try {
        const userId = parseInt(req.params.id, 10);
        if (isNaN(userId)) return res.status(400).json({ success: false, message: 'ID ไม่ถูกต้อง' });
        const result = await pool.query(
            `SELECT ucnp.id, ucnp.coupon_id, ucnp.created_at, c.code, c.name, c.discount_percent, c.condition_type
             FROM user_coupon_next_payment ucnp
             JOIN coupons c ON c.id = ucnp.coupon_id
             WHERE ucnp.user_id = $1`,
            [userId]
        );
        const row = result.rows[0] || null;
        res.json({ success: true, data: row });
    } catch (err) {
        console.error('CMS getUserSavedCouponNextPayment error:', err);
        res.status(500).json({ success: false, message: 'โหลดข้อมูลคูปองรอชำระไม่สำเร็จ' });
    }
}

/**
 * ประวัติการชำระเงินของลูกค้า (ซื้อแพ็กเกจ/ต่อแพ็กเกจ)
 */
async function getUserPaymentHistory(req, res) {
    try {
        const userId = parseInt(req.params.id, 10);
        if (isNaN(userId)) {
            return res.status(400).json({ success: false, message: 'ID ไม่ถูกต้อง' });
        }
        const result = await pool.query(
            `SELECT ph.id, ph.user_id, ph.package_id, ph.amount,
              COALESCE(ph.original_amount, p.price, ph.amount + COALESCE(ph.discount_amount, 0)) AS original_amount,
              COALESCE(ph.discount_amount, 0) AS discount_amount,
              ph.extra_days, ph.paid_at, ph.payment_type, ph.created_at,
              p.name AS package_name,
              (CASE
                WHEN COALESCE(ph.discount_amount, 0) > 0 AND (COALESCE(ph.original_amount, p.price, ph.amount + COALESCE(ph.discount_amount, 0)) > 0)
                THEN ROUND((COALESCE(ph.discount_amount, 0)::numeric / NULLIF(COALESCE(ph.original_amount, p.price, ph.amount + COALESCE(ph.discount_amount, 0)), 0)) * 100, 0)
                WHEN (COALESCE(ph.original_amount, p.price) IS NOT NULL AND (COALESCE(ph.original_amount, p.price) > ph.amount) AND COALESCE(ph.original_amount, p.price) > 0)
                THEN ROUND(((COALESCE(ph.original_amount, p.price) - ph.amount)::numeric / NULLIF(COALESCE(ph.original_amount, p.price), 0)) * 100, 0)
                ELSE NULL
              END)::integer AS discount_percent
             FROM payment_history ph
             LEFT JOIN packages p ON p.id = ph.package_id
             WHERE ph.user_id = $1
             ORDER BY ph.paid_at DESC NULLS LAST, ph.id DESC`,
            [userId]
        );
        res.json({ success: true, data: result.rows || [] });
    } catch (err) {
        console.error('CMS getUserPaymentHistory error:', err);
        res.status(500).json({ success: false, message: 'โหลดประวัติการชำระเงินไม่สำเร็จ' });
    }
}

/**
 * ระงับ/เปิดใช้ผู้ใช้ (ลูกค้า)
 */
async function setUserActive(req, res) {
    try {
        const userId = parseInt(req.params.id, 10);
        const { is_active } = req.body !== undefined ? req.body : { is_active: true };
        if (isNaN(userId)) {
            return res.status(400).json({ success: false, message: 'ID ไม่ถูกต้อง' });
        }
        const userResult = await pool.query('SELECT id FROM users WHERE id = $1', [userId]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'ไม่พบผู้ใช้' });
        }
        await pool.query('UPDATE users SET is_active = $1 WHERE id = $2', [!!is_active, userId]);
        res.json({
            success: true,
            message: is_active ? 'เปิดการใช้งานแล้ว' : 'ระงับการใช้งานแล้ว',
            data: { is_active: !!is_active }
        });
    } catch (err) {
        console.error('CMS set user active error:', err);
        res.status(500).json({ success: false, message: 'ดำเนินการไม่สำเร็จ' });
    }
}

/**
 * แก้ไขข้อมูลสมาชิกของลูกค้า (วันหมดอายุ, แพ็กเกจ)
 * จำนวนวันคงเหลือคำนวณจาก วันปัจจุบัน ถึง วันหมดอายุ (ไม่ต้องเก็บใน DB)
 */
async function updateUserMembership(req, res) {
    try {
        const userId = parseInt(req.params.id, 10);
        const { end_date, package_id } = req.body || {};
        if (isNaN(userId)) {
            return res.status(400).json({ success: false, message: 'ID ไม่ถูกต้อง' });
        }
        const userResult = await pool.query('SELECT id FROM users WHERE id = $1', [userId]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'ไม่พบผู้ใช้' });
        }
        const memResult = await pool.query(
            `SELECT id FROM memberships WHERE user_id = $1 AND status = 'active' ORDER BY end_date DESC LIMIT 1`,
            [userId]
        );
        if (memResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'ไม่พบข้อมูลสมาชิกที่แก้ไขได้' });
        }
        const membershipId = memResult.rows[0].id;

        const updates = [];
        const values = [];
        let idx = 1;

        if (end_date !== undefined && end_date !== null && end_date !== '') {
            const endDate = new Date(end_date);
            if (!Number.isNaN(endDate.getTime())) {
                updates.push(`end_date = $${idx}`);
                values.push(endDate);
                idx += 1;
            }
        }
        if (package_id !== undefined && package_id !== null && package_id !== '') {
            const pkgId = parseInt(package_id, 10);
            if (!Number.isNaN(pkgId)) {
                updates.push(`package_id = $${idx}`);
                values.push(pkgId);
                idx += 1;
            }
        }

        if (updates.length === 0) {
            return res.status(400).json({ success: false, message: 'กรุณาระบุวันหมดอายุหรือแพ็กเกจที่ต้องการแก้ไข' });
        }

        updates.push(`updated_at = CURRENT_TIMESTAMP`);
        values.push(membershipId);

        await pool.query(
            `UPDATE memberships SET ${updates.join(', ')} WHERE id = $${idx}`,
            values
        );

        res.json({
            success: true,
            message: 'บันทึกข้อมูลสมาชิกแล้ว',
            data: { end_date: end_date || null, package_id: package_id || null }
        });
    } catch (err) {
        console.error('CMS update user membership error:', err);
        res.status(500).json({ success: false, message: 'ดำเนินการไม่สำเร็จ' });
    }
}

/**
 * รายการแอดมิน — จากตาราง admins (รวม permissions)
 */
async function getAdmins(req, res) {
    try {
        const result = await pool.query(
            `SELECT id, username, email, full_name, nickname, COALESCE(is_active, true) AS is_active, created_at, permissions 
             FROM admins ORDER BY id ASC`
        );
        const rows = Array.isArray(result.rows) ? result.rows : [];
        res.json({ success: true, data: rows });
    } catch (err) {
        console.error('CMS get admins error:', err);
        res.status(500).json({ success: false, message: 'โหลดรายการไม่สำเร็จ' });
    }
}

/**
 * ดึงข้อมูลแอดมินที่ล็อกอินอยู่ (สำหรับแสดงสิทธิ์/ซ่อนปุ่มลบตัวเอง)
 */
async function getCmsMe(req, res) {
    try {
        const admin = req.adminUser;
        if (!admin) {
            return res.status(401).json({ success: false, message: 'กรุณาเข้าสู่ระบบ' });
        }
        res.json({
            success: true,
            data: {
                id: admin.id,
                username: admin.username,
                email: admin.email,
                full_name: admin.full_name,
                nickname: admin.nickname,
                permissions: admin.permissions || {}
            }
        });
    } catch (err) {
        console.error('CMS get me error:', err);
        res.status(500).json({ success: false, message: 'โหลดข้อมูลไม่สำเร็จ' });
    }
}

/**
 * สร้างแอดมินใหม่ (username, email, password, permissions)
 */
async function createAdmin(req, res) {
    try {
        const { username, email, password, permissions, full_name, nickname } = req.body || {};
        if (!username || !email || !password) {
            return res.status(400).json({
                success: false,
                message: 'กรุณากรอกชื่อผู้ใช้ อีเมล และรหัสผ่าน'
            });
        }
        const un = username.trim();
        const em = email.trim();
        const fullName = full_name != null ? String(full_name).trim() || null : null;
        const nick = nickname != null ? String(nickname).trim() || null : null;
        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร'
            });
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(em)) {
            return res.status(400).json({
                success: false,
                message: 'รูปแบบอีเมลไม่ถูกต้อง'
            });
        }
        // เมื่อสร้างแอดมินใหม่: สิทธิ์เต็ม (view_only: false, can_manage_users: true) แต่ห้ามลบแอดมินคนแรก (can_delete_admins: false)
        const perms = permissions && typeof permissions === 'object'
            ? {
                view_only: permissions.view_only === true,
                can_delete_admins: permissions.can_delete_admins === true,
                can_manage_users: permissions.can_manage_users === true
            }
            : { view_only: false, can_delete_admins: false, can_manage_users: true };
        const hashedPassword = await bcrypt.hash(password, 10);
        const result = await pool.query(
            `INSERT INTO admins (username, email, password, permissions, full_name, nickname) VALUES ($1, $2, $3, $4, $5, $6) 
             RETURNING id, username, email, full_name, nickname, permissions, created_at`,
            [un, em, hashedPassword, JSON.stringify(perms), fullName, nick]
        );
        res.status(201).json({
            success: true,
            message: 'สร้างแอดมินแล้ว',
            data: result.rows[0]
        });
    } catch (err) {
        if (err.code === '23505') {
            return res.status(400).json({
                success: false,
                message: 'ชื่อผู้ใช้หรืออีเมลนี้มีอยู่แล้ว'
            });
        }
        console.error('CMS create admin error:', err);
        res.status(500).json({ success: false, message: 'สร้างไม่สำเร็จ' });
    }
}

/**
 * ลบแอดมิน (ต้องมีสิทธิ์ can_delete_admins และห้ามลบตัวเอง)
 */
async function deleteAdmin(req, res) {
    try {
        const adminId = req.adminUser?.id;
        const targetId = parseInt(req.params.id, 10);
        if (!targetId || Number.isNaN(targetId)) {
            return res.status(400).json({ success: false, message: 'รหัสแอดมินไม่ถูกต้อง' });
        }
        if (targetId === adminId) {
            return res.status(400).json({ success: false, message: 'ไม่สามารถลบบัญชีตัวเองได้' });
        }
        // ป้องกันการลบแอดมินคนแรก (id = 1 หรือ created_at เก่าที่สุด)
        const firstAdmin = await pool.query('SELECT id FROM admins ORDER BY id ASC, created_at ASC LIMIT 1');
        if (firstAdmin.rows.length > 0 && parseInt(firstAdmin.rows[0].id, 10) === targetId) {
            return res.status(400).json({ success: false, message: 'ไม่สามารถลบแอดมินคนแรกได้' });
        }
        const result = await pool.query('DELETE FROM admins WHERE id = $1 RETURNING id', [targetId]);
        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, message: 'ไม่พบแอดมิน' });
        }
        res.json({ success: true, message: 'ลบแอดมินแล้ว' });
    } catch (err) {
        console.error('CMS delete admin error:', err);
        res.status(500).json({ success: false, message: 'ลบไม่สำเร็จ' });
    }
}

/**
 * แก้ไขแอดมิน (ชื่อผู้ใช้, ชื่อจริง, ชื่อเล่น, สิทธิ์, สถานะ) — ต้องมีสิทธิ์ can_manage_users
 */
async function updateAdmin(req, res) {
    try {
        const targetId = parseInt(req.params.id, 10);
        if (!targetId || Number.isNaN(targetId)) {
            return res.status(400).json({ success: false, message: 'รหัสแอดมินไม่ถูกต้อง' });
        }
        const { username, full_name, nickname, permissions, is_active } = req.body || {};
        const updates = [];
        const values = [];
        let idx = 1;
        if (username !== undefined) {
            updates.push(`username = $${idx}`);
            values.push(String(username).trim());
            idx++;
        }
        if (full_name !== undefined) {
            updates.push(`full_name = $${idx}`);
            values.push(full_name != null && String(full_name).trim() !== '' ? String(full_name).trim() : null);
            idx++;
        }
        if (nickname !== undefined) {
            updates.push(`nickname = $${idx}`);
            values.push(nickname != null && String(nickname).trim() !== '' ? String(nickname).trim() : null);
            idx++;
        }
        if (permissions !== undefined && permissions !== null && typeof permissions === 'object') {
            updates.push(`permissions = $${idx}`);
            values.push(JSON.stringify({
                view_only: permissions.view_only === true,
                can_delete_admins: permissions.can_delete_admins === true,
                can_manage_users: permissions.can_manage_users === true
            }));
            idx++;
        }
        if (is_active !== undefined) {
            updates.push(`is_active = $${idx}`);
            values.push(!!is_active);
            idx++;
        }
        if (updates.length === 0) {
            return res.status(400).json({ success: false, message: 'ไม่มีข้อมูลที่จะแก้ไข' });
        }
        updates.push(`updated_at = CURRENT_TIMESTAMP`);
        values.push(targetId);
        const result = await pool.query(
            `UPDATE admins SET ${updates.join(', ')} WHERE id = $${idx} RETURNING id, username, email, full_name, nickname, is_active, permissions, updated_at`,
            values
        );
        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, message: 'ไม่พบแอดมิน' });
        }
        res.json({ success: true, message: 'แก้ไขแอดมินแล้ว', data: result.rows[0] });
    } catch (err) {
        if (err.code === '23505') {
            return res.status(400).json({ success: false, message: 'ชื่อผู้ใช้นี้มีอยู่แล้ว' });
        }
        console.error('CMS update admin error:', err);
        res.status(500).json({ success: false, message: 'แก้ไขไม่สำเร็จ' });
    }
}

/**
 * ประวัติการเข้าใช้งาน CMS (จาก login_logs)
 */
async function getLoginHistory(req, res) {
    try {
        const result = await pool.query(
            `SELECT id, admin_id, username, email, login_at, ip_address 
             FROM login_logs ORDER BY login_at DESC LIMIT 500`
        );
        const rows = (Array.isArray(result.rows) ? result.rows : []).map((r) => ({
            ...r,
            username: decryptIfEncrypted(r.username),
            email: decryptIfEncrypted(r.email),
            ip_address: decryptIfEncrypted(r.ip_address)
        }));
        console.log(`[getLoginHistory] Found ${rows.length} login logs`);
        if (rows.length === 0) {
            console.warn('[getLoginHistory] No login logs found in database - table may be empty or no admin has logged in yet');
        }
        res.json({ success: true, data: rows });
    } catch (err) {
        console.error('[getLoginHistory] Error:', err.message, 'Code:', err.code);
        res.status(500).json({ success: false, message: 'โหลดประวัติไม่สำเร็จ' });
    }
}

/**
 * ตั้งค่า Login (สาธารณะ — สำหรับหน้า /cms/login ดึง logo และพื้นหลัง)
 */
async function getLoginSettings(req, res) {
    try {
        const result = await pool.query(
            'SELECT login_logo_url, login_bg_image_url, login_bg_color FROM cms_settings WHERE id = 1 LIMIT 1'
        );
        const row = result.rows[0] || {};
        res.json({
            success: true,
            data: {
                login_logo_url: row.login_logo_url || null,
                login_bg_image_url: row.login_bg_image_url || null,
                login_bg_color: (row.login_bg_color && row.login_bg_color.trim()) ? row.login_bg_color.trim() : '#5b21b6'
            }
        });
    } catch (err) {
        console.error('CMS get login settings error:', err);
        res.json({
            success: true,
            data: { login_logo_url: null, login_bg_image_url: null, login_bg_color: '#5b21b6' }
        });
    }
}

/**
 * ตั้งค่า CMS ทั้งหมด (สำหรับหน้า ตั้งค่า — ต้อง admin)
 */
async function getSettings(req, res) {
    try {
        const result = await pool.query(
            `SELECT id, login_logo_url, login_bg_image_url, login_bg_color, updated_at,
              qr_payment_bank_name, qr_payment_account_no, qr_payment_account_name, qr_payment_qr_image_url,
              privacy_policy_content, terms_of_service_content
             FROM cms_settings WHERE id = 1 LIMIT 1`
        );
        const row = result.rows[0];
        if (!row) {
            return res.json({
                success: true,
                data: {
                    login_logo_url: null, login_bg_image_url: null, login_bg_color: '#5b21b6', updated_at: null,
                    qr_payment_bank_name: null, qr_payment_account_no: null, qr_payment_account_name: null, qr_payment_qr_image_url: null,
                    privacy_policy_content: null, terms_of_service_content: null
                }
            });
        }
        res.json({
            success: true,
            data: {
                login_logo_url: row.login_logo_url || null,
                login_bg_image_url: row.login_bg_image_url || null,
                login_bg_color: row.login_bg_color || '#5b21b6',
                updated_at: row.updated_at,
                qr_payment_bank_name: row.qr_payment_bank_name || null,
                qr_payment_account_no: decryptIfEncrypted(row.qr_payment_account_no) ?? row.qr_payment_account_no ?? null,
                qr_payment_account_name: decryptIfEncrypted(row.qr_payment_account_name) ?? row.qr_payment_account_name ?? null,
                qr_payment_qr_image_url: row.qr_payment_qr_image_url || null,
                privacy_policy_content: row.privacy_policy_content ?? '',
                terms_of_service_content: row.terms_of_service_content ?? ''
            }
        });
    } catch (err) {
        console.error('CMS get settings error:', err);
        res.status(500).json({ success: false, message: 'โหลดตั้งค่าไม่สำเร็จ' });
    }
}

/**
 * อัปเดตตั้งค่า CMS (โลโก้ URL, พื้นหลัง URL, สีพื้นหลัง)
 */
async function updateSettings(req, res) {
    try {
        const { login_logo_url, login_bg_image_url, login_bg_color, qr_payment_bank_name, qr_payment_account_no, qr_payment_account_name, qr_payment_qr_image_url, privacy_policy_content, terms_of_service_content } = req.body || {};
        const logo = login_logo_url != null ? String(login_logo_url).trim() || null : null;
        const bgImage = login_bg_image_url != null ? String(login_bg_image_url).trim() || null : null;
        const bgColor = (login_bg_color != null && String(login_bg_color).trim()) ? String(login_bg_color).trim() : '#5b21b6';
        const qrBank = qr_payment_bank_name != null ? String(qr_payment_bank_name).trim().slice(0, 255) || null : null;
        const qrAccNo = qr_payment_account_no != null ? String(qr_payment_account_no).trim().slice(0, 100) || null : null;
        const qrAccName = qr_payment_account_name != null ? String(qr_payment_account_name).trim().slice(0, 255) || null : null;
        const qrImage = qr_payment_qr_image_url != null ? String(qr_payment_qr_image_url).trim() || null : null;
        const privacyContent = privacy_policy_content != null ? String(privacy_policy_content).trim() || null : null;
        const termsContent = terms_of_service_content != null ? String(terms_of_service_content).trim() || null : null;
        await pool.query(
            `INSERT INTO cms_settings (id, login_logo_url, login_bg_image_url, login_bg_color, updated_at, qr_payment_bank_name, qr_payment_account_no, qr_payment_account_name, qr_payment_qr_image_url, privacy_policy_content, terms_of_service_content)
             VALUES (1, $1, $2, $3, CURRENT_TIMESTAMP, $4, $5, $6, $7, $8, $9)
             ON CONFLICT (id) DO UPDATE SET
               login_logo_url = EXCLUDED.login_logo_url,
               login_bg_image_url = EXCLUDED.login_bg_image_url,
               login_bg_color = EXCLUDED.login_bg_color,
               updated_at = CURRENT_TIMESTAMP,
               qr_payment_bank_name = COALESCE(EXCLUDED.qr_payment_bank_name, cms_settings.qr_payment_bank_name),
               qr_payment_account_no = COALESCE(EXCLUDED.qr_payment_account_no, cms_settings.qr_payment_account_no),
               qr_payment_account_name = COALESCE(EXCLUDED.qr_payment_account_name, cms_settings.qr_payment_account_name),
               qr_payment_qr_image_url = COALESCE(EXCLUDED.qr_payment_qr_image_url, cms_settings.qr_payment_qr_image_url),
               privacy_policy_content = COALESCE(EXCLUDED.privacy_policy_content, cms_settings.privacy_policy_content),
               terms_of_service_content = COALESCE(EXCLUDED.terms_of_service_content, cms_settings.terms_of_service_content)`,
            [logo, bgImage, bgColor, qrBank, encrypt(qrAccNo), encrypt(qrAccName), qrImage, privacyContent, termsContent]
        );
        res.json({ success: true, message: 'บันทึกตั้งค่าแล้ว' });
    } catch (err) {
        console.error('CMS update settings error:', err);
        res.status(500).json({ success: false, message: 'บันทึกไม่สำเร็จ' });
    }
}

/**
 * อัปโหลดรูปตั้งค่า CMS (โลโก้ หรือ พื้นหลังหน้า Login) — บันทึกใน uploads/cms/settings แปลงเป็น WebP
 */
async function uploadSettingsImage(req, res) {
    try {
        if (!req.file || !req.file.filename) {
            return res.status(400).json({ success: false, message: 'กรุณาเลือกไฟล์รูป' });
        }
        const fullPath = path.join(process.cwd(), 'uploads/cms/settings', req.file.filename);
        const outFilename = await convertToWebp(fullPath);
        const url = '/uploads/cms/settings/' + outFilename;
        res.json({ success: true, url });
    } catch (err) {
        console.error('CMS upload settings image error:', err);
        res.status(500).json({ success: false, message: err.message || 'อัปโหลดไม่สำเร็จ' });
    }
}

/**
 * อัปโหลดรูป QR การชำระเงิน — บันทึกใน uploads/cms/qr แปลงเป็น WebP
 */
async function uploadQrImage(req, res) {
    try {
        if (!req.file || !req.file.filename) {
            return res.status(400).json({ success: false, message: 'กรุณาเลือกไฟล์รูป' });
        }
        const fullPath = path.join(process.cwd(), 'uploads/cms/qr', req.file.filename);
        const outFilename = await convertToWebp(fullPath);
        const url = '/uploads/cms/qr/' + outFilename;
        res.json({ success: true, url });
    } catch (err) {
        console.error('CMS upload QR image error:', err);
        res.status(500).json({ success: false, message: err.message || 'อัปโหลดไม่สำเร็จ' });
    }
}

/**
 * แพ็กเกจ — รายการทั้งหมด (CMS)
 */
async function getPackages(req, res) {
    try {
        const result = await pool.query(
            'SELECT id, name, duration_days, description, price, COALESCE(is_active, true) AS is_active, sort_order, period_type, coupon_id, COALESCE(requires_payment, true) AS requires_payment, max_uses_per_user, created_at, updated_at FROM packages ORDER BY sort_order ASC, id ASC'
        );
        res.json({ success: true, data: result.rows || [] });
    } catch (err) {
        console.error('CMS get packages error:', err);
        res.status(500).json({ success: false, message: 'โหลดรายการไม่สำเร็จ' });
    }
}

/**
 * แพ็กเกจเดียว (สำหรับแก้ไข)
 */
async function getPackageById(req, res) {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) return res.status(400).json({ success: false, message: 'ID ไม่ถูกต้อง' });
        const result = await pool.query('SELECT * FROM packages WHERE id = $1', [id]);
        if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'ไม่พบแพ็กเกจ' });
        res.json({ success: true, data: result.rows[0] });
    } catch (err) {
        console.error('CMS get package error:', err);
        res.status(500).json({ success: false, message: 'โหลดไม่สำเร็จ' });
    }
}

/**
 * สร้างแพ็กเกจใหม่
 */
async function createPackage(req, res) {
    try {
        const { name, duration_days, description, price, period_type, coupon_id, requires_payment, max_uses_per_user } = req.body || {};
        if (!name || duration_days == null) {
            return res.status(400).json({ success: false, message: 'กรุณากรอกชื่อและจำนวนวันใช้งาน' });
        }
        const days = parseInt(String(duration_days), 10);
        if (isNaN(days) || days < 0) {
            return res.status(400).json({ success: false, message: 'จำนวนวันต้องเป็นตัวเลขที่ไม่ติดลบ' });
        }
        const priceVal = parseFloat(price) != null && !isNaN(parseFloat(price)) ? parseFloat(price) : 0;
        let periodVal = (period_type || '').trim().toLowerCase() || null;
        if (periodVal !== 'annual' && periodVal !== '3months') periodVal = null;
        const couponIdVal = coupon_id != null && coupon_id !== '' ? parseInt(coupon_id, 10) : null;
        if (couponIdVal != null && !isNaN(couponIdVal)) {
            const couponRow = await pool.query('SELECT id, condition_type FROM coupons WHERE id = $1 AND coupon_type = $2', [couponIdVal, 'discount']);
            if (couponRow.rows.length > 0 && couponRow.rows[0].condition_type) {
                const firstCond = (couponRow.rows[0].condition_type || '').split(',')[0].trim().toLowerCase();
                if (firstCond === 'annual' || firstCond === '3months') periodVal = firstCond;
            }
        }
        const requiresPaymentVal = requires_payment !== false && requires_payment !== 'false';
        const maxUsesVal = max_uses_per_user != null && String(max_uses_per_user).trim() !== '' ? parseInt(max_uses_per_user, 10) : null;
        const result = await pool.query(
            'INSERT INTO packages (name, duration_days, description, price, is_active, sort_order, period_type, coupon_id, requires_payment, max_uses_per_user) VALUES ($1, $2, $3, $4, true, (SELECT COALESCE(MAX(sort_order),0)+1 FROM packages), $5, $6, $7, $8) RETURNING *',
            [String(name).trim(), days, description ? String(description).trim() : null, priceVal, periodVal, couponIdVal && !isNaN(couponIdVal) ? couponIdVal : null, requiresPaymentVal, maxUsesVal]
        );
        res.status(201).json({ success: true, message: 'เพิ่มแพ็กเกจแล้ว', data: result.rows[0] });
    } catch (err) {
        console.error('CMS create package error:', err);
        res.status(500).json({ success: false, message: 'บันทึกไม่สำเร็จ' });
    }
}

/**
 * แก้ไขแพ็กเกจ
 */
async function updatePackage(req, res) {
    try {
        const id = parseInt(req.params.id, 10);
        const { name, duration_days, description, price, is_active, period_type, coupon_id, requires_payment, max_uses_per_user } = req.body || {};
        if (isNaN(id)) return res.status(400).json({ success: false, message: 'ID ไม่ถูกต้อง' });
        if (!name || duration_days == null) {
            return res.status(400).json({ success: false, message: 'กรุณากรอกชื่อและจำนวนวันใช้งาน' });
        }
        const days = parseInt(String(duration_days), 10);
        if (isNaN(days) || days < 0) {
            return res.status(400).json({ success: false, message: 'จำนวนวันต้องเป็นตัวเลขที่ไม่ติดลบ' });
        }
        const priceVal = parseFloat(price) != null && !isNaN(parseFloat(price)) ? parseFloat(price) : 0;
        let periodVal = (period_type || '').trim().toLowerCase() || null;
        if (periodVal !== 'annual' && periodVal !== '3months') periodVal = null;
        const couponIdVal = coupon_id != null && coupon_id !== '' ? parseInt(coupon_id, 10) : null;
        if (couponIdVal != null && !isNaN(couponIdVal)) {
            const couponRow = await pool.query('SELECT id, condition_type FROM coupons WHERE id = $1 AND coupon_type = $2', [couponIdVal, 'discount']);
            if (couponRow.rows.length > 0 && couponRow.rows[0].condition_type) {
                const firstCond = (couponRow.rows[0].condition_type || '').split(',')[0].trim().toLowerCase();
                if (firstCond === 'annual' || firstCond === '3months') periodVal = firstCond;
            }
        }
        const finalCouponId = couponIdVal != null && !isNaN(couponIdVal) ? couponIdVal : null;
        const requiresPaymentVal = requires_payment !== false && requires_payment !== 'false';
        const maxUsesVal = max_uses_per_user != null && String(max_uses_per_user).trim() !== '' ? parseInt(max_uses_per_user, 10) : null;
        await pool.query(
            'UPDATE packages SET name = $1, duration_days = $2, description = $3, price = $4, updated_at = CURRENT_TIMESTAMP, is_active = COALESCE($5, is_active), period_type = $6, coupon_id = $7, requires_payment = $8, max_uses_per_user = $9 WHERE id = $10',
            [String(name).trim(), days, description != null ? String(description).trim() : null, priceVal, is_active, periodVal, finalCouponId, requiresPaymentVal, maxUsesVal, id]
        );
        res.json({ success: true, message: 'แก้ไขแล้ว' });
    } catch (err) {
        console.error('CMS update package error:', err);
        res.status(500).json({ success: false, message: 'บันทึกไม่สำเร็จ' });
    }
}

// -----------------------------------------------------------------------------
// คูปอง (Coupons)
// -----------------------------------------------------------------------------
async function getCoupons(req, res) {
    try {
        const result = await pool.query(
            `SELECT id, code, name, description, coupon_type, value, condition_type, discount_percent, valid_from, valid_until, max_uses, use_count, is_active, created_at, updated_at
             FROM coupons ORDER BY created_at DESC`
        );
        res.json({ success: true, data: result.rows });
    } catch (err) {
        console.error('CMS get coupons error:', err);
        res.status(500).json({ success: false, message: 'โหลดรายการคูปองไม่สำเร็จ' });
    }
}

async function getCouponById(req, res) {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) return res.status(400).json({ success: false, message: 'ID ไม่ถูกต้อง' });
        const result = await pool.query(
            'SELECT * FROM coupons WHERE id = $1',
            [id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'ไม่พบคูปอง' });
        }
        res.json({ success: true, data: result.rows[0] });
    } catch (err) {
        console.error('CMS get coupon error:', err);
        res.status(500).json({ success: false, message: 'โหลดคูปองไม่สำเร็จ' });
    }
}

async function createCoupon(req, res) {
    try {
        const { code, name, description, coupon_type, value, condition_type, discount_percent, valid_from, valid_until, max_uses, is_active } = req.body || {};
        const rawCode = (code || '').trim();
        if (!rawCode) {
            return res.status(400).json({ success: false, message: 'กรุณากรอกรหัสคูปอง' });
        }
        const type = (coupon_type || 'extend_days').trim().toLowerCase();
        const val = parseInt(value, 10);
        if (type === 'extend_days' && (isNaN(val) || val < 1)) {
            return res.status(400).json({ success: false, message: 'กรุณาระบุจำนวนวัน (value) เป็นตัวเลขมากกว่า 0' });
        }
        if (type === 'discount') {
            const pct = parseInt(discount_percent, 10);
            if (isNaN(pct) || pct < 1 || pct > 100) {
                return res.status(400).json({ success: false, message: 'กรุณาระบุเปอร์เซ็นต์ส่วนลด 1-100' });
            }
        }
        const maxUses = max_uses != null && max_uses !== '' ? parseInt(max_uses, 10) : null;
        const validFrom = valid_from ? new Date(valid_from) : null;
        const validUntil = valid_until ? new Date(valid_until) : null;
        const active = is_active !== false;
        const condType = null;
        const discountPct = type === 'discount' ? Math.min(100, Math.max(0, parseInt(discount_percent, 10) || 0)) : null;

        const result = await pool.query(
            `INSERT INTO coupons (code, name, description, coupon_type, value, condition_type, discount_percent, valid_from, valid_until, max_uses, is_active)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
             RETURNING id, code, name, description, coupon_type, value, condition_type, discount_percent, valid_from, valid_until, max_uses, use_count, is_active, created_at`,
            [rawCode.toUpperCase(), name ? String(name).trim() : null, description ? String(description).trim() : null, type, isNaN(val) ? 0 : val, condType, discountPct, validFrom, validUntil, maxUses, active]
        );
        res.status(201).json({ success: true, message: 'สร้างคูปองแล้ว', data: result.rows[0] });
    } catch (err) {
        if (err.code === '23505') {
            return res.status(400).json({ success: false, message: 'รหัสคูปองนี้มีอยู่แล้ว' });
        }
        console.error('CMS create coupon error:', err);
        res.status(500).json({ success: false, message: 'บันทึกไม่สำเร็จ' });
    }
}

async function updateCoupon(req, res) {
    try {
        const id = parseInt(req.params.id, 10);
        const { code, name, description, coupon_type, value, condition_type, discount_percent, valid_from, valid_until, max_uses, is_active } = req.body || {};
        if (isNaN(id)) return res.status(400).json({ success: false, message: 'ID ไม่ถูกต้อง' });
        const rawCode = (code || '').trim();
        if (!rawCode) {
            return res.status(400).json({ success: false, message: 'กรุณากรอกรหัสคูปอง' });
        }
        const type = (coupon_type || 'extend_days').trim().toLowerCase();
        const val = parseInt(value, 10);
        if (type === 'extend_days' && (isNaN(val) || val < 1)) {
            return res.status(400).json({ success: false, message: 'กรุณาระบุจำนวนวัน (value) เป็นตัวเลขมากกว่า 0' });
        }
        if (type === 'discount') {
            const pct = parseInt(discount_percent, 10);
            if (isNaN(pct) || pct < 1 || pct > 100) {
                return res.status(400).json({ success: false, message: 'กรุณาระบุเปอร์เซ็นต์ส่วนลด 1-100' });
            }
        }
        const maxUses = max_uses != null && max_uses !== '' ? parseInt(max_uses, 10) : null;
        const validFrom = valid_from ? new Date(valid_from) : null;
        const validUntil = valid_until ? new Date(valid_until) : null;
        const condType = null;
        const discountPct = type === 'discount' ? Math.min(100, Math.max(0, parseInt(discount_percent, 10) || 0)) : null;

        await pool.query(
            `UPDATE coupons SET code = $1, name = $2, description = $3, coupon_type = $4, value = $5, condition_type = $6, discount_percent = $7, valid_from = $8, valid_until = $9, max_uses = $10, is_active = $11, updated_at = CURRENT_TIMESTAMP WHERE id = $12`,
            [rawCode.toUpperCase(), name ? String(name).trim() : null, description ? String(description).trim() : null, type, isNaN(val) ? 0 : val, condType, discountPct, validFrom, validUntil, maxUses, is_active !== false, id]
        );
        res.json({ success: true, message: 'แก้ไขคูปองแล้ว' });
    } catch (err) {
        if (err.code === '23505') {
            return res.status(400).json({ success: false, message: 'รหัสคูปองนี้มีอยู่แล้ว' });
        }
        console.error('CMS update coupon error:', err);
        res.status(500).json({ success: false, message: 'บันทึกไม่สำเร็จ' });
    }
}

async function deleteCoupon(req, res) {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) return res.status(400).json({ success: false, message: 'ID ไม่ถูกต้อง' });
        await pool.query('DELETE FROM coupons WHERE id = $1', [id]);
        res.json({ success: true, message: 'ลบคูปองแล้ว' });
    } catch (err) {
        console.error('CMS delete coupon error:', err);
        res.status(500).json({ success: false, message: 'ลบไม่สำเร็จ' });
    }
}

module.exports = {
    cmsLogin,
    getDashboard,
    getTemplates,
    getTemplateById,
    createTemplate,
    updateTemplate,
    toggleTemplate,
    deleteTemplate,
    getUsers,
    getUsersStats,
    getUserById,
    getUserPaymentChannels,
    getUserPendingPayments,
    getUserSavedCouponNextPayment,
    getUserPaymentHistory,
    verifyPendingPayment,
    setUserActive,
    updateUserMembership,
    getAdmins,
    createAdmin,
    updateAdmin,
    deleteAdmin,
    getCmsMe,
    getLoginHistory,
    getNotifications,
    getLoginSettings,
    getSettings,
    updateSettings,
    uploadSettingsImage,
    uploadQrImage,
    getPackages,
    getPackageById,
    createPackage,
    updatePackage,
    getCoupons,
    getCouponById,
    createCoupon,
    updateCoupon,
    deleteCoupon
};
