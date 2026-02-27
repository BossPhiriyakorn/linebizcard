'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import CustomerAppBar from '../components/CustomerAppBar';
import AlertBanner from '../components/AlertBanner';
import { getToken, getHeaders, handleAuthResponse } from '../utils/auth';
import { getMembershipCountdown } from '../utils/countdown';

function formatDate(value) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function PackagePage() {
  const router = useRouter();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState({ show: false, msg: '', type: 'success' });
  const [couponAlert, setCouponAlert] = useState({ show: false, msg: '', type: 'success' });
  const [cancelling, setCancelling] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [submittingCoupon, setSubmittingCoupon] = useState(false);
  const [countdownText, setCountdownText] = useState(null);

  useEffect(() => {
    const t = getToken();
    if (!t) {
      router.replace('/liff/login');
      return;
    }
    fetch('/api/user/profile', { headers: getHeaders() })
      .then((r) => (handleAuthResponse(r) ? null : r.json()))
      .then((data) => {
        setLoading(false);
        if (data?.success && data.data) setProfile(data.data);
      })
      .catch(() => setLoading(false));
  }, [router]);

  const membership = profile?.membership || null;

  useEffect(() => {
    const endDate = membership?.end_date;
    const remaining = membership?.remaining_days;
    if (remaining !== 0 || !endDate) {
      setCountdownText(null);
      return;
    }
    const update = () => setCountdownText(getMembershipCountdown(endDate));
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [membership?.end_date, membership?.remaining_days]);

  const handleCancel = () => {
    if (!window.confirm('ต้องการยกเลิกแพ็กเกจปัจจุบันใช่หรือไม่? หลังยกเลิกสิทธิ์การใช้งานจะสิ้นสุดทันที')) return;
    setCancelling(true);
    setAlert({ show: false, msg: '', type: 'success' });
    fetch('/api/cancel-membership', {
      method: 'POST',
      headers: getHeaders(),
    })
      .then((r) => (handleAuthResponse(r) ? null : r.json()))
      .then((data) => {
        setCancelling(false);
        if (data == null) return;
        if (data?.success) {
          setAlert({ show: true, msg: data.message || 'ยกเลิกแพ็กเกจแล้ว', type: 'success' });
          fetch('/api/user/profile', { headers: getHeaders() })
            .then((res) => (handleAuthResponse(res) ? null : res.json()))
            .then((d) => {
              if (d != null && d?.success && d.data) setProfile(d.data);
            });
        } else setAlert({ show: true, msg: data?.message || 'ดำเนินการไม่สำเร็จ', type: 'error' });
      })
      .catch(() => {
        setCancelling(false);
        setAlert({ show: true, msg: 'เกิดข้อผิดพลาด', type: 'error' });
      });
  };

  const handleRedeemCoupon = async (e) => {
    e.preventDefault();
    const raw = (couponCode || '').trim();
    if (!raw) {
      setCouponAlert({ show: true, msg: 'กรุณากรอกรหัสคูปอง', type: 'error' });
      return;
    }
    setSubmittingCoupon(true);
    setCouponAlert({ show: false, msg: '', type: 'success' });
    try {
      const res = await fetch('/api/coupons/redeem', {
        method: 'POST',
        headers: { ...getHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: raw }),
      });
      if (handleAuthResponse(res)) return;
      const data = await res.json();
      if (data.success) {
        setCouponAlert({ show: true, msg: data.message || 'ใช้คูปองสำเร็จ', type: 'success' });
        setCouponCode('');
        fetch('/api/user/profile', { headers: getHeaders() })
          .then((r) => (handleAuthResponse(r) ? null : r.json()))
          .then((d) => {
            if (d?.success && d.data) setProfile(d.data);
          });
      } else {
        setCouponAlert({ show: true, msg: data.message || 'ใช้คูปองไม่สำเร็จ', type: 'error' });
      }
    } catch {
      setCouponAlert({ show: true, msg: 'เกิดข้อผิดพลาด กรุณาลองใหม่', type: 'error' });
    }
    setSubmittingCoupon(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <CustomerAppBar />
        <div className="flex min-h-[40vh] items-center justify-center">
          <p className="text-[#f1f5f9]">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <CustomerAppBar />
      <div className="mx-auto max-w-[600px] p-4 md:p-6">
        <div className="rounded-2xl bg-white p-6 shadow-[0_2px_10px_rgba(0,0,0,0.08)] md:p-8">
          {/* ส่วนแพ็กเกจของฉัน */}
          <h1 className="mb-2 flex items-center gap-2 text-xl font-bold text-gray-800">
            <img src="/assets/icons/crown.png" alt="" className="h-8 w-8 object-contain" />
            แพ็กเกจของฉัน
          </h1>
          <p className="mb-6 text-sm text-gray-600">ดูแพ็กเกจที่ใช้อยู่ เปลี่ยนหรือยกเลิกได้ที่นี่</p>

          <AlertBanner
            show={alert.show}
            msg={alert.msg}
            type={alert.type}
            onClose={() => setAlert((a) => ({ ...a, show: false }))}
            autoCloseMs={alert.type === 'success' ? 5000 : 0}
          />

          {!membership ? (
            <div className="rounded-xl border-2 border-gray-200 bg-gray-50 p-6 text-center">
              <p className="mb-4 text-gray-600">คุณยังไม่ได้เลือกแพ็กเกจ เลือกแพ็กเกจเพื่อเริ่มใช้งาน</p>
              <Link
                href="/choose-package"
                className="inline-block rounded-lg bg-[#c9a962] px-6 py-3 font-semibold text-[#0c1222] no-underline hover:bg-[#b8960c]"
              >
                เลือกแพ็กเกจ
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-6 rounded-xl border-2 border-gray-200 bg-gray-50 p-5">
                <h2 className="mb-3 text-base font-semibold text-gray-800">แพ็กเกจปัจจุบัน</h2>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">แพ็กเกจ</span>
                    <span className="font-medium text-gray-800">{membership.package_name || '-'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">วันเริ่มต้น</span>
                    <span>{formatDate(membership.start_date)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">วันหมดอายุ</span>
                    <span>{formatDate(membership.end_date)}</span>
                  </div>
                  {membership.remaining_days != null && (
                    <div className="flex justify-between border-t border-gray-200 pt-2">
                      <span className="text-gray-500">จำนวนวันคงเหลือ</span>
                      <span className="font-medium text-[#c9a962]">
                        {membership.remaining_days} วัน
                        {countdownText && <span className="ml-1 block text-xs text-amber-600">{countdownText}</span>}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <Link
                  href="/choose-package"
                  className="w-full rounded-lg bg-[#c9a962] py-3.5 text-center font-semibold text-[#0c1222] no-underline hover:bg-[#b8960c]"
                >
                  เปลี่ยนแพ็กเกจ
                </Link>
                <button
                  type="button"
                  disabled={cancelling}
                  onClick={handleCancel}
                  className="w-full rounded-lg border-2 border-red-200 bg-white py-3.5 font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  {cancelling ? 'กำลังดำเนินการ...' : 'ยกเลิกแพ็กเกจปัจจุบัน'}
                </button>
              </div>
              <p className="mt-4 text-center text-xs text-gray-500">
                ยกเลิกแล้วสิทธิ์การใช้งานจะสิ้นสุดทันที สามารถเลือกแพ็กเกจใหม่ได้ที่ปุ่มด้านบน
              </p>
            </>
          )}

          {/* คั่นกับส่วนคูปอง */}
          <hr className="my-8 border-gray-200" />

          {/* ส่วนคูปอง */}
          <h2 className="mb-2 text-lg font-bold text-gray-800">
            คูปอง
          </h2>
          <p className="mb-6 text-sm text-gray-600">
            กรอกรหัสคูปองด้านล่างเพื่อแลกสิทธิ์ เช่น เพิ่มวันใช้งานสมาชิก
          </p>
          <form onSubmit={handleRedeemCoupon}>
            <AlertBanner
              show={couponAlert.show}
              msg={couponAlert.msg}
              type={couponAlert.type}
              onClose={() => setCouponAlert((a) => ({ ...a, show: false }))}
              autoCloseMs={couponAlert.type === 'success' ? 5000 : 0}
            />
            <div className="mb-5">
              <label className="mb-2 block text-sm font-medium text-gray-800">
                รหัสคูปอง <span className="text-red-600" aria-hidden="true">*</span>
              </label>
              <input
                type="text"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                placeholder="กรอกรหัสคูปอง"
                className="w-full rounded-xl border-2 border-gray-200 bg-gray-50 px-4 py-3 text-base text-slate-800 placeholder:text-slate-500 transition-all focus:border-[#c9a962] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#c9a962]/20"
                autoComplete="off"
              />
            </div>
            <button
              type="submit"
              disabled={submittingCoupon}
              className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-[#c9a962] px-6 py-3 font-semibold text-[#0c1222] hover:bg-[#b8960c] disabled:bg-gray-400"
            >
              {submittingCoupon ? 'กำลังตรวจสอบ...' : 'ใช้คูปอง'}
            </button>
          </form>

          <p className="mt-6 text-sm text-gray-500">
            <Link href="/home" className="text-[#c9a962] hover:underline">
              ← กลับไปหน้าแรก
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
