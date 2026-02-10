'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import CustomerAppBar from '../components/CustomerAppBar';
import { getToken, getHeaders, handleAuthResponse } from '../utils/auth';

function PaymentSummaryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const packageId = searchParams?.get('package_id');
  const [packageItem, setPackageItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [couponCode, setCouponCode] = useState('');
  const [couponResult, setCouponResult] = useState(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [alert, setAlert] = useState({ show: false, msg: '', type: 'error' });
  const [linePayConfigured, setLinePayConfigured] = useState(false);
  const [paymentChannels, setPaymentChannels] = useState([]);

  useEffect(() => {
    if (!getToken()) {
      router.replace('/liff/login');
      return;
    }
    if (!packageId) {
      setLoading(false);
      setAlert({ show: true, msg: 'ไม่พบแพ็กเกจที่เลือก', type: 'error' });
      return;
    }
    fetch('/api/packages')
      .then((r) => (handleAuthResponse(r) ? null : r.json()))
      .then((res) => {
        setLoading(false);
        if (res == null) return;
        if (res.success && Array.isArray(res.data)) {
          const pkg = res.data.find((p) => String(p.id) === String(packageId));
          setPackageItem(pkg || null);
          if (!pkg) setAlert({ show: true, msg: 'ไม่พบแพ็กเกจที่เลือก', type: 'error' });
        } else setAlert({ show: true, msg: 'โหลดแพ็กเกจไม่สำเร็จ', type: 'error' });
      })
      .catch(() => setLoading(false));

    fetch('/api/line-pay/status')
      .then((r) => r.json())
      .then((res) => {
        if (res.success && res.data && res.data.configured) setLinePayConfigured(true);
      })
      .catch(() => {});

    fetch('/api/payment-channels', { headers: getHeaders() })
      .then((r) => (handleAuthResponse(r) ? null : r.json()))
      .then((res) => {
        if (res != null && res.success && Array.isArray(res.data)) setPaymentChannels(res.data);
      })
      .catch(() => {});
  }, [packageId, router]);

  const handleValidateCoupon = () => {
    if (!packageId || !couponCode.trim()) {
      setAlert({ show: true, msg: 'กรอกรหัสคูปองก่อนกดยืนยัน', type: 'error' });
      return;
    }
    setValidatingCoupon(true);
    setAlert({ show: false, msg: '', type: 'error' });
    fetch('/api/validate-coupon', {
      method: 'POST',
      headers: { ...getHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ package_id: packageId, coupon_code: couponCode.trim() }),
    })
      .then((r) => (handleAuthResponse(r) ? null : r.json()))
      .then((data) => {
        setValidatingCoupon(false);
        if (data == null) return;
        if (data.success && data.data) {
          if (data.data.valid) {
            setCouponResult({
              valid: true,
              extra_days: data.data.extra_days ?? 0,
              discount_percent: data.data.discount_percent ?? 0,
              discount_amount_baht: data.data.discount_amount_baht ?? 0,
              final_amount: data.data.final_amount,
            });
            const discountBaht = data.data.discount_amount_baht ?? 0;
            const msg = discountBaht > 0
              ? `ใช้คูปองได้ ส่วนลด ${discountBaht} บาท (${data.data.discount_percent ?? 0}%)`
              : `ใช้คูปองได้`;
            setAlert({ show: true, msg, type: 'success' });
          } else {
            setCouponResult({ valid: false });
            setAlert({ show: true, msg: data.data.message || 'คูปองใช้กับแพ็กเกจนี้ไม่ได้', type: 'error' });
          }
        } else setAlert({ show: true, msg: data.message || 'ตรวจสอบคูปองไม่สำเร็จ', type: 'error' });
      })
      .catch(() => {
        setValidatingCoupon(false);
        setAlert({ show: true, msg: 'เกิดข้อผิดพลาด', type: 'error' });
      });
  };

  const handleNext = () => {
    if (!packageId) return;
    setSubmitting(true);
    setAlert({ show: false, msg: '', type: 'error' });
    fetch('/api/create-pending-payment', {
      method: 'POST',
      headers: { ...getHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        package_id: packageId,
        coupon_code: couponCode.trim() || undefined,
      }),
    })
      .then((r) => (handleAuthResponse(r) ? null : r.json()))
      .then((data) => {
        setSubmitting(false);
        if (data == null) return;
        if (data.success && data.data?.redirect) {
          router.push(data.data.redirect);
          return;
        }
        const msg = data.message || 'สร้างรายการชำระไม่สำเร็จ';
        const noMinMsg = /ไม่ต่ำกว่า|ขั้นต่ำ|minimum|10\.00\s*บาท/i.test(msg)
          ? 'ไม่มีขั้นต่ำการชำระในระบบ กรุณากดปุ่ม "ถัดไป" อีกครั้งเพื่อไปหน้าคิวอาร์และแนบสลิป'
          : msg;
        setAlert({ show: true, msg: noMinMsg, type: 'error' });
      })
      .catch(() => {
        setSubmitting(false);
        setAlert({ show: true, msg: 'เกิดข้อผิดพลาด', type: 'error' });
      });
  };

  const cardChannel = paymentChannels.find((ch) => ch.channel_type === 'credit_card' || ch.channel_type === 'debit_card');

  const handlePayWithCard = () => {
    if (!packageId || !cardChannel) return;
    setSubmitting(true);
    setAlert({ show: false, msg: '', type: 'error' });
    fetch('/api/choose-package', {
      method: 'POST',
      headers: { ...getHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        package_id: packageId,
        coupon_code: couponCode.trim() || undefined,
        payment_channel_id: cardChannel.id,
      }),
    })
      .then((r) => (handleAuthResponse(r) ? null : r.json()))
      .then((data) => {
        setSubmitting(false);
        if (data == null) return;
        if (data.success) {
          setAlert({ show: true, msg: data.message || 'ชำระสำเร็จ', type: 'success' });
          setTimeout(() => router.push('/package'), 1200);
        } else setAlert({ show: true, msg: data.message || 'ชำระไม่สำเร็จ', type: 'error' });
      })
      .catch(() => {
        setSubmitting(false);
        setAlert({ show: true, msg: 'เกิดข้อผิดพลาด', type: 'error' });
      });
  };

  const handleLinePay = () => {
    if (!packageId) return;
    setSubmitting(true);
    setAlert({ show: false, msg: '', type: 'error' });
    fetch('/api/line-pay/reserve', {
      method: 'POST',
      headers: { ...getHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        package_id: packageId,
        coupon_code: couponCode.trim() || undefined,
      }),
    })
      .then((r) => (handleAuthResponse(r) ? null : r.json()))
      .then((data) => {
        setSubmitting(false);
        if (data == null) return;
        if (data.success && data.data?.redirectUrl) {
          window.location.href = data.data.redirectUrl;
          return;
        }
        const msg = data.message || 'LINE Pay ยังไม่เปิดใช้';
        const noMinMsg = /ไม่ต่ำกว่า|ขั้นต่ำ|minimum|ต่ำกว่า\s*เกณฑ์/i.test(msg)
          ? 'ยอดหลังส่วนลดต่ำกว่าเกณฑ์ของ LINE Pay กรุณากดปุ่ม "ถัดไป — ไปหน้าคิวอาร์และแนบสลิป" เพื่อชำระได้'
          : msg;
        setAlert({ show: true, msg: noMinMsg, type: 'error' });
      })
      .catch(() => {
        setSubmitting(false);
        setAlert({ show: true, msg: 'เกิดข้อผิดพลาด', type: 'error' });
      });
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <CustomerAppBar />
        <div className="flex min-h-[40vh] items-center justify-center">
          <p className="text-gray-500">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  if (!packageItem) {
    return (
      <div className="min-h-screen">
        <CustomerAppBar />
        <div className="mx-auto max-w-md p-6">
          {alert.show && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800">{alert.msg}</div>
          )}
          <Link href="/choose-package" className="text-[#1DB446] hover:underline">← กลับไปเลือกแพ็กเกจ</Link>
        </div>
      </div>
    );
  }

  const price = packageItem.price != null && !isNaN(Number(packageItem.price)) ? Number(packageItem.price) : 0;
  const discountDisplay = couponResult?.valid && (couponResult.discount_amount_baht ?? 0) > 0
    ? `-${(couponResult.discount_amount_baht ?? 0).toLocaleString()} บาท`
    : couponResult?.valid && (couponResult.extra_days ?? 0) > 0
      ? `+${couponResult.extra_days} วัน`
      : '0 บาท';
  const finalAmount = couponResult?.valid && couponResult.final_amount != null && !isNaN(Number(couponResult.final_amount))
    ? Number(couponResult.final_amount)
    : price;

  return (
    <div className="min-h-screen">
      <CustomerAppBar />
      <div className="mx-auto max-w-md p-6">
        <h1 className="mb-2 text-xl font-bold text-white">สรุปการชำระเงิน</h1>
        <p className="mb-6 text-white">ตรวจสอบราคาและส่วนลดก่อนไปหน้าคิวอาร์โอนเงิน</p>

        {alert.show && (
          <div
            className={`mb-5 rounded-lg px-4 py-3 ${
              alert.type === 'error' ? 'border border-red-200 bg-red-50 text-red-800' : 'border border-green-200 bg-green-50 text-green-800'
            }`}
          >
            {alert.msg}
          </div>
        )}

        <div className="mb-6 rounded-xl border-2 border-gray-200 bg-gray-50 p-5">
          <h2 className="mb-3 font-semibold text-gray-800">แพ็กเกจที่เลือก</h2>
          <p className="font-medium text-gray-800">{packageItem.name}</p>
          <p className="mt-1 text-sm text-gray-500">{packageItem.duration_days} วันใช้งาน</p>
          <div className="mt-4 space-y-2 border-t border-gray-200 pt-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">ราคาเต็ม</span>
              <span>{price > 0 ? `${price.toLocaleString()} บาท` : 'ฟรี'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">ส่วนลด</span>
              <span>{discountDisplay}</span>
            </div>
            <div className="flex justify-between border-t border-gray-200 pt-2 font-semibold text-gray-800">
              <span>ราคาจริงที่ต้องจ่าย</span>
              <span className="text-[#1DB446]">{price > 0 ? `${finalAmount.toLocaleString()} บาท` : 'ฟรี'}</span>
            </div>
          </div>
        </div>

        <div className="mb-6 rounded-xl border-2 border-gray-200 bg-white p-5">
          <label className="mb-2 block font-medium text-gray-800">รหัสคูปองส่วนลด (ถ้ามี)</label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="กรอกรหัสคูปอง"
              value={couponCode}
              onChange={(e) => { setCouponCode(e.target.value); setCouponResult(null); }}
              className="flex-1 rounded-lg border-2 border-gray-200 px-4 py-2.5 focus:border-[#1DB446] focus:outline-none"
            />
            <button
              type="button"
              disabled={validatingCoupon || !couponCode.trim()}
              onClick={handleValidateCoupon}
              className="rounded-lg bg-violet-600 px-4 py-2.5 font-medium text-white hover:bg-violet-700 disabled:opacity-50"
            >
              {validatingCoupon ? 'กำลังตรวจสอบ...' : 'ยืนยัน'}
            </button>
          </div>
          <p className="mt-2 text-xs text-gray-500">กรอกรหัสคูปองแล้วกดยืนยัน ระบบจะตรวจสอบว่าคูปองตรงกับแพ็กเกจหรือไม่ และแสดงส่วนลดด้านบน</p>
        </div>

        <div className="flex flex-col gap-3">
          {price > 0 && cardChannel && (
            <button
              type="button"
              disabled={submitting}
              onClick={handlePayWithCard}
              className="w-full rounded-lg bg-violet-600 py-3.5 font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
            >
              {submitting ? 'กำลังดำเนินการ...' : 'ชำระด้วยบัตรที่ลงทะเบียน'}
            </button>
          )}
          {price > 0 && (
            <button
              type="button"
              disabled={submitting || !linePayConfigured}
              onClick={handleLinePay}
              title={!linePayConfigured ? 'รอเชื่อมต่อ LINE Pay (ตั้งค่าใน .env)' : undefined}
              className={`w-full rounded-lg py-3.5 font-semibold text-white disabled:opacity-60 ${linePayConfigured ? 'bg-[#00B900] hover:bg-[#009900]' : 'bg-gray-500 cursor-not-allowed'}`}
            >
              {submitting ? 'กำลังดำเนินการ...' : linePayConfigured ? 'ชำระด้วย LINE Pay' : 'ชำระด้วย LINE Pay (รอเปิดใช้)'}
            </button>
          )}
          <button
            type="button"
            disabled={submitting}
            onClick={handleNext}
            className="w-full rounded-lg bg-[#1DB446] py-3.5 font-semibold text-white hover:bg-[#0FA03A] disabled:opacity-50"
          >
            {submitting ? 'กำลังดำเนินการ...' : 'ถัดไป — ไปหน้าคิวอาร์และแนบสลิป'}
          </button>
          <Link href="/choose-package" className="text-center text-white hover:underline">ยกเลิก กลับไปเลือกแพ็กเกจ</Link>
        </div>
      </div>
    </div>
  );
}

export default function PaymentSummaryPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen">
        <CustomerAppBar />
        <div className="flex min-h-[40vh] items-center justify-center">
          <p className="text-gray-500">กำลังโหลด...</p>
        </div>
      </div>
    }>
      <PaymentSummaryContent />
    </Suspense>
  );
}
