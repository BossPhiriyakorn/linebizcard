'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import CustomerAppBar from '../components/CustomerAppBar';
import { getToken, getHeaders } from '../utils/auth';

const OTP_COOLDOWN_MINUTES = 5;

export default function VerifyEmailPage() {
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [message, setMessage] = useState({ show: false, text: '', type: 'success' });
  const [cooldownRemaining, setCooldownRemaining] = useState(0); // นาที

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
        return r.json();
      })
      .then((data) => {
        setLoading(false);
        if (data?.success && data.data) {
          const p = data.data;
          if (p.email_verified) {
            window.location.href = '/profile?verified=1';
            return;
          }
          setEmail(p.email || '');
        }
      })
      .catch(() => setLoading(false));
  }, []);

  // ดึงสถานะ cooldown จาก API (เมื่อโหลดหน้า หรือหลังส่ง OTP)
  useEffect(() => {
    if (!email) return;
    fetch(`/api/auth/verification-status?email=${encodeURIComponent(email)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.success && data.cooldown_remaining != null && data.cooldown_remaining > 0) {
          setCooldownRemaining(data.cooldown_remaining);
        }
      })
      .catch(() => {});
  }, [email]);

  // นับถอยหลัง cooldown ทุก 1 นาที
  useEffect(() => {
    if (cooldownRemaining <= 0) return;
    const timer = setInterval(() => {
      setCooldownRemaining((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 60 * 1000);
    return () => clearInterval(timer);
  }, [cooldownRemaining]);

  const handleRequestOtp = async () => {
    if (!email) {
      setMessage({ show: true, text: 'ไม่พบอีเมล', type: 'error' });
      return;
    }
    setSendingOtp(true);
    setMessage({ show: false, text: '', type: 'success' });
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ show: true, text: 'ส่งรหัส OTP ไปยังอีเมลของคุณแล้ว กรุณาตรวจสอบอีเมล', type: 'success' });
        setCooldownRemaining(OTP_COOLDOWN_MINUTES);
      } else {
        if (res.status === 429 && data.cooldown_remaining != null) {
          setCooldownRemaining(data.cooldown_remaining);
        }
        setMessage({ show: true, text: data.message || 'ส่ง OTP ไม่สำเร็จ', type: 'error' });
      }
    } catch {
      setMessage({ show: true, text: 'เกิดข้อผิดพลาดในการส่ง OTP', type: 'error' });
    }
    setSendingOtp(false);
  };

  const handleVerifyOtp = async () => {
    const code = otpCode.replace(/\D/g, '').slice(0, 6);
    if (!email || code.length !== 6) {
      setMessage({ show: true, text: 'กรุณากรอกรหัส OTP 6 หลัก', type: 'error' });
      return;
    }
    setVerifying(true);
    setMessage({ show: false, text: '', type: 'success' });
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp_code: code }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ show: true, text: 'ยืนยันตัวตนสำเร็จ กำลังพาไปหน้าโปรไฟล์...', type: 'success' });
        setTimeout(() => {
          window.location.href = '/profile?verified=1';
        }, 1500);
      } else {
        setMessage({ show: true, text: data.message || 'รหัส OTP ไม่ถูกต้องหรือหมดอายุ', type: 'error' });
      }
    } catch {
      setMessage({ show: true, text: 'เกิดข้อผิดพลาดในการยืนยัน', type: 'error' });
    }
    setVerifying(false);
  };

  if (!getToken()) return null;

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-[1200px]">
        <CustomerAppBar />
        <div className="flex flex-col items-center justify-center py-20">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#1DB446]/30 border-t-[#1DB446]" />
          <p className="mt-3 text-gray-500">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1200px]">
      <CustomerAppBar />
      <div className="rounded-xl bg-white p-4 shadow-[0_8px_30px_rgba(0,0,0,0.12)] md:p-6">
        <div className="mb-4 border-b-2 border-gray-100 pb-4">
          <h2 className="text-lg font-bold text-gray-800 md:text-xl">ยืนยันตัวตน</h2>
          <p className="mt-1 text-sm text-gray-500">
            ระบบจะส่งรหัส OTP 6 หลักไปยังอีเมลที่ลงทะเบียนไว้ กรุณากรอกรหัสด้านล่าง
          </p>
        </div>

        {message.show && (
          <div
            className={`mb-4 rounded-lg px-4 py-3 ${
              message.type === 'error'
                ? 'border border-red-200 bg-red-50 text-red-800'
                : 'border border-green-200 bg-green-50 text-green-800'
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="max-w-md space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">อีเมลที่ลงทะเบียน</label>
            <input
              type="email"
              value={email}
              readOnly
              className="w-full rounded-xl border-2 border-gray-200 bg-gray-100 px-4 py-3 text-gray-600"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">รหัส OTP (6 หลัก)</label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="กรอกรหัสจากอีเมล"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className="w-full rounded-xl border-2 border-gray-200 bg-gray-50 px-4 py-3 text-center text-lg tracking-widest focus:border-[#1DB446] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#1DB446]/15"
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleRequestOtp}
              disabled={sendingOtp || cooldownRemaining > 0}
              className="rounded-xl border-2 border-[#1DB446] bg-white px-5 py-3 font-semibold text-[#1DB446] hover:bg-[#1DB446] hover:text-white disabled:border-gray-300 disabled:bg-gray-100 disabled:text-gray-400"
            >
              {sendingOtp
                ? 'กำลังส่ง...'
                : cooldownRemaining > 0
                  ? `ขอ OTP อีกครั้งได้ใน ${cooldownRemaining} นาที`
                  : 'ขอ OTP'}
            </button>
            <button
              type="button"
              onClick={handleVerifyOtp}
              disabled={verifying || otpCode.replace(/\D/g, '').length !== 6}
              className="rounded-xl bg-[#1DB446] px-5 py-3 font-semibold text-white hover:bg-[#0FA03A] disabled:bg-gray-400"
            >
              {verifying ? 'กำลังยืนยัน...' : 'ยืนยัน'}
            </button>
          </div>
        </div>

        <p className="mt-6">
          <Link href="/profile" className="text-[#1DB446] hover:underline">
            ← กลับไปหน้าโปรไฟล์
          </Link>
        </p>
      </div>
    </div>
  );
}
