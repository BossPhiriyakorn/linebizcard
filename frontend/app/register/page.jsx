'use client';

import { useEffect } from 'react';

export default function RegisterPage() {
  useEffect(() => {
    window.location.href = '/api/auth/line/login';
  }, []);
  return (
    <div className="flex min-h-screen items-center justify-center p-10 text-center font-sans">
      <p className="text-gray-600">กำลังพาไปเข้าสู่ระบบ LINE...</p>
    </div>
  );
}
