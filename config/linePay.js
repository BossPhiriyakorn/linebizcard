/**
 * การตั้งค่า LINE Pay — รอเชื่อมต่อ API จริง
 *
 * เมื่อเชื่อมต่อ LINE Pay จริง:
 * 1. สมัคร LINE Pay Merchant ได้ Channel ID + Channel Secret
 * 2. ใส่ค่าลง .env ตาม LINE_PAY_*
 * 3. แก้ services/linePayService.js ให้เรียก LINE Pay Request API (Reserve) และ Confirm API
 *
 * ตัวแปรใน .env:
 * - LINE_PAY_CHANNEL_ID     = Channel ID จาก LINE Pay
 * - LINE_PAY_CHANNEL_SECRET = Channel Secret จาก LINE Pay
 * - LINE_PAY_CONFIRM_URL    = URL ที่ LINE Pay redirect กลับหลังชำระ (เช่น https://your-domain.com/api/line-pay/confirm)
 * - LINE_PAY_CANCEL_URL     = URL เมื่อผู้ใช้ยกเลิก (เช่น https://your-domain.com/payment-summary)
 */

require('dotenv').config();

const CHANNEL_ID = process.env.LINE_PAY_CHANNEL_ID && String(process.env.LINE_PAY_CHANNEL_ID).trim();
const CHANNEL_SECRET = process.env.LINE_PAY_CHANNEL_SECRET && String(process.env.LINE_PAY_CHANNEL_SECRET).trim();
const BASE_URL = process.env.BASE_URL && String(process.env.BASE_URL).trim();

function getConfirmUrl() {
    const url = process.env.LINE_PAY_CONFIRM_URL && String(process.env.LINE_PAY_CONFIRM_URL).trim();
    if (url) return url;
    return BASE_URL ? `${BASE_URL.replace(/\/$/, '')}/api/line-pay/confirm` : null;
}

function getCancelUrl() {
    const url = process.env.LINE_PAY_CANCEL_URL && String(process.env.LINE_PAY_CANCEL_URL).trim();
    if (url) return url;
    return BASE_URL ? `${BASE_URL.replace(/\/$/, '')}/payment-summary` : null;
}

function isConfigured() {
    return !!(CHANNEL_ID && CHANNEL_SECRET && getConfirmUrl());
}

module.exports = {
    isConfigured,
    getChannelId: () => CHANNEL_ID || null,
    getChannelSecret: () => CHANNEL_SECRET || null,
    getConfirmUrl,
    getCancelUrl,
};
