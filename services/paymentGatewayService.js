/**
 * Payment Gateway Service — Stripe
 * ลงทะเบียนบัตร (PaymentMethod) และตัดเงินด้วย PaymentIntent
 */

const Stripe = require('stripe');
const paymentGatewayConfig = require('../config/paymentGateway');

const NOT_CONFIGURED = { success: false, code: 'GATEWAY_NOT_CONFIGURED', message: 'ยังไม่ได้ตั้งค่า Payment Gateway' };

function getStripe() {
  const secret = paymentGatewayConfig.getSecretKey();
  if (!secret) return null;
  return new Stripe(secret);
}

/**
 * สถานะ Gateway (สำหรับ API ส่งไป frontend)
 */
function getStatus() {
  const configured = paymentGatewayConfig.isConfigured();
  return {
    configured,
    provider: configured ? paymentGatewayConfig.getProvider() : null,
    publicKey: configured ? paymentGatewayConfig.getPublicKey() : null,
  };
}

/**
 * ลงทะเบียนบัตร — สร้าง Customer, attach PaymentMethod แล้วคืนข้อมูลสำหรับบันทึกลง payment_channels
 * @param {number} userId - user id
 * @param {string} paymentMethodId - Stripe PaymentMethod id (pm_xxx จาก frontend)
 * @param {object} metadata - { full_name, email } (optional)
 * @returns {Promise<{ success: boolean, stripe_customer_id?: string, stripe_payment_method_id?: string, card_last_four?: string, card_brand?: string, message?: string }>}
 */
async function registerCard(userId, paymentMethodId, metadata = {}) {
  if (!paymentGatewayConfig.isConfigured()) {
    return { ...NOT_CONFIGURED, message: 'ช่องทางบัตรยังไม่เปิดใช้' };
  }
  const stripe = getStripe();
  if (!stripe) return { ...NOT_CONFIGURED };

  try {
    const pm = await stripe.paymentMethods.retrieve(paymentMethodId);
    if (pm.type !== 'card') {
      return { success: false, message: 'รองรับเฉพาะบัตรเครดิต/เดบิต' };
    }
    const card = pm.card;
    const last4 = card && card.last4 ? card.last4 : null;
    const brand = card && card.brand ? card.brand : null;

    const customer = await stripe.customers.create({
      email: metadata.email || `user${userId}@stripe-placeholder.local`,
      name: metadata.full_name || null,
      metadata: { user_id: String(userId) },
    });

    await stripe.paymentMethods.attach(paymentMethodId, {
      customer: customer.id,
    });

    return {
      success: true,
      stripe_customer_id: customer.id,
      stripe_payment_method_id: paymentMethodId,
      card_last_four: last4,
      card_brand: brand,
    };
  } catch (err) {
    console.error('Stripe registerCard error:', err);
    const msg = err.message || (err.type ? err.type : 'ลงทะเบียนบัตรไม่สำเร็จ');
    return { success: false, message: msg };
  }
}

/**
 * ตัดเงินด้วยบัตรที่ลงทะเบียนไว้
 * เมื่อบัตรต้อง 3D Secure (requires_action) จะคืน client_secret ให้ frontend ใช้ stripe.confirmCardPayment() แล้วเรียก confirmPaymentAfter3ds
 * @param {number} userId
 * @param {number} paymentChannelId - id จาก payment_channels
 * @param {number} amountSatang - จำนวนเงิน (สตางค์) สำหรับ THB
 * @param {string} description
 * @param {object} intentMetadata - สำหรับยืนยันหลัง 3DS: { package_id, duration_days, coupon_id?, extra_days? }
 * @returns {Promise<{ success: boolean, transaction_id?: string, requires_action?: boolean, client_secret?: string, payment_intent_id?: string, message?: string }>}
 */
