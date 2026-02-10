/**
 * LINE Pay Controller — รอเชื่อมต่อ API จริง
 * reserve: สร้างคำสั่งชำระ ได้ redirectUrl ไป LINE Pay
 * confirm: callback หลังผู้ใช้ชำระแล้ว → ยืนยันกับ LINE Pay แล้วอัปเดตสมาชิก + payment_history
 */

const pool = require('../config/database');
const linePayConfig = require('../config/linePay');
const linePayService = require('../services/linePayService');
const { couponAppliesToPackage } = require('./couponController');
const { addCmsNotification } = require('../utils/cmsNotification');

function generateOrderId(userId) {
    return 'LP' + Date.now() + '-' + userId + '-' + Math.random().toString(36).slice(2, 10);
}

/**
 * POST /api/line-pay/reserve
 * Body: { package_id, coupon_code? }
 * สร้างคำสั่งชำระ LINE Pay → คืน redirectUrl (เมื่อเชื่อมต่อ API แล้ว)
 */
async function reserve(req, res) {
    try {
        const userId = parseInt(req.user?.id, 10);
        if (isNaN(userId)) {
            return res.status(401).json({ success: false, message: 'กรุณาเข้าสู่ระบบ' });
        }
        if (!linePayConfig.isConfigured()) {
            return res.status(200).json({
                success: false,
                message: 'LINE Pay ยังไม่เปิดใช้ (รอเชื่อมต่อ API)',
                code: 'LINE_PAY_NOT_CONFIGURED',
            });
        }
        const { package_id, coupon_code } = req.body || {};
        const pkgId = parseInt(String(package_id), 10);
        if (!package_id || isNaN(pkgId)) {
            return res.status(400).json({ success: false, message: 'กรุณาเลือกแพ็กเกจ' });
        }
        const pkgResult = await pool.query(
            'SELECT id, name, duration_days, period_type, COALESCE(price, 0) AS price FROM packages WHERE id = $1 AND COALESCE(is_active, true) = true',
            [pkgId]
        );
        if (pkgResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'ไม่พบแพ็กเกจ' });
        }
        const pkg = pkgResult.rows[0];
        let originalAmount = parseFloat(pkg.price) != null && !isNaN(parseFloat(pkg.price)) ? parseFloat(pkg.price) : 0;
        let couponId = null;
        let extraDays = null;
        let discountAmount = 0;
        if (coupon_code && String(coupon_code).trim()) {
            const code = String(coupon_code).trim().toUpperCase();
            const couponResult = await pool.query(
                `SELECT id, coupon_type, condition_type, discount_percent, use_count, max_uses, is_active, valid_from, valid_until
                 FROM coupons WHERE UPPER(TRIM(code)) = $1`,
                [code]
            );
            if (couponResult.rows.length > 0) {
                const coupon = couponResult.rows[0];
                const now = new Date();
                const pkgPeriod = (pkg.period_type || '').toLowerCase();
                const allowedConditions = (coupon.condition_type || '').toLowerCase().split(',').map((c) => c.trim()).filter(Boolean);
                const appliesToPackage = await couponAppliesToPackage(pkgId, coupon.id);
                if (
                    coupon.coupon_type === 'discount' &&
                    coupon.is_active &&
                    (!coupon.valid_from || new Date(coupon.valid_from) <= now) &&
                    (!coupon.valid_until || new Date(coupon.valid_until) >= now) &&
                    (coupon.max_uses == null || (coupon.use_count || 0) < coupon.max_uses) &&
                    appliesToPackage &&
                    pkgPeriod &&
                    allowedConditions.length > 0 &&
                    allowedConditions.includes(pkgPeriod)
                ) {
                    const already = await pool.query(
                        'SELECT id FROM coupon_redemptions WHERE coupon_id = $1 AND user_id = $2',
                        [coupon.id, userId]
                    );
                    if (already.rows.length === 0) {
                        const pct = Math.min(100, Math.max(0, parseInt(coupon.discount_percent, 10) || 0));
                        discountAmount = Math.round(originalAmount * (pct / 100) * 100) / 100;
                        couponId = coupon.id;
                        extraDays = 0;
                    }
                }
            }
        }
        const amount = Math.max(0, originalAmount - discountAmount);
        if (amount <= 0) {
            return res.status(400).json({
                success: false,
                message: originalAmount > 0 ? 'หลังใช้คูปองราคาเป็น 0 บาท ไม่สามารถชำระด้วย LINE Pay ได้' : 'แพ็กเกจนี้ไม่ต้องชำระด้วย LINE Pay',
            });
        }
        const orderId = generateOrderId(userId);
        const confirmUrl = linePayConfig.getConfirmUrl();
        const cancelUrl = linePayConfig.getCancelUrl();
        const reserveResult = await linePayService.reserve({
            orderId,
            amount,
            productName: pkg.name,
            confirmUrl,
            cancelUrl,
        });
        if (!reserveResult.success || !reserveResult.redirectUrl) {
            let msg = reserveResult.message || 'LINE Pay ยังรอเชื่อมต่อ API';
            // เมื่อ LINE Pay คืนข้อความเรื่องขั้นต่ำ ให้แนะนำให้ใช้ปุ่มถัดไป (QR) แทน — ระบบเราไม่บังคับขั้นต่ำ
            if (/ไม่ต่ำกว่า|ขั้นต่ำ|minimum|ต่ำกว่า\s*เกณฑ์/i.test(msg)) {
                msg = 'ยอดหลังส่วนลดต่ำกว่าเกณฑ์ของ LINE Pay กรุณากดปุ่ม "ถัดไป — ไปหน้าคิวอาร์และแนบสลิป" เพื่อชำระได้';
            }
            return res.status(200).json({
                success: false,
                message: msg,
                code: reserveResult.code || 'NOT_IMPLEMENTED',
            });
        }
        await pool.query(
            `INSERT INTO pending_payments (user_id, package_id, payment_channel_id, amount, original_amount, discount_amount, coupon_id, extra_days, status, line_pay_order_id, line_pay_transaction_id)
             VALUES ($1, $2, NULL, $3, $4, $5, $6, $7, 'pending', $8, $9)`,
            [
                userId,
                pkgId,
                amount,
                originalAmount,
                discountAmount,
                couponId,
                extraDays,
                orderId,
                reserveResult.transactionId || null,
            ]
        );
        res.json({
            success: true,
            message: 'กำลังพาไปชำระด้วย LINE Pay',
            data: { redirectUrl: reserveResult.redirectUrl },
        });
    } catch (err) {
        console.error('LINE Pay reserve error:', err);
        res.status(500).json({ success: false, message: 'สร้างรายการชำระไม่สำเร็จ' });
    }
}

