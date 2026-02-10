/**
 * การตั้งค่า Payment Gateway — Stripe เท่านั้น (บัตรเครดิต/เดบิต ตัดเงินอัตโนมัติ)
 *
 * เมื่อเชื่อมต่อ Stripe จริง:
 * 1. ใส่ค่าจาก Stripe Dashboard ลงใน .env ตาม PAYMENT_GATEWAY_*
 * 2. แก้ไข services/paymentGatewayService.js ให้เรียก Stripe API จริงแทน stub
 *
 * ตัวแปรใน .env ที่ใช้:
 * - PAYMENT_GATEWAY_ENABLED     = true | false (เปิดใช้)
 * - PAYMENT_GATEWAY_PUBLIC_KEY  = Stripe Publishable Key (pk_test_... / pk_live_...)
 * - PAYMENT_GATEWAY_SECRET_KEY  = Stripe Secret Key (sk_test_... / sk_live_...)
 * - PAYMENT_GATEWAY_WEBHOOK_SECRET = (ถ้าใช้ Webhook สำหรับ async events)
 */

require('dotenv').config();

const ENABLED = process.env.PAYMENT_GATEWAY_ENABLED === 'true' || process.env.PAYMENT_GATEWAY_ENABLED === '1';
const PUBLIC_KEY = process.env.PAYMENT_GATEWAY_PUBLIC_KEY && String(process.env.PAYMENT_GATEWAY_PUBLIC_KEY).trim();
const SECRET_KEY = process.env.PAYMENT_GATEWAY_SECRET_KEY && String(process.env.PAYMENT_GATEWAY_SECRET_KEY).trim();
const WEBHOOK_SECRET = process.env.PAYMENT_GATEWAY_WEBHOOK_SECRET && String(process.env.PAYMENT_GATEWAY_WEBHOOK_SECRET).trim();

/** ใช้ Stripe เท่านั้น */
const PROVIDER = 'stripe';

/**
 * ตรวจสอบว่าได้ตั้งค่า Gateway พร้อมใช้งานหรือยัง
 * ต้องมีอย่างน้อย: ENABLED=true, PUBLIC_KEY, SECRET_KEY (ขึ้นกับ provider)
 */
function isConfigured() {
  if (!ENABLED) return false;
  if (!SECRET_KEY) return false;
  return true;
}

/**
 * ส่งคีย์สาธารณะให้ frontend ได้ (สำหรับสร้าง token บัตร ผ่าน SDK ของ Gateway)
 * คืนค่าเมื่อ isConfigured() เป็น true เท่านั้น
 */
function getPublicKey() {
  if (!isConfigured()) return null;
  return PUBLIC_KEY || null;
}

/**
 * ค่าที่ backend ใช้ (ห้ามส่งไป frontend)
 */
function getSecretKey() {
  return SECRET_KEY || null;
}

function getProvider() {
  return PROVIDER;
}

function getWebhookSecret() {
  return WEBHOOK_SECRET || null;
}

module.exports = {
  isConfigured,
  getPublicKey,
  getSecretKey,
  getProvider,
  getWebhookSecret,
};
