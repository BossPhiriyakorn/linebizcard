const pool = require('../config/database');
const { addCmsNotification } = require('../utils/cmsNotification');
const { decryptIfEncrypted } = require('../utils/encryption');

/**
 * ดูรายการรอชำระ (สำหรับหน้า QR - เฉพาะของตัวเอง และ status ยังไม่ approved/rejected)
 */
async function getPaymentRequest(req, res) {
    try {
        const userId = parseInt(req.user?.id, 10);
        const id = parseInt(req.params.id, 10);
        if (isNaN(userId)) return res.status(401).json({ success: false, message: 'กรุณาเข้าสู่ระบบ' });
        if (isNaN(id)) return res.status(400).json({ success: false, message: 'ID ไม่ถูกต้อง' });
        const row = await pool.query(
            `SELECT pp.id, pp.user_id, pp.package_id, pp.amount, pp.original_amount, pp.discount_amount, pp.extra_days, pp.status, pp.slip_image_url, pp.slip_uploaded_at, pp.created_at, p.name AS package_name
             FROM pending_payments pp
             JOIN packages p ON p.id = pp.package_id
             WHERE pp.id = $1 AND pp.user_id = $2`,
            [id, userId]
        );
        if (row.rows.length === 0) return res.status(404).json({ success: false, message: 'ไม่พบรายการนี้' });
        const item = row.rows[0];
        const settings = await pool.query(
            'SELECT qr_payment_bank_name, qr_payment_account_no, qr_payment_account_name, qr_payment_qr_image_url FROM cms_settings WHERE id = 1 LIMIT 1'
        );
        const qrPayment = settings.rows[0] || {};
        res.json({
            success: true,
            data: {
                ...item,
                qr_payment: {
                    bank_name: qrPayment.qr_payment_bank_name || null,
                    account_no: decryptIfEncrypted(qrPayment.qr_payment_account_no) ?? qrPayment.qr_payment_account_no ?? null,
                    account_name: decryptIfEncrypted(qrPayment.qr_payment_account_name) ?? qrPayment.qr_payment_account_name ?? null,
                    qr_image_url: qrPayment.qr_payment_qr_image_url || null,
                }
            }
        });
    } catch (err) {
        console.error('getPaymentRequest error:', err);
        res.status(500).json({ success: false, message: 'โหลดไม่สำเร็จ' });
    }
}

/**
 * แนบสลิปการโอน (อัพโหลดรูป)
 */
async function uploadSlip(req, res) {
    try {
        const userId = parseInt(req.user?.id, 10);
        const id = parseInt(req.params.id, 10);
        if (isNaN(userId)) return res.status(401).json({ success: false, message: 'กรุณาเข้าสู่ระบบ' });
        if (isNaN(id)) return res.status(400).json({ success: false, message: 'ID ไม่ถูกต้อง' });
        const file = req.file;
        if (!file || !file.filename) return res.status(400).json({ success: false, message: 'กรุณาเลือกไฟล์สลิป' });
        const uploadDirName = process.env.UPLOAD_DIR || 'uploads/images';
        const relPath = '/' + uploadDirName + '/' + String(userId) + '/' + file.filename;
        const owner = await pool.query('SELECT id, status FROM pending_payments WHERE id = $1 AND user_id = $2', [id, userId]);
        if (owner.rows.length === 0) return res.status(404).json({ success: false, message: 'ไม่พบรายการนี้' });
        if (owner.rows[0].status !== 'pending') return res.status(400).json({ success: false, message: 'รายการนี้แนบสลิปแล้วหรือปิดแล้ว' });
        await pool.query(
            `UPDATE pending_payments SET slip_image_url = $1, slip_uploaded_at = CURRENT_TIMESTAMP, status = 'slip_uploaded', updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND user_id = $3`,
            [relPath, id, userId]
        );
        addCmsNotification(pool, {
            notification_type: 'payment_pending_review',
            title: 'ลูกค้ารอตรวจสอบยอดชำระ',
            message: `ลูกค้าแนบสลิปแล้ว รายการ #${id} (User ID: ${userId})`,
            link_url: `/cms/users/${userId}`,
            related_user_id: userId,
            related_pending_payment_id: id
        }).catch(() => {});
        res.json({ success: true, message: 'แนบสลิปแล้ว รอแอดมินตรวจสอบ', data: { slip_image_url: relPath } });
    } catch (err) {
        console.error('uploadSlip error:', err);
        res.status(500).json({ success: false, message: 'อัพโหลดไม่สำเร็จ' });
    }
}

module.exports = {
    getPaymentRequest,
    uploadSlip,
};
