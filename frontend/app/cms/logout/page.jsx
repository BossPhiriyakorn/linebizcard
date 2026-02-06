'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CmsLogoutPage() {
  const router = useRouter();
  useEffect(() => {
    localStorage.removeItem('cms_token');
    router.replace('/cms/login');
  }, [router]);
  return (
    <div style={{ padding: 40, textAlign: 'center', fontFamily: 'sans-serif' }}>
      <p>กำลังออกจากระบบ...</p>
    </div>
  );
}