/**
 * GET /api/line-pay/confirm
 * Query: transactionId, orderId (จาก LINE Pay redirect)
 * ยืนยันการชำระกับ LINE Pay แล้วอัปเดตสมาชิก + payment_history แล้ว redirect
 */
async function confirm(req, res) {
    try {
        const { transactionId, orderId } = req.query || {};
        const baseUrl = process.env.BASE_URL || '';
        const successRedirect = baseUrl ? `${baseUrl.replace(/\/$/, '')}/package?line_pay=success` : '/package?line_pay=success';
        const failRedirect = baseUrl ? `${baseUrl.replace(/\/$/, '')}/payment-summary?error=line_pay` : '/payment-summary?error=line_pay';
        if (!orderId || !transactionId) {
            return res.redirect(failRedirect);
        }
        const row = await pool.query(
            'SELECT id, user_id, package_id, amount, original_amount, discount_amount, extra_days, coupon_id, status FROM pending_payments WHERE line_pay_order_id = $1',
            [orderId]
        );
        if (row.rows.length === 0) {
            return res.redirect(failRedirect);
        }
        const pending = row.rows[0];
        if (pending.status !== 'pending') {
            return res.redirect(successRedirect);
        }
        const amount = parseFloat(pending.amount);
        const confirmResult = await linePayService.confirm(transactionId, amount, orderId);
        if (!confirmResult.success) {
            return res.redirect(failRedirect);
        }
        const pkgRow = await pool.query('SELECT id, name, duration_days FROM packages WHERE id = $1', [pending.package_id]);
        if (pkgRow.rows.length === 0) {
            return res.redirect(failRedirect);
        }
        const pkg = pkgRow.rows[0];
        const baseDays = parseInt(pkg.duration_days, 10) || 0;
        const durationDays = baseDays + (parseInt(pending.extra_days, 10) || 0);
        const startDate = new Date();
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + durationDays);
        const existing = await pool.query(
            'SELECT id FROM memberships WHERE user_id = $1 AND status = $2 LIMIT 1',
            [pending.user_id, 'active']
        );
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
            `UPDATE pending_payments SET status = 'approved', verified_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
            [pending.id]
        );
        addCmsNotification(pool, {
            notification_type: 'payment_done',
            title: 'ลูกค้าชำระเงิน (LINE Pay)',
            message: `LINE Pay แพ็กเกจ ${pkg.name} (User ID: ${pending.user_id})`,
            link_url: `/cms/users/${pending.user_id}`,
            related_user_id: pending.user_id,
            related_pending_payment_id: pending.id,
        }).catch(() => {});
        res.redirect(successRedirect);
    } catch (err) {
        console.error('LINE Pay confirm error:', err);
        const baseUrl = process.env.BASE_URL || '';
        const failRedirect = baseUrl ? `${baseUrl.replace(/\/$/, '')}/payment-summary?error=line_pay` : '/payment-summary?error=line_pay';
        res.redirect(failRedirect);
    }
}

module.exports = {
    reserve,
    confirm,
};
