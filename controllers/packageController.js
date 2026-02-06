const pool = require('../config/database');
const { couponAppliesToPackage } = require('./couponController');
const { addCmsNotification } = require('../utils/cmsNotification');

/**
 * รายการแพ็กเกจที่เปิดใช้งาน (สำหรับหน้าเลือกแพ็กเกจหลังสมัคร)
 */
async function getActivePackages(req, res) {
    try {
        const result = await pool.query(
            `SELECT id, name, duration_days, description, price, period_type,
             COALESCE(requires_payment, true) AS requires_payment,
             max_uses_per_user
             FROM packages 
             WHERE COALESCE(is_active, true) = true 
             ORDER BY sort_order ASC, id ASC`
        );
        res.json({ success: true, data: result.rows || [] });
    } catch (err) {
        console.error('Get active packages error:', err);
        res.status(500).json({ success: false, message: 'โหลดรายการแพ็กเกจไม่สำเร็จ' });
    }
}

/**
 * เลือกแพ็กเกจ — ถ้ามีสมาชิกภาพ active อยู่แล้วให้อัปเดตแถวเดิม (เปลี่ยนแพ็กเกจ) ถ้าไม่มีให้ INSERT ใหม่
 * ต้อง login แล้ว (หลังกรอกข้อมูลสมัคร)
 */
