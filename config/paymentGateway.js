/**
 * การตั้งค่า Payment Gateway (สำหรับบัตรเครดิต/เดบิต ตัดเงินอัตโนมัติ)
 *
 * เมื่อเชื่อมต่อ Gateway จริง (เช่น Omise, 2C2P, Stripe) ให้:
 * 1. ใส่ค่าจาก Gateway ลงใน .env ตาม PAYMENT_GATEWAY_*
 * 2. แก้ไข services/paymentGatewayService.js ให้เรียก API จริงแทน stub
 *
 * ตัวแปรใน .env ที่ใช้:
 * - PAYMENT_GATEWAY_ENABLED     = true | false (เปิดใช้ Gateway)
 * - PAYMENT_GATEWAY_PROVIDER   = omise | 2c2p | stripe | ... (ชื่อ provider)
 * - PAYMENT_GATEWAY_PUBLIC_KEY = คีย์สำหรับฝั่ง frontend (สร้าง token บัตร)
 * - PAYMENT_GATEWAY_SECRET_KEY = คีย์สำหรับฝั่ง backend (ยิง charge)
 * - PAYMENT_GATEWAY_MERCHANT_ID = (ถ้า provider ต้องการ)
 * - PAYMENT_GATEWAY_API_URL    = base URL ของ API (ถ้าไม่ใช้ default)
 */

require('dotenv').config();

const ENABLED = process.env.PAYMENT_GATEWAY_ENABLED === 'true' || process.env.PAYMENT_GATEWAY_ENABLED === '1';
const PUBLIC_KEY = process.env.PAYMENT_GATEWAY_PUBLIC_KEY && String(process.env.PAYMENT_GATEWAY_PUBLIC_KEY).trim();
const SECRET_KEY = process.env.PAYMENT_GATEWAY_SECRET_KEY && String(process.env.PAYMENT_GATEWAY_SECRET_KEY).trim();
const PROVIDER = (process.env.PAYMENT_GATEWAY_PROVIDER && String(process.env.PAYMENT_GATEWAY_PROVIDER).trim()) || '';
const MERCHANT_ID = process.env.PAYMENT_GATEWAY_MERCHANT_ID && String(process.env.PAYMENT_GATEWAY_MERCHANT_ID).trim();
const API_URL = process.env.PAYMENT_GATEWAY_API_URL && String(process.env.PAYMENT_GATEWAY_API_URL).trim();

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
  return PROVIDER || null;
}

function getMerchantId() {
  return MERCHANT_ID || null;
}

function getApiUrl() {
  return API_URL || null;
}

module.exports = {
  isConfigured,
  getPublicKey,
  getSecretKey,
  getProvider,
  getMerchantId,
  getApiUrl,
};
