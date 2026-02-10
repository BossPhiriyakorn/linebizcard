/**
 * LINE Pay Service — รอเชื่อมต่อ API จริง
 *
 * Flow:
 * 1. reserve: สร้างคำสั่งซื้อ เรียก LINE Pay Request API (Reserve) → ได้ redirectUrl
 * 2. ผู้ใช้ไปชำระที่ LINE Pay → LINE redirect กลับมาที่ Confirm URL
 * 3. confirm: เรียก LINE Pay Confirm API → ยืนยันการชำระ แล้วอัปเดตสมาชิก + payment_history
 *
 * เมื่อเชื่อมต่อจริง:
 * - ใช้ config/linePay.js (Channel ID, Secret, Confirm/Cancel URL)
 * - เรียก LINE Pay v3 Request API (POST) และ Confirm API ตามเอกสาร LINE Pay
 * - สร้าง HMAC signature ตามที่ LINE กำหนดใน header
 */

const linePayConfig = require('../config/linePay');

const NOT_CONFIGURED = { success: false, code: 'LINE_PAY_NOT_CONFIGURED', message: 'ยังไม่ได้ตั้งค่า LINE Pay' };
const NOT_IMPLEMENTED = { success: false, code: 'NOT_IMPLEMENTED', message: 'LINE Pay ยังรอเชื่อมต่อ API' };

/**
 * สร้างคำสั่งชำระ (Reserve) — เรียก LINE Pay Request API ได้ redirectUrl
 * @param {Object} options - { orderId, amount (บาท), productName, confirmUrl, cancelUrl }
 * @returns {Promise<{ success: boolean, redirectUrl?: string, transactionId?: string, message?: string }>}
 */
async function reserve(options = {}) {
    if (!linePayConfig.isConfigured()) {
        return NOT_CONFIGURED;
    }
    // TODO: เมื่อเชื่อมต่อ LINE Pay — เรียก Request API (Reserve)
    // - สร้าง signature (HMAC) จาก Channel Secret ตามเอกสาร
    // - ส่ง orderId, amount, productName, confirmUrl, cancelUrl
    // - คืนค่า { success: true, redirectUrl, transactionId } จาก response
    return { ...NOT_IMPLEMENTED };
}

/**
 * ยืนยันการชำระ (Confirm) — เรียก LINE Pay Confirm API หลังผู้ใช้ชำระแล้ว
 * @param {string} transactionId - จาก LINE Pay callback
 * @param {number} amount - จำนวนเงิน (บาท) ต้องตรงกับที่ reserve
 * @param {string} orderId - orderId ที่เราส่งตอน reserve
 * @returns {Promise<{ success: boolean, message?: string }>}
 */
async function confirm(transactionId, amount, orderId) {
    if (!linePayConfig.isConfigured()) {
        return NOT_CONFIGURED;
    }
    // TODO: เมื่อเชื่อมต่อ LINE Pay — เรียก Confirm API
    // - ส่ง transactionId, amount, orderId ตามเอกสาร
    // - คืนค่า { success: true } เมื่อยืนยันสำเร็จ
    return { ...NOT_IMPLEMENTED };
}

/**
 * สถานะ LINE Pay (สำหรับ API ส่งไป frontend ว่าแสดงปุ่ม LINE Pay หรือไม่)
 */
function getStatus() {
    const configured = linePayConfig.isConfigured();
    return { configured, provider: 'line_pay' };
}

module.exports = {
    getStatus,
    reserve,
    confirm,
};
