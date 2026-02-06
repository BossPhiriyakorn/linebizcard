'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PaymentsPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/cms/packages');
  }, [router]);
  return (
    <div className="mb-6 rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
      <div className="py-12 text-center text-slate-500">กำลังพาไปหน้าแพ็กเกจ...</div>
    </div>
  );
}