async function chargeSavedCard(userId, paymentChannelId, amountSatang, description = '', intentMetadata = {}) {
  if (!paymentGatewayConfig.isConfigured()) {
    return { ...NOT_CONFIGURED, message: 'ช่องทางบัตรยังไม่เปิดใช้' };
  }
  const stripe = getStripe();
  if (!stripe) return { ...NOT_CONFIGURED };

  const pool = require('../config/database');
  const ch = await pool.query(
    'SELECT stripe_customer_id, stripe_payment_method_id FROM payment_channels WHERE id = $1 AND user_id = $2',
    [paymentChannelId, userId]
  );
  if (ch.rows.length === 0) {
    return { success: false, message: 'ไม่พบช่องทางการชำระเงิน' };
  }
  const { stripe_customer_id, stripe_payment_method_id } = ch.rows[0];
  if (!stripe_payment_method_id) {
    return { success: false, message: 'ช่องทางนี้ไม่ใช่บัตรที่ลงทะเบียนกับ Stripe' };
  }

  if (amountSatang < 1) {
    return { success: false, message: 'จำนวนเงินไม่ถูกต้อง' };
  }

  const meta = {
    user_id: String(userId),
    payment_channel_id: String(paymentChannelId),
    ...(intentMetadata.package_id != null && { package_id: String(intentMetadata.package_id) }),
    ...(intentMetadata.duration_days != null && { duration_days: String(intentMetadata.duration_days) }),
    ...(intentMetadata.original_amount != null && { original_amount: String(intentMetadata.original_amount) }),
    ...(intentMetadata.discount_amount != null && { discount_amount: String(intentMetadata.discount_amount) }),
    ...(intentMetadata.coupon_id != null && { coupon_id: String(intentMetadata.coupon_id) }),
    ...(intentMetadata.extra_days != null && { extra_days: String(intentMetadata.extra_days) }),
  };

  try {
    const pi = await stripe.paymentIntents.create({
      amount: Math.round(amountSatang),
      currency: 'thb',
      payment_method: stripe_payment_method_id,
      customer: stripe_customer_id || undefined,
      confirm: true,
      off_session: true,
      description: description || 'ชำระแพ็กเกจ',
      metadata: meta,
    });

    if (pi.status === 'succeeded') {
      return { success: true, transaction_id: pi.id };
    }
    if (pi.status === 'requires_action') {
      return {
        success: false,
        requires_action: true,
        client_secret: pi.client_secret,
        payment_intent_id: pi.id,
        message: 'บัตรต้องยืนยันตัวตน (3D Secure) กรุณาทำตามขั้นตอนในหน้าจอหรือแอปธนาคาร',
      };
    }
    return { success: false, message: pi.status || 'การชำระไม่สำเร็จ' };
  } catch (err) {
    console.error('Stripe chargeSavedCard error:', err);
    const msg = err.message || (err.type ? err.type : 'ตัดเงินไม่สำเร็จ');
    return { success: false, message: msg };
  }
}

/**
 * ตัดเงินด้วย one-time PaymentMethod (ไม่เก็บบัตร)
 */
async function chargeWithToken(paymentMethodId, amountSatang, description = '') {
  if (!paymentGatewayConfig.isConfigured()) {
    return { ...NOT_CONFIGURED };
  }
  const stripe = getStripe();
  if (!stripe) return { ...NOT_CONFIGURED };

  try {
    const pi = await stripe.paymentIntents.create({
      amount: Math.round(amountSatang),
      currency: 'thb',
      payment_method: paymentMethodId,
      confirm: true,
      description: description || 'ชำระแพ็กเกจ',
    });
    if (pi.status === 'succeeded') {
      return { success: true, transaction_id: pi.id };
    }
    return { success: false, message: pi.status || 'การชำระไม่สำเร็จ' };
  } catch (err) {
    console.error('Stripe chargeWithToken error:', err);
    return { success: false, message: err.message || 'ตัดเงินไม่สำเร็จ' };
  }
}

/**
 * ดึง PaymentIntent จาก Stripe (สำหรับยืนยันหลัง 3DS)
 * @param {string} paymentIntentId - pi_xxx
 * @returns {Promise<{ success: boolean, payment_intent?: object, message?: string }>}
 */
async function retrievePaymentIntent(paymentIntentId) {
  if (!paymentGatewayConfig.isConfigured()) {
    return { ...NOT_CONFIGURED };
  }
  const stripe = getStripe();
  if (!stripe) return { ...NOT_CONFIGURED };
  if (!paymentIntentId || typeof paymentIntentId !== 'string') {
    return { success: false, message: 'ไม่พบ payment_intent_id' };
  }
  try {
    const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
    return { success: true, payment_intent: pi };
  } catch (err) {
    console.error('Stripe retrievePaymentIntent error:', err);
    return { success: false, message: err.message || 'ดึงข้อมูลการชำระไม่สำเร็จ' };
  }
}

module.exports = {
  getStatus,
  registerCard,
  chargeSavedCard,
  chargeWithToken,
  retrievePaymentIntent,
};
