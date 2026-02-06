const pool = require('../config/database');
const { addCmsNotification } = require('../utils/cmsNotification');

/** ตรวจว่าคูปองนี้จับคู่กับแพ็กเกจนี้หรือไม่ (package_coupons หรือ package.coupon_id) */
async function couponAppliesToPackage(packageId, couponId) {
    const pc = await pool.query('SELECT 1 FROM package_coupons WHERE package_id = $1 AND coupon_id = $2 LIMIT 1', [packageId, couponId]);
    if (pc.rows.length > 0) return true;
    const pkg = await pool.query('SELECT coupon_id FROM packages WHERE id = $1 LIMIT 1', [packageId]);
    return pkg.rows.length > 0 && pkg.rows[0].coupon_id != null && parseInt(pkg.rows[0].coupon_id, 10) === parseInt(couponId, 10);
}

/**
 * รายการคูปองของลูกค้า: ใช้แล้ว / รอใช้รอบถัดไป / คูปองที่เลือกเก็บได้ (ใช้รอบชำระอัตโนมัติถัดไป)
 */
async function getMyCoupons(req, res) {
    try {
        const userId = parseInt(req.user?.id, 10);
        if (isNaN(userId)) return res.status(401).json({ success: false, message: 'กรุณาเข้าสู่ระบบ' });

        const [redeemedRows, pendingRows, availableRows] = await Promise.all([
            pool.query(
                `SELECT cr.id, cr.coupon_id, cr.redeemed_at, cr.package_id, c.code, c.name, c.description, c.coupon_type, c.discount_percent, c.condition_type, p.name AS package_name
                 FROM coupon_redemptions cr
                 JOIN coupons c ON c.id = cr.coupon_id
                 LEFT JOIN packages p ON p.id = cr.package_id
                 WHERE cr.user_id = $1 ORDER BY cr.redeemed_at DESC`,
                [userId]
            ),
            pool.query(
                `SELECT ucnp.id, ucnp.coupon_id, ucnp.created_at, c.code, c.name, c.description, c.coupon_type, c.discount_percent, c.condition_type
                 FROM user_coupon_next_payment ucnp
                 JOIN coupons c ON c.id = ucnp.coupon_id
                 WHERE ucnp.user_id = $1`,
                [userId]
            ),
            pool.query(
                `SELECT id, code, name, description, coupon_type, discount_percent, condition_type, valid_until
                 FROM coupons
                 WHERE is_active = true AND coupon_type = 'discount' AND COALESCE(apply_at_next_payment, false) = true
                   AND (valid_from IS NULL OR valid_from <= CURRENT_TIMESTAMP)
                   AND (valid_until IS NULL OR valid_until >= CURRENT_TIMESTAMP)
                   AND (max_uses IS NULL OR use_count < max_uses)
                   AND id NOT IN (SELECT coupon_id FROM coupon_redemptions WHERE user_id = $1)
                   AND id NOT IN (SELECT coupon_id FROM user_coupon_next_payment WHERE user_id = $1)
                 ORDER BY name NULLS LAST, code`,
                [userId, userId]
            )
        ]);

        res.json({
            success: true,
            data: {
                redeemed: redeemedRows.rows || [],
                pending_next: pendingRows.rows || [],
                available_for_next: availableRows.rows || []
            }
        });
    } catch (err) {
        console.error('getMyCoupons error:', err);
        res.status(500).json({ success: false, message: 'โหลดรายการคูปองไม่สำเร็จ' });
    }
}

/**
 * เก็บคูปองไว้ใช้ในรอบชำระอัตโนมัติถัดไป (ลูกค้าที่ชำระแบบบัตรจะได้ส่วนลดก่อนตัดในรอบถัดไป)
 */
