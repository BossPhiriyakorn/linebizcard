'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import CmsLayout from '../components/CmsLayout';

export default function CmsRootLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('cms_token') : null;
    const isLoginPage = pathname === '/cms/login';
    const isLogoutPage = pathname === '/cms/logout';
    if (!isLoginPage && !isLogoutPage && !token) {
      router.replace('/cms/login');
      return;
    }
    setAuthChecked(true);
  }, [pathname, router]);

  if (pathname === '/cms/login' || pathname === '/cms/logout') {
    return children;
  }

  if (!authChecked) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-slate-100 text-slate-500" data-cms aria-busy="true" style={{ minHeight: '100vh', background: '#f1f5f9' }}>
        <p className="m-0">กำลังตรวจสอบ...</p>
      </div>
    );
  }

  return <CmsLayout>{children}</CmsLayout>;
}
