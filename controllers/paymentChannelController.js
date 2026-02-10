const pool = require('../config/database');
const paymentGatewayService = require('../services/paymentGatewayService');
const { decryptIfEncrypted } = require('../utils/encryption');

const CHANNEL_TYPES = ['qr_self', 'credit_card', 'debit_card'];

/** ถอดรหัส PII ของช่องทางการชำระเงินก่อนส่งให้ frontend (รองรับกรณีเก็บแบบเข้ารหัสในอนาคต) */
function mapChannelForResponse(row) {
    if (!row) return row;
    return {
        ...row,
        full_name: row.full_name != null ? (decryptIfEncrypted(row.full_name) ?? row.full_name) : null,
        promptpay_phone: row.promptpay_phone != null ? (decryptIfEncrypted(row.promptpay_phone) ?? row.promptpay_phone) : null,
        promptpay_id: row.promptpay_id != null ? (decryptIfEncrypted(row.promptpay_id) ?? row.promptpay_id) : null,
        bank_account_masked: row.bank_account_masked != null ? (decryptIfEncrypted(row.bank_account_masked) ?? row.bank_account_masked) : null
    };
}

function sanitizeChannel(body) {
    const channel_type = (body.channel_type || 'qr_self').toLowerCase();
    const type = CHANNEL_TYPES.includes(channel_type) ? channel_type : 'qr_self';
    const full_name = body.full_name != null ? String(body.full_name).trim() : null;
    let card_last_four = null, card_brand = null, bank_name = null, bank_account_masked = null, promptpay_phone = null, promptpay_id = null;
    if (type === 'credit_card' || type === 'debit_card') {
        card_last_four = body.card_last_four != null ? String(body.card_last_four).replace(/\D/g, '').slice(-4) : null;
        card_brand = body.card_brand != null ? String(body.card_brand).trim().slice(0, 50) : null;
    }
    const display_label = body.display_label != null ? String(body.display_label).trim().slice(0, 255) : null;
    return { type, full_name, card_last_four, card_brand, bank_name, bank_account_masked, promptpay_phone, promptpay_id, display_label };
}

/**
 * รายการช่องทางการชำระเงินของตัวเอง (ลูกค้า)
 */
async function getMyChannels(req, res) {
    try {
        const userId = parseInt(req.user?.id, 10);
        if (isNaN(userId)) return res.status(401).json({ success: false, message: 'กรุณาเข้าสู่ระบบ' });
        const result = await pool.query(
            'SELECT id, channel_type, full_name, card_last_four, card_brand, bank_name, bank_account_masked, promptpay_phone, promptpay_id, display_label, is_default, created_at, updated_at FROM payment_channels WHERE user_id = $1 ORDER BY is_default DESC, created_at DESC',
            [userId]
        );
        const data = (result.rows || []).map(mapChannelForResponse);
        res.json({ success: true, data });
    } catch (err) {
        console.error('getMyChannels error:', err);
        res.status(500).json({ success: false, message: 'โหลดรายการไม่สำเร็จ' });
    }
}

/**
 * เพิ่มช่องทางการชำระเงิน (ลูกค้า) — ลงได้คนละ 1 รายการเท่านั้น
 */
async function createChannel(req, res) {
    try {
        const userId = parseInt(req.user?.id, 10);
        if (isNaN(userId)) return res.status(401).json({ success: false, message: 'กรุณาเข้าสู่ระบบ' });
        const existing = await pool.query('SELECT id FROM payment_channels WHERE user_id = $1 LIMIT 1', [userId]);
        if (existing.rows.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'ลงทะเบียนได้คนละ 1 ช่องทางเท่านั้น กรุณาใช้ปุ่มเปลี่ยนช่องทางหรือลบแล้วเพิ่มใหม่'
            });
        }
        const body = req.body || {};
        const { type, full_name, card_last_four, card_brand, bank_name, bank_account_masked, promptpay_phone, promptpay_id, display_label } = sanitizeChannel(body);
        const is_default = body.is_default === true || body.is_default === 'true';

        let stripe_customer_id = null;
        let stripe_payment_method_id = null;
        let final_card_last_four = card_last_four;
        let final_card_brand = card_brand;
        let final_full_name = full_name;

        if (type === 'credit_card' || type === 'debit_card') {
            const paymentMethodId = body.payment_method_id && String(body.payment_method_id).trim();
            if (!paymentMethodId) {
                return res.status(400).json({ success: false, message: 'กรุณากรอกข้อมูลบัตร (payment_method_id จำเป็นเมื่อเลือกบัตร)' });
            }
            const userRow = await pool.query('SELECT email FROM users WHERE id = $1', [userId]);
            const email = userRow.rows[0] && userRow.rows[0].email ? userRow.rows[0].email : undefined;
            const reg = await paymentGatewayService.registerCard(userId, paymentMethodId, { full_name: full_name || undefined, email });
            if (!reg.success) {
                return res.status(400).json({ success: false, message: reg.message || 'ลงทะเบียนบัตรไม่สำเร็จ' });
            }
            stripe_customer_id = reg.stripe_customer_id;
            stripe_payment_method_id = reg.stripe_payment_method_id;
            final_card_last_four = reg.card_last_four || final_card_last_four;
            final_card_brand = reg.card_brand || final_card_brand;
            final_full_name = final_full_name || undefined;
        }

        const insert = await pool.query(
            `INSERT INTO payment_channels (user_id, channel_type, full_name, card_last_four, card_brand, bank_name, bank_account_masked, promptpay_phone, promptpay_id, display_label, is_default, stripe_customer_id, stripe_payment_method_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING id, channel_type, full_name, card_last_four, card_brand, bank_name, bank_account_masked, promptpay_phone, promptpay_id, display_label, is_default, created_at, updated_at`,
            [userId, type, final_full_name, final_card_last_four || null, final_card_brand || null, bank_name || null, bank_account_masked || null, promptpay_phone || null, promptpay_id || null, display_label || null, is_default, stripe_customer_id, stripe_payment_method_id]
        );
        if (is_default) {
            await pool.query('UPDATE payment_channels SET is_default = false WHERE user_id = $1 AND id != $2', [userId, insert.rows[0].id]);
        }
        res.status(201).json({ success: true, message: 'เพิ่มช่องทางชำระเงินแล้ว', data: mapChannelForResponse(insert.rows[0]) });
    } catch (err) {
        console.error('createChannel error:', err);
        const isMissingColumn = err.code === '42703' || (err.message && /stripe_customer_id|stripe_payment_method_id/.test(err.message));
        const message = isMissingColumn
            ? 'ฐานข้อมูลยังไม่มีคอลัมน์ Stripe กรุณารัน migration: psql -U user -d dbname -f database/add-stripe-payment-channels.sql'
            : (err.message || 'บันทึกไม่สำเร็จ');
        res.status(500).json({ success: false, message });
    }
}