async function saveForNextPayment(req, res) {
    try {
        const userId = parseInt(req.user?.id, 10);
        if (isNaN(userId)) return res.status(401).json({ success: false, message: 'กรุณาเข้าสู่ระบบ' });
        const code = (req.body?.code || '').trim().toUpperCase();
        if (!code) return res.status(400).json({ success: false, message: 'กรุณากรอกรหัสคูปอง' });

        const couponResult = await pool.query(
            `SELECT id, code, name, coupon_type, discount_percent, condition_type, apply_at_next_payment, valid_from, valid_until, max_uses, use_count, is_active
             FROM coupons WHERE UPPER(TRIM(code)) = $1`,
            [code]
        );
        if (couponResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'ไม่พบรหัสคูปองนี้' });
        }
        const coupon = couponResult.rows[0];
        if (coupon.coupon_type !== 'discount' || !coupon.is_active) {
            return res.status(400).json({ success: false, message: 'คูปองนี้ไม่สามารถเก็บไว้ใช้รอบถัดไปได้' });
        }
        if (!coupon.apply_at_next_payment) {
            return res.status(400).json({
                success: false,
                message: 'คูปองนี้ใช้ได้เมื่อเลือกแพ็กเกจที่หน้าอัพเกรดเท่านั้น ไม่ใช่คูปองส่วนลดเดือนถัดไป'
            });
        }
        const now = new Date();
        if (coupon.valid_from && new Date(coupon.valid_from) > now) {
            return res.status(400).json({ success: false, message: 'คูปองยังไม่ถึงช่วงเวลาใช้งาน' });
        }
        if (coupon.valid_until && new Date(coupon.valid_until) < now) {
            return res.status(400).json({ success: false, message: 'คูปองหมดอายุแล้ว' });
        }
        if (coupon.max_uses != null && (coupon.use_count || 0) >= coupon.max_uses) {
            return res.status(400).json({ success: false, message: 'คูปองนี้ถูกใช้ครบแล้ว' });
        }
        const already = await pool.query('SELECT id FROM coupon_redemptions WHERE coupon_id = $1 AND user_id = $2', [coupon.id, userId]);
        if (already.rows.length > 0) {
            return res.status(400).json({ success: false, message: 'คุณใช้คูปองนี้ไปแล้ว' });
        }

        await pool.query(
            `INSERT INTO user_coupon_next_payment (user_id, coupon_id) VALUES ($1, $2)
             ON CONFLICT (user_id) DO UPDATE SET coupon_id = EXCLUDED.coupon_id, created_at = CURRENT_TIMESTAMP`,
            [userId, coupon.id]
        );

        res.json({
            success: true,
            message: 'เก็บคูปองไว้ใช้ในรอบชำระอัตโนมัติถัดไปแล้ว ระบบจะนำไปใช้เป็นส่วนลดก่อนตัดในเดือนถัดไป',
            data: { coupon_id: coupon.id, code: coupon.code, name: coupon.name }
        });
    } catch (err) {
        console.error('saveForNextPayment error:', err);
        res.status(500).json({ success: false, message: 'บันทึกไม่สำเร็จ' });
    }
}

/**
 * แลกคูปอง (ลูกค้ากรอกโค้ด)
 * - ตรวจสอบโค้ด วันที่ จำนวนครั้งที่ใช้
 * - ถ้า coupon_type = extend_days: ขยาย end_date ของ membership ที่ active
 * - บันทึก coupon_redemptions (หนึ่ง user ต่อหนึ่ง coupon ใช้ได้ครั้งเดียว)
 */
