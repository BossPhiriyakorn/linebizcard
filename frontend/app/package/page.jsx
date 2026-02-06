'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import CustomerAppBar from '../components/CustomerAppBar';
import { getToken, getHeaders } from '../utils/auth';

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
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    const t = getToken();
    if (!t) {
      router.replace('/');
      return;
    }
    fetch('/api/user/profile', { headers: getHeaders() })
      .then((r) => {
        if (r.status === 401) {
          router.replace('/');
          return null;
        }
        return r.json();
      })
      .then((data) => {
        setLoading(false);
        if (data?.success && data.data) setProfile(data.data);
      })
      .catch(() => setLoading(false));
  }, [router]);

  const membership = profile?.membership || null;

  const handleCancel = () => {
    if (!window.confirm('ต้องการยกเลิกแพ็กเกจปัจจุบันใช่หรือไม่? หลังยกเลิกสิทธิ์การใช้งานจะสิ้นสุดทันที')) return;
    setCancelling(true);
    setAlert({ show: false, msg: '', type: 'success' });
    fetch('/api/cancel-membership', {
      method: 'POST',
      headers: getHeaders(),
    })
      .then((r) => r.json())
      .then((data) => {
        setCancelling(false);
        if (data?.success) {
          setAlert({ show: true, msg: data.message || 'ยกเลิกแพ็กเกจแล้ว', type: 'success' });
          fetch('/api/user/profile', { headers: getHeaders() })
            .then((res) => (res.status === 401 ? null : res.json()))
            .then((d) => {
              if (d?.success && d.data) setProfile(d.data);
            });
        } else setAlert({ show: true, msg: data?.message || 'ดำเนินการไม่สำเร็จ', type: 'error' });
      })
      .catch(() => {
        setCancelling(false);
        setAlert({ show: true, msg: 'เกิดข้อผิดพลาด', type: 'error' });
      });
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <CustomerAppBar />
        <div className="flex min-h-[40vh] items-center justify-center">
          <p className="text-white/90">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <CustomerAppBar />
      <div className="mx-auto max-w-[600px] p-4 md:p-6">
        <h1 className="mb-2 text-xl font-bold text-white">แพ็กเกจของฉัน</h1>
        <p className="mb-6 text-sm text-white/90">ดูแพ็กเกจที่ใช้อยู่ เปลี่ยนหรือยกเลิกได้ที่นี่</p>

        {alert.show && (
          <div
            className={`mb-5 rounded-lg px-4 py-3 ${
              alert.type === 'error' ? 'border border-red-200 bg-red-50 text-red-800' : 'border border-green-200 bg-green-50 text-green-800'
            }`}
          >
            {alert.msg}
          </div>
        )}

        {!membership ? (
          <div className="rounded-xl border-2 border-gray-200 bg-gray-50 p-6 text-center">
            <p className="mb-4 text-gray-600">คุณยังไม่ได้เลือกแพ็กเกจ เลือกแพ็กเกจเพื่อเริ่มใช้งาน</p>
            <Link
              href="/choose-package"
              className="inline-block rounded-lg bg-[#1DB446] px-6 py-3 font-semibold text-white no-underline hover:bg-[#0FA03A]"
            >
              เลือกแพ็กเกจ
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-6 rounded-xl border-2 border-gray-200 bg-white p-5 shadow-sm">
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
                  <div className="flex justify-between border-t border-gray-100 pt-2">
                    <span className="text-gray-500">จำนวนวันคงเหลือ</span>
                    <span className="font-medium text-[#1DB446]">{membership.remaining_days} วัน</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <Link
                href="/choose-package"
                className="w-full rounded-lg bg-[#1DB446] py-3.5 text-center font-semibold text-white no-underline hover:bg-[#0FA03A]"
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
            <p className="mt-4 text-center text-xs text-white/90">
              ยกเลิกแล้วสิทธิ์การใช้งานจะสิ้นสุดทันที สามารถเลือกแพ็กเกจใหม่ได้ที่ปุ่มด้านบน
            </p>
          </>
        )}

        <p className="mt-8 text-center">
          <Link href="/home" className="text-white hover:text-white/80 hover:underline">← กลับหน้าแรก</Link>
        </p>
      </div>
    </div>
  );
}
