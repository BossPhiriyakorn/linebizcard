/**
 * สร้างแจ้งเตือนในตาราง cms_notifications (สำหรับแดชบอร์ด CMS)
 * ใช้เมื่อมีเหตุการณ์เช่น ลูกค้าสมัครใหม่, ลูกค้าชำระเงิน, รอตรวจสอบสลิป, แอดมินเข้าใช้งาน, การใช้คูปอง ฯลฯ
 * @param {object} pool - pg Pool
 * @param {object} opts - { notification_type, title, message?, link_url?, related_user_id?, related_card_id?, related_admin_id?, related_pending_payment_id? }
 */
async function addCmsNotification(pool, opts) {
    if (!pool || !opts || !opts.notification_type || !opts.title) return;
    try {
        await pool.query(
            `INSERT INTO cms_notifications (notification_type, title, message, link_url, related_user_id, related_card_id, related_admin_id, related_pending_payment_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
                opts.notification_type,
                opts.title,
                opts.message || null,
                opts.link_url || null,
                opts.related_user_id ?? null,
                opts.related_card_id ?? null,
                opts.related_admin_id ?? null,
                opts.related_pending_payment_id ?? null
            ]
        );
    } catch (err) {
        console.error('addCmsNotification error:', err.message);
    }
}

module.exports = { addCmsNotification };
