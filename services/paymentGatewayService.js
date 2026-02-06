/**
 * Payment Gateway Service — เตรียมโครงสำหรับเชื่อมต่อ Gateway จริง
 *
 * ขั้นตอนเมื่อจะเชื่อมต่อจริง (เช่น Omise / 2C2P / Stripe):
 * 1. ตั้งค่า .env ตาม config/paymentGateway.js
 * 2. ในไฟล์นี้แทนที่ stub ด้วยการเรียก API จริงของ provider ที่เลือก
 * 3. ฝั่ง frontend ใช้ Public Key + SDK ของ provider เพื่อสร้าง token จากบัตร (ไม่ส่งเลขบัตรมา backend)
 * 4. Backend รับ token แล้วเรียก charge / create charge ผ่านฟังก์ชันด้านล่าง
 *
 * Flow มาตรฐาน (PCI):
 * - Frontend: ผู้ใช้กรอกบัตร -> SDK สร้าง token -> ส่งเฉพาะ token มา backend
 * - Backend: รับ token + จำนวนเงิน -> เรียก Gateway charge -> อัปเดตสมาชิก + payment_history
 */

const paymentGatewayConfig = require('../config/paymentGateway');

const NOT_CONFIGURED = { success: false, code: 'GATEWAY_NOT_CONFIGURED', message: 'ยังไม่ได้ตั้งค่า Payment Gateway' };

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
 * ลงทะเบียนบัตร (สร้าง token จากฝั่ง frontend แล้วบันทึกเป็นช่องทางชำระเงิน)
 * @param {number} userId - user id
 * @param {string} token - token จาก Gateway SDK (ฝั่ง frontend สร้างจากบัตร)
 * @param {object} metadata - { full_name, card_last_four, card_brand } (จาก response หลัง tokenize)
 * @returns {Promise<{ success: boolean, card_id?: string, message?: string }>}
 */
async function registerCard(userId, token, metadata = {}) {
  if (!paymentGatewayConfig.isConfigured()) {
    return { ...NOT_CONFIGURED, message: 'ช่องทางบัตรยังไม่เปิดใช้ (รอเชื่อมต่อ Payment Gateway)' };
  }
  // TODO: เมื่อเชื่อมต่อ Gateway จริง ให้เรียก API ของ provider เช่น
  // - Omise: customers.create, card.attach
  // - Stripe: customers.create, paymentMethods.attach
  // จากนั้นบันทึก customer_id / card_id ลง payment_channels (อาจเพิ่มคอลัมน์ gateway_customer_id, gateway_card_id)
  return { success: false, code: 'NOT_IMPLEMENTED', message: 'รอพัฒนาการเชื่อมต่อ Payment Gateway' };
}

/**
 * ตัดเงินด้วยบัตรที่ลงทะเบียนไว้ (เรียกเมื่อลูกค้าเลือกชำระด้วยบัตรตอนเลือกแพ็กเกจ)
 * @param {number} userId
 * @param {number} paymentChannelId - id จาก payment_channels (ที่เก็บ gateway_card_id ไว้)
 * @param {number} amountSatang - จำนวนเงิน (สตางค์) หรือ amountBaht (บาท แล้วแต่ provider)
 * @param {string} description - คำอธิบายรายการ
 * @returns {Promise<{ success: boolean, transaction_id?: string, message?: string }>}
 */
async function chargeSavedCard(userId, paymentChannelId, amountSatang, description = '') {
  if (!paymentGatewayConfig.isConfigured()) {
    return { ...NOT_CONFIGURED, message: 'ช่องทางบัตรยังไม่เปิดใช้' };
  }
  // TODO: ดึง gateway_card_id จาก payment_channels แล้วเรียก API charge ของ provider
  return { success: false, code: 'NOT_IMPLEMENTED', message: 'รอพัฒนาการเชื่อมต่อ Payment Gateway' };
}

/**
 * ตัดเงินด้วย one-time token (กรณีไม่เก็บบัตร ใช้ token ครั้งเดียว)
 * @param {string} token - token จาก frontend
 * @param {number} amountSatang - จำนวนเงิน (สตางค์)
 * @param {string} description
 * @returns {Promise<{ success: boolean, transaction_id?: string, message?: string }>}
 */
async function chargeWithToken(token, amountSatang, description = '') {
  if (!paymentGatewayConfig.isConfigured()) {
    return { ...NOT_CONFIGURED };
  }
  return { success: false, code: 'NOT_IMPLEMENTED', message: 'รอพัฒนาการเชื่อมต่อ Payment Gateway' };
}

module.exports = {
  getStatus,
  registerCard,
  chargeSavedCard,
  chargeWithToken,
};