async function redeemCoupon(req, res) {
    try {
        const userId = req.user.id;
        const code = (req.body?.code || '').trim().toUpperCase();
        if (!code) {
            return res.status(400).json({
                success: false,
                message: 'กรุณากรอกรหัสคูปอง'
            });
        }

        const couponResult = await pool.query(
            `SELECT id, code, name, coupon_type, value, condition_type, valid_from, valid_until, max_uses, use_count, is_active
             FROM coupons
             WHERE UPPER(TRIM(code)) = $1`,
            [code]
        );
        if (couponResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'ไม่พบรหัสคูปองนี้'
            });
        }
        const coupon = couponResult.rows[0];
        if (coupon.coupon_type === 'discount') {
            const condLabel = coupon.condition_type === 'annual' ? 'ซื้อแบบรายปี' : coupon.condition_type === '3months' ? 'ซื้อแบบ 3 เดือน' : 'แพ็กเกจที่ตรงเงื่อนไข';
            return res.status(400).json({
                success: false,
                message: `คูปองส่วนลดนี้ใช้ได้เมื่อเลือกแพ็กเกจ${condLabel} ที่หน้าอัพเกรด กรุณาไปที่เมนู อัพเกรด แล้วกรอกรหัสคูปองเมื่อเลือกแพ็กเกจที่ตรงเงื่อนไข`
            });
        }
        if (!coupon.is_active) {
            return res.status(400).json({
                success: false,
                message: 'คูปองนี้ปิดใช้งานแล้ว'
            });
        }
        const now = new Date();
        if (coupon.valid_from && new Date(coupon.valid_from) > now) {
            return res.status(400).json({
                success: false,
                message: 'คูปองยังไม่ถึงช่วงเวลาใช้งาน'
            });
        }
        if (coupon.valid_until && new Date(coupon.valid_until) < now) {
            return res.status(400).json({
                success: false,
                message: 'คูปองหมดอายุแล้ว'
            });
        }
        if (coupon.max_uses != null && (coupon.use_count || 0) >= coupon.max_uses) {
            return res.status(400).json({
                success: false,
                message: 'คูปองนี้ถูกใช้ครบแล้ว'
            });
        }

        const alreadyRedeemed = await pool.query(
            'SELECT id FROM coupon_redemptions WHERE coupon_id = $1 AND user_id = $2',
            [coupon.id, userId]
        );
        if (alreadyRedeemed.rows.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'คุณใช้คูปองนี้ไปแล้ว'
            });
        }

        if (coupon.coupon_type === 'extend_days') {
            const days = parseInt(coupon.value, 10) || 0;
            if (days <= 0) {
                return res.status(400).json({
                    success: false,
                    message: 'คูปองไม่สามารถใช้ได้ (ค่าสิทธิ์ไม่ถูกต้อง)'
                });
            }
            const membershipResult = await pool.query(
                `SELECT id, end_date FROM memberships WHERE user_id = $1 AND status = 'active' ORDER BY end_date DESC LIMIT 1`,
                [userId]
            );
            if (membershipResult.rows.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'ไม่พบสมาชิกภาพที่ใช้งานอยู่ ไม่สามารถใช้คูปองเพิ่มวันได้'
                });
            }
            const membership = membershipResult.rows[0];
            let newEndDate = new Date(membership.end_date);
            newEndDate.setDate(newEndDate.getDate() + days);
            await pool.query(
                'UPDATE memberships SET end_date = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
                [newEndDate, membership.id]
            );
        }

        await pool.query(
            'INSERT INTO coupon_redemptions (coupon_id, user_id) VALUES ($1, $2)',
            [coupon.id, userId]
        );
        await pool.query(
            'UPDATE coupons SET use_count = COALESCE(use_count, 0) + 1, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
            [coupon.id]
        );

        addCmsNotification(pool, {
            notification_type: 'coupon_used',
            title: 'การใช้งานคูปองของลูกค้า',
            message: `ลูกค้าใช้คูปอง ${coupon.name || coupon.code} (User ID: ${userId})`,
            link_url: `/cms/users/${userId}`,
            related_user_id: userId
        }).catch(() => {});

        const message = coupon.coupon_type === 'extend_days'
            ? `ใช้คูปองสำเร็จ เพิ่ม ${coupon.value} วันให้สมาชิกภาพแล้ว`
            : 'ใช้คูปองสำเร็จ';

        res.json({
            success: true,
            message,
            data: {
                coupon_name: coupon.name || coupon.code,
                coupon_type: coupon.coupon_type,
                value: coupon.value
            }
        });
    } catch (err) {
        console.error('Redeem coupon error:', err);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการใช้คูปอง: ' + err.message
        });
    }
}

module.exports = {
    redeemCoupon,
    getMyCoupons,
    saveForNextPayment,
    couponAppliesToPackage
};
