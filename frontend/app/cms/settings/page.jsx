'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SettingsRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/cms/manage-app?tab=settings');
  }, [router]);
  return (
    <div className="flex min-h-[200px] items-center justify-center text-slate-500">
      กำลังพาไปหน้าจัดการแอป...
    </div>
  );
}