async function choosePackage(req, res) {
    try {
        const userId = parseInt(req.user?.id, 10);
        if (isNaN(userId)) {
            return res.status(401).json({ success: false, message: 'กรุณาเข้าสู่ระบบก่อนเลือกแพ็กเกจ' });
        }
        const { package_id, coupon_code, payment_channel_id } = req.body || {};
        const pkgId = parseInt(String(package_id), 10);
        if (!package_id || isNaN(pkgId)) {
            return res.status(400).json({ success: false, message: 'กรุณาเลือกแพ็กเกจ' });
        }

        const pkgResult = await pool.query(
            `SELECT id, name, duration_days, period_type, COALESCE(price, 0) AS price,
             COALESCE(requires_payment, true) AS requires_payment, max_uses_per_user
             FROM packages WHERE id = $1 AND COALESCE(is_active, true) = true`,
            [pkgId]
        );
        if (pkgResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'ไม่พบแพ็กเกจที่เลือก' });
        }
        const pkg = pkgResult.rows[0];

        const requiresPayment = pkg.requires_payment === true;
        const maxUsesPerUser = pkg.max_uses_per_user != null ? parseInt(pkg.max_uses_per_user, 10) : null;

        if (maxUsesPerUser != null && !isNaN(maxUsesPerUser)) {
            const countResult = await pool.query(
                'SELECT COUNT(*) AS cnt FROM payment_history WHERE user_id = $1 AND package_id = $2',
                [userId, pkgId]
            );
            const usedCount = parseInt(countResult.rows[0]?.cnt ?? 0, 10);
            if (usedCount >= maxUsesPerUser) {
                return res.status(400).json({
                    success: false,
                    message: `แพ็กเกจนี้จำกัดการใช้ ${maxUsesPerUser} ครั้งต่อบัญชี คุณใช้ครบแล้ว`,
                    code: 'MAX_USES_REACHED'
                });
            }
        }

        let channelId = payment_channel_id != null && payment_channel_id !== '' ? parseInt(payment_channel_id, 10) : null;
        let channel = null;
        if (requiresPayment) {
            if (channelId == null || isNaN(channelId)) {
                return res.status(400).json({ success: false, message: 'กรุณาเลือกวิธีชำระเงิน', code: 'PAYMENT_CHANNEL_REQUIRED' });
            }
            const channels = await pool.query('SELECT id, channel_type FROM payment_channels WHERE user_id = $1', [userId]);
            if (channels.rows.length === 0) {
                return res.status(400).json({ success: false, message: 'กรุณาลงทะเบียนช่องทางการชำระเงินก่อน', code: 'NO_PAYMENT_CHANNEL' });
            }
            channel = channels.rows.find((c) => c.id === channelId);
            if (!channel) {
                return res.status(400).json({ success: false, message: 'วิธีชำระเงินไม่ถูกต้อง', code: 'INVALID_CHANNEL' });
            }
        }
        let durationDays = parseInt(pkg.duration_days, 10) || 0;
        let couponApplied = null;
        /** เมื่อผู้ใช้กรอกคูปองแต่ใช้กับแพ็กเกจนี้ไม่ได้ ให้คืนข้อความชัดเจน (ใส่ตอนเลือกแพ็กเกจก่อนชำระเงิน) */
        let couponRejectReason = null;

        if (coupon_code && (coupon_code || '').trim()) {
            const code = String(coupon_code).trim().toUpperCase();
            const couponResult = await pool.query(
                `SELECT id, coupon_type, condition_type, discount_percent, use_count, max_uses, is_active, valid_from, valid_until
                 FROM coupons WHERE UPPER(TRIM(code)) = $1`,
                [code]
            );
            if (couponResult.rows.length === 0) {
                couponRejectReason = 'รหัสคูปองไม่ถูกต้องหรือหมดอายุ';
            } else {
                const coupon = couponResult.rows[0];
                const now = new Date();
                if (coupon.coupon_type !== 'discount' || !coupon.is_active ||
                    (coupon.valid_from && new Date(coupon.valid_from) > now) ||
                    (coupon.valid_until && new Date(coupon.valid_until) < now) ||
                    (coupon.max_uses != null && (coupon.use_count || 0) >= coupon.max_uses)) {
                    couponRejectReason = 'รหัสคูปองไม่สามารถใช้ได้ในขณะนี้';
                } else {
                    const pkgPeriod = (pkg.period_type || '').toLowerCase();
                    const couponCondition = (coupon.condition_type || '').toLowerCase();
                    const appliesToPackage = await couponAppliesToPackage(pkgId, coupon.id);
                    if (!pkgPeriod || !couponCondition) {
                        couponRejectReason = 'คูปองนี้ใช้กับแพ็กเกจที่เลือกไม่ได้';
                    } else if (!appliesToPackage) {
                        couponRejectReason = 'คูปองนี้ไม่จับคู่กับแพ็กเกจที่เลือก';
                    } else if (pkgPeriod !== couponCondition) {
                        couponRejectReason = couponCondition === 'annual'
                            ? 'คูปองนี้ใช้ได้เฉพาะแพ็กเกจรายปี กรุณาเลือกแพ็กเกจรายปีหรือลบรหัสคูปอง'
                            : couponCondition === '3months'
                                ? 'คูปองนี้ใช้ได้เฉพาะแพ็กเกจ 3 เดือน กรุณาเลือกแพ็กเกจ 3 เดือนหรือลบรหัสคูปอง'
                                : 'คูปองนี้ใช้กับแพ็กเกจที่เลือกไม่ได้';
                    } else {
                        const already = await pool.query(
                            'SELECT id FROM coupon_redemptions WHERE coupon_id = $1 AND user_id = $2',
                            [coupon.id, userId]
                        );
                        if (already.rows.length > 0) {
                            couponRejectReason = 'คุณใช้คูปองนี้ไปแล้ว';
                        } else {
                            const pct = Math.min(100, Math.max(0, parseInt(coupon.discount_percent, 10) || 0));
                            const extraDays = Math.floor((durationDays * pct) / 100);
                            durationDays += extraDays;
                            couponApplied = { coupon_id: coupon.id, extra_days: extraDays, discount_percent: pct };
                        }
                    }
                }
            }
        }

        if (couponRejectReason) {
            return res.status(400).json({ success: false, message: couponRejectReason, code: 'COUPON_NOT_APPLICABLE' });
        }

        const amount = requiresPayment
            ? (parseFloat(pkg.price) != null && !isNaN(parseFloat(pkg.price)) ? parseFloat(pkg.price) : 0)
            : 0;

        if (requiresPayment && channel && channel.channel_type === 'qr_self') {
            const ins = await pool.query(
                `INSERT INTO pending_payments (user_id, package_id, payment_channel_id, amount, status) VALUES ($1, $2, $3, $4, 'pending') RETURNING id`,
                [userId, pkgId, channelId, amount]
            );
            const pendingId = ins.rows[0].id;
            const baseUrl = process.env.FRONTEND_URL || process.env.APP_URL || '';
            const redirectPath = '/pay-by-qr?id=' + pendingId;
            res.json({
                success: true,
                message: 'สร้างรายการชำระแล้ว กรุณาโอนเงินและแนบสลิป',
                data: {
                    redirect: redirectPath,
                    pending_id: pendingId,
                    amount,
                    package_name: pkg.name,
                }
            });
            return;
        }

        const startDate = new Date();
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + durationDays);

        const existing = await pool.query(
            `SELECT id FROM memberships WHERE user_id = $1 AND status = 'active' LIMIT 1`,
            [userId]
        );

        let membershipId = null;
        const paymentType = existing.rows.length > 0 ? 'renew' : 'purchase';

        if (existing.rows.length > 0) {
            membershipId = existing.rows[0].id;
            await pool.query(
                `UPDATE memberships 
                 SET membership_type = $1, start_date = $2, end_date = $3, package_id = $4, updated_at = CURRENT_TIMESTAMP 
                 WHERE id = $5`,
                [pkg.name, startDate, endDate, pkgId, membershipId]
            );
        } else {
            const insertResult = await pool.query(
                `INSERT INTO memberships (user_id, membership_type, start_date, end_date, status, package_id) 
                 VALUES ($1, $2, $3, $4, 'active', $5) RETURNING id`,
                [userId, pkg.name, startDate, endDate, pkgId]
            );
            if (insertResult.rows.length > 0) membershipId = insertResult.rows[0].id;
        }

        await pool.query(
            `INSERT INTO payment_history (user_id, package_id, amount, paid_at, membership_id, payment_type) 
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [userId, pkgId, amount, startDate, membershipId, paymentType]
        );

        if (couponApplied) {
            await pool.query(
                'INSERT INTO coupon_redemptions (coupon_id, user_id, package_id) VALUES ($1, $2, $3)',
                [couponApplied.coupon_id, userId, pkgId]
            );
            await pool.query(
                'UPDATE coupons SET use_count = COALESCE(use_count, 0) + 1, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
                [couponApplied.coupon_id]
            );
        }

        addCmsNotification(pool, {
            notification_type: 'payment_done',
            title: 'ลูกค้าชำระเงิน',
            message: `ลูกค้าเลือกแพ็กเกจ ${pkg.name} (User ID: ${userId})`,
            link_url: `/cms/users/${userId}`,
            related_user_id: userId
        }).catch(() => {});

        res.json({
            success: true,
            message: existing.rows.length > 0 ? 'เปลี่ยนแพ็กเกจสำเร็จ' : 'เลือกแพ็กเกจสำเร็จ',
            data: {
                package_name: pkg.name,
                start_date: startDate,
                end_date: endDate,
                coupon_applied: couponApplied ? { extra_days: couponApplied.extra_days, discount_percent: couponApplied.discount_percent } : null
            }
        });
    } catch (err) {
        console.error('Choose package error:', err);
        res.status(500).json({ success: false, message: 'ดำเนินการไม่สำเร็จ: ' + (err.message || 'เกิดข้อผิดพลาด') });
    }
}

/**
 * ตรวจสอบคูปองกับแพ็กเกจ (สำหรับหน้าสรุปการชำระ — ก่อนกดถัดไป)
 * POST body: { package_id, coupon_code }
 */
async function validateCoupon(req, res) {
    try {
        const userId = parseInt(req.user?.id, 10);
        if (isNaN(userId)) return res.status(401).json({ success: false, message: 'กรุณาเข้าสู่ระบบ' });
        const { package_id, coupon_code } = req.body || {};
        const pkgId = parseInt(String(package_id), 10);
        if (!package_id || isNaN(pkgId)) return res.status(400).json({ success: false, message: 'กรุณาเลือกแพ็กเกจ' });
        const pkgResult = await pool.query(
            'SELECT id, name, duration_days, period_type FROM packages WHERE id = $1 AND COALESCE(is_active, true) = true',
            [pkgId]
        );
        if (pkgResult.rows.length === 0) return res.status(404).json({ success: false, message: 'ไม่พบแพ็กเกจ' });
        const pkg = pkgResult.rows[0];
        const durationDays = parseInt(pkg.duration_days, 10) || 0;
        if (!coupon_code || !String(coupon_code).trim()) {
            return res.json({ success: true, data: { valid: false, extra_days: 0, discount_percent: 0, message: null } });
        }
        const code = String(coupon_code).trim().toUpperCase();
        const couponResult = await pool.query(
            `SELECT id, coupon_type, condition_type, discount_percent, use_count, max_uses, is_active, valid_from, valid_until
             FROM coupons WHERE UPPER(TRIM(code)) = $1`,
            [code]
        );
        if (couponResult.rows.length === 0) {
            return res.json({ success: true, data: { valid: false, extra_days: 0, discount_percent: 0, message: 'รหัสคูปองไม่ถูกต้องหรือหมดอายุ' } });
        }
        const coupon = couponResult.rows[0];
        const now = new Date();
        if (coupon.coupon_type !== 'discount' || !coupon.is_active ||
            (coupon.valid_from && new Date(coupon.valid_from) > now) ||
            (coupon.valid_until && new Date(coupon.valid_until) < now) ||
            (coupon.max_uses != null && (coupon.use_count || 0) >= coupon.max_uses)) {
            return res.json({ success: true, data: { valid: false, extra_days: 0, discount_percent: 0, message: 'รหัสคูปองไม่สามารถใช้ได้ในขณะนี้' } });
        }
        const pkgPeriod = (pkg.period_type || '').toLowerCase();
        const couponCondition = (coupon.condition_type || '').toLowerCase();
        const appliesToPackage = await couponAppliesToPackage(pkgId, coupon.id);
        if (!appliesToPackage) {
            return res.json({ success: true, data: { valid: false, extra_days: 0, discount_percent: 0, message: 'คูปองนี้ไม่จับคู่กับแพ็กเกจที่เลือก' } });
        }
        if (!pkgPeriod || !couponCondition || pkgPeriod !== couponCondition) {
            const msg = couponCondition === 'annual' ? 'คูปองนี้ใช้ได้เฉพาะแพ็กเกจรายปี' : couponCondition === '3months' ? 'คูปองนี้ใช้ได้เฉพาะแพ็กเกจ 3 เดือน' : 'คูปองนี้ใช้กับแพ็กเกจที่เลือกไม่ได้';
            return res.json({ success: true, data: { valid: false, extra_days: 0, discount_percent: 0, message: msg } });
        }
        const already = await pool.query('SELECT id FROM coupon_redemptions WHERE coupon_id = $1 AND user_id = $2', [coupon.id, userId]);
        if (already.rows.length > 0) {
            return res.json({ success: true, data: { valid: false, extra_days: 0, discount_percent: 0, message: 'คุณใช้คูปองนี้ไปแล้ว' } });
        }
        const pct = Math.min(100, Math.max(0, parseInt(coupon.discount_percent, 10) || 0));
        const extraDays = Math.floor((durationDays * pct) / 100);
        return res.json({
            success: true,
            data: { valid: true, extra_days: extraDays, discount_percent: pct, coupon_id: coupon.id, message: null }
        });
    } catch (err) {
        console.error('validateCoupon error:', err);
        res.status(500).json({ success: false, message: 'ตรวจสอบคูปองไม่สำเร็จ' });
    }
}

/**
 * สร้างรายการรอชำระ (QR) หลังหน้าสรุปการชำระ กดถัดไป → ไปหน้า pay-by-qr
 * POST body: { package_id, coupon_code? }
 */
async function createPendingPayment(req, res) {
    try {
        const userId = parseInt(req.user?.id, 10);
        if (isNaN(userId)) return res.status(401).json({ success: false, message: 'กรุณาเข้าสู่ระบบ' });
        const { package_id, coupon_code } = req.body || {};
        const pkgId = parseInt(String(package_id), 10);
        if (!package_id || isNaN(pkgId)) return res.status(400).json({ success: false, message: 'กรุณาเลือกแพ็กเกจ' });
        const pkgResult = await pool.query(
            'SELECT id, name, duration_days, period_type, COALESCE(price, 0) AS price FROM packages WHERE id = $1 AND COALESCE(is_active, true) = true',
            [pkgId]
        );
        if (pkgResult.rows.length === 0) return res.status(404).json({ success: false, message: 'ไม่พบแพ็กเกจ' });
        const pkg = pkgResult.rows[0];
        const amount = parseFloat(pkg.price) != null && !isNaN(parseFloat(pkg.price)) ? parseFloat(pkg.price) : 0;
        let couponId = null;
        let extraDays = null;
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
                const durationDays = parseInt(pkg.duration_days, 10) || 0;
                const pkgPeriod = (pkg.period_type || '').toLowerCase();
                const couponCondition = (coupon.condition_type || '').toLowerCase();
                const appliesToPackage = await couponAppliesToPackage(pkgId, coupon.id);
                if (coupon.coupon_type === 'discount' && coupon.is_active &&
                    (!coupon.valid_from || new Date(coupon.valid_from) <= now) &&
                    (!coupon.valid_until || new Date(coupon.valid_until) >= now) &&
                    (coupon.max_uses == null || (coupon.use_count || 0) < coupon.max_uses) &&
                    appliesToPackage && pkgPeriod && couponCondition && pkgPeriod === couponCondition) {
                    const already = await pool.query('SELECT id FROM coupon_redemptions WHERE coupon_id = $1 AND user_id = $2', [coupon.id, userId]);
                    if (already.rows.length === 0) {
                        const pct = Math.min(100, Math.max(0, parseInt(coupon.discount_percent, 10) || 0));
                        extraDays = Math.floor((durationDays * pct) / 100);
                        couponId = coupon.id;
                    }
                }
            }
        }
        const qrChannel = await pool.query(
            "SELECT id FROM payment_channels WHERE user_id = $1 AND channel_type = 'qr_self' ORDER BY id ASC LIMIT 1",
            [userId]
        );
        if (qrChannel.rows.length === 0) {
            return res.status(400).json({ success: false, message: 'กรุณาลงทะเบียนช่องทางการชำระเงิน (QR) ก่อน ที่หน้าโปรไฟล์' });
        }
        const channelId = qrChannel.rows[0].id;
        const originalAmount = amount;
        const discountAmount = 0;
        const ins = await pool.query(
            `INSERT INTO pending_payments (user_id, package_id, payment_channel_id, amount, original_amount, discount_amount, coupon_id, extra_days, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending') RETURNING id`,
            [userId, pkgId, channelId, amount, originalAmount, discountAmount, couponId, extraDays]
        );
        const pendingId = ins.rows[0].id;
        res.json({
            success: true,
            message: 'สร้างรายการชำระแล้ว กรุณาโอนเงินและแนบสลิป',
            data: { pending_id: pendingId, redirect: '/pay-by-qr?id=' + pendingId }
        });
    } catch (err) {
        console.error('createPendingPayment error:', err);
        res.status(500).json({ success: false, message: 'สร้างรายการชำระไม่สำเร็จ' });
    }
}

module.exports = {
    getActivePackages,
    choosePackage,
    validateCoupon,
    createPendingPayment
};