/**
 * แก้ไขช่องทางการชำระเงิน (ลูกค้า)
 */
async function updateChannel(req, res) {
    try {
        const userId = parseInt(req.user?.id, 10);
        const id = parseInt(req.params.id, 10);
        if (isNaN(userId)) return res.status(401).json({ success: false, message: 'กรุณาเข้าสู่ระบบ' });
        if (isNaN(id)) return res.status(400).json({ success: false, message: 'ID ไม่ถูกต้อง' });
        const owner = await pool.query('SELECT id FROM payment_channels WHERE id = $1 AND user_id = $2', [id, userId]);
        if (owner.rows.length === 0) return res.status(404).json({ success: false, message: 'ไม่พบช่องทางนี้' });
        const body = req.body || {};
        const { type, full_name, card_last_four, card_brand, bank_name, bank_account_masked, promptpay_phone, promptpay_id, display_label } = sanitizeChannel(body);
        const is_default = body.is_default === true || body.is_default === 'true';
        await pool.query(
            `UPDATE payment_channels SET channel_type = $1, full_name = $2, card_last_four = $3, card_brand = $4, bank_name = $5, bank_account_masked = $6, promptpay_phone = $7, promptpay_id = $8, display_label = $9, is_default = $10, updated_at = CURRENT_TIMESTAMP WHERE id = $11 AND user_id = $12`,
            [type, full_name, card_last_four || null, card_brand || null, bank_name || null, bank_account_masked || null, promptpay_phone || null, promptpay_id || null, display_label || null, is_default, id, userId]
        );
        if (is_default) {
            await pool.query('UPDATE payment_channels SET is_default = false WHERE user_id = $1 AND id != $2', [userId, id]);
        }
        const row = await pool.query('SELECT id, channel_type, full_name, card_last_four, card_brand, bank_name, bank_account_masked, promptpay_phone, promptpay_id, display_label, is_default, created_at, updated_at FROM payment_channels WHERE id = $1', [id]);
        res.json({ success: true, message: 'แก้ไขแล้ว', data: mapChannelForResponse(row.rows[0]) });
    } catch (err) {
        console.error('updateChannel error:', err);
        res.status(500).json({ success: false, message: 'บันทึกไม่สำเร็จ' });
    }
}

/**
 * ลบช่องทางการชำระเงิน (ลูกค้า)
 */
async function deleteChannel(req, res) {
    try {
        const userId = parseInt(req.user?.id, 10);
        const id = parseInt(req.params.id, 10);
        if (isNaN(userId)) return res.status(401).json({ success: false, message: 'กรุณาเข้าสู่ระบบ' });
        if (isNaN(id)) return res.status(400).json({ success: false, message: 'ID ไม่ถูกต้อง' });
        const result = await pool.query('DELETE FROM payment_channels WHERE id = $1 AND user_id = $2 RETURNING id', [id, userId]);
        if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'ไม่พบช่องทางนี้' });
        res.json({ success: true, message: 'ลบแล้ว' });
    } catch (err) {
        console.error('deleteChannel error:', err);
        res.status(500).json({ success: false, message: 'ลบไม่สำเร็จ' });
    }
}

module.exports = {
    getMyChannels,
    createChannel,
    updateChannel,
    deleteChannel,
};
