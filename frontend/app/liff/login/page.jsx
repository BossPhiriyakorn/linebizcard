'use client';

import { Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';

function LiffLoginContent() {
  const searchParams = useSearchParams();
  const errorMsg = searchParams.get('error');

  useEffect(() => {
    if (!errorMsg) {
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      window.location.href = baseUrl + '/api/auth/line/login';
    }
  }, [errorMsg]);

  if (!errorMsg) {
    return (
      <div className="p-10 text-center font-sans">
        <p className="text-gray-600">กำลังพาไปหน้า LINE Login...</p>
      </div>
    );
  }

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const escaped = String(errorMsg)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  return (
    <div className="mx-auto max-w-[500px] p-5 font-sans">
      <h1 className="text-xl font-bold text-gray-800">เกิดข้อผิดพลาดในการเข้าสู่ระบบ</h1>
      <div className="my-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800" dangerouslySetInnerHTML={{ __html: escaped }} />
      <p className="text-gray-600">กรุณาตรวจสอบการตั้งค่า Callback URL และ Channel ID/Secret ใน LINE Developers ให้ตรงกับโดเมนปัจจุบัน</p>
      <a
        href={baseUrl + '/api/auth/line/login'}
        className="mt-3 inline-flex min-h-[44px] items-center justify-center rounded-lg bg-[#1DB446] px-5 py-3 font-semibold text-white no-underline hover:bg-[#0FA03A]"
      >
        ลองเข้าสู่ระบบใหม่
      </a>
    </div>
  );
}

export default function LiffLoginPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-gray-500">กำลังโหลด...</div>}>
      <LiffLoginContent />
    </Suspense>
  );
}
