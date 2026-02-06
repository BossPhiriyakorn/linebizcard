'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import CustomerAppBar from '../components/CustomerAppBar';
import { getToken, getHeaders } from '../utils/auth';

export default function CouponPage() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [alert, setAlert] = useState({ show: false, msg: '', type: 'success' });

  useEffect(() => {
    const t = getToken();
    if (!t) {
      window.location.href = '/';
      return;
    }
    fetch('/api/user/profile', { headers: getHeaders() })
      .then((r) => {
        if (r.status === 401) {
          window.location.href = '/';
          return null;
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleRedeem = async (e) => {
    e.preventDefault();
    const raw = (code || '').trim();
    if (!raw) {
      setAlert({ show: true, msg: 'กรุณากรอกรหัสคูปอง', type: 'error' });
      return;
    }
    setSubmitting(true);
    setAlert({ show: false, msg: '', type: 'success' });
    try {
      const res = await fetch('/api/coupons/redeem', {
        method: 'POST',
        headers: { ...getHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: raw }),
      });
      const data = await res.json();
      if (data.success) {
        setAlert({ show: true, msg: data.message || 'ใช้คูปองสำเร็จ', type: 'success' });
        setCode('');
      } else {
        setAlert({ show: true, msg: data.message || 'ใช้คูปองไม่สำเร็จ', type: 'error' });
      }
    } catch {
      setAlert({ show: true, msg: 'เกิดข้อผิดพลาด กรุณาลองใหม่', type: 'error' });
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-[1200px]">
        <CustomerAppBar />
        <div className="flex min-h-[200px] items-center justify-center">
          <p className="text-gray-500">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1200px]">
      <CustomerAppBar />
      <div className="rounded-2xl bg-white p-6 shadow-[0_2px_10px_rgba(0,0,0,0.08)] md:p-8">
        <h2 className="mb-2 text-lg font-bold text-gray-800 md:text-xl">คูปอง</h2>
        <p className="mb-6 text-sm text-gray-600">
          กรอกรหัสคูปองด้านล่างเพื่อแลกสิทธิ์ เช่น เพิ่มวันใช้งานสมาชิก
        </p>
        <form onSubmit={handleRedeem}>
          {alert.show && (
            <div
              className={`mb-4 rounded-xl border-2 px-4 py-3 text-sm ${
                alert.type === 'success'
                  ? 'border-green-200 bg-green-50 text-green-800'
                  : 'border-red-200 bg-red-50 text-red-800'
              }`}
            >
              {alert.msg}
            </div>
          )}
          <div className="mb-5">
            <label className="mb-2 block text-sm font-medium text-gray-800">รหัสคูปอง</label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="กรอกรหัสคูปอง"
              className="w-full rounded-xl border-2 border-gray-200 bg-gray-50 px-4 py-3 text-base transition-all focus:border-[#1DB446] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#1DB446]/15"
              autoComplete="off"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-[#1DB446] px-6 py-3 font-semibold text-white hover:bg-[#0FA03A] disabled:bg-gray-400"
          >
            {submitting ? 'กำลังตรวจสอบ...' : 'ใช้คูปอง'}
          </button>
        </form>
        <p className="mt-6 text-sm text-gray-500">
          <Link href="/home" className="text-[#6B46C1] hover:underline">
            ← กลับไปหน้าแรก
          </Link>
        </p>
      </div>
    </div>
  );
}
