/**
 * ทดสอบการเชื่อมต่อ Stripe API โดยตรง
 * รัน: node scripts/test-stripe-api.js
 * ต้องตั้งค่า .env (PAYMENT_GATEWAY_ENABLED=true, PAYMENT_GATEWAY_SECRET_KEY=sk_test_...)
 */

require('dotenv').config();
const Stripe = require('stripe');
const paymentGatewayConfig = require('../config/paymentGateway');

async function main() {
  console.log('--- ทดสอบ Stripe API ---\n');

  if (!paymentGatewayConfig.isConfigured()) {
    console.log('❌ ยังไม่ได้ตั้งค่า Stripe ใน .env');
    console.log('   ใส่ PAYMENT_GATEWAY_ENABLED=true');
    console.log('   ใส่ PAYMENT_GATEWAY_PUBLIC_KEY=pk_test_...');
    console.log('   ใส่ PAYMENT_GATEWAY_SECRET_KEY=sk_test_...');
    process.exit(1);
  }

  const secret = paymentGatewayConfig.getSecretKey();
  const pubKey = paymentGatewayConfig.getPublicKey();
  console.log('✓ อ่าน config จาก .env ได้');
  console.log('  Publishable Key:', pubKey ? pubKey.slice(0, 12) + '...' : '(ไม่มี)');
  console.log('  Secret Key:      sk_***...\n');

  const stripe = new Stripe(secret);

  try {
    // 1. เรียก Balance API (ตรวจว่า key ใช้ได้)
    const balance = await stripe.balance.retrieve();
    console.log('1. Balance API — สำเร็จ');
    const available = balance.available && balance.available[0];
    const pending = balance.pending && balance.pending[0];
    if (available) {
      console.log('   ยอดใช้ได้:', available.amount / 100, available.currency.toUpperCase());
    }
    if (pending) {
      console.log('   รอโอน:', pending.amount / 100, pending.currency.toUpperCase());
    }
    if (!available && !pending) {
      console.log('   (บัญชี Test มักเป็น 0)');
    }
  } catch (err) {
    console.log('1. Balance API — ล้มเหลว:', err.message || err);
    process.exit(1);
  }

  try {
    // 2. เรียก Customers list (ตรวจว่าเรียก API อื่นได้)
    const customers = await stripe.customers.list({ limit: 1 });
    console.log('\n2. Customers API — สำเร็จ');
    console.log('   จำนวนลูกค้า (ตัวอย่าง):', customers.data.length);
  } catch (err) {
    console.log('\n2. Customers API — ล้มเหลว:', err.message || err);
    process.exit(1);
  }

  console.log('\n--- ทดสอบ Stripe API ผ่านทั้งหมด ---');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
