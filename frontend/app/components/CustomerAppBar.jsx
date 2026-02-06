'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const menuItems = [
  { path: '/home', label: 'หน้าแรก', icon: 'home' },
  { path: '/my-cards', label: 'การ์ดของฉัน', icon: 'cards' },
  { path: '/create', label: 'สร้างการ์ด', icon: 'add' },
  { path: '/package', label: 'แพ็กเกจ', icon: 'upgrade' },
  { path: '/coupon', label: 'คูปอง', icon: 'coupon' },
  { path: '/profile', label: 'โปรไฟล์', icon: 'profile' },
];

function Icon({ name }) {
  const size = 22;
  if (name === 'home') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <path d="M9 22V12h6v10" />
      </svg>
    );
  }
  if (name === 'cards') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <path d="M2 10h20" />
      </svg>
    );
  }
  if (name === 'add') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 5v14M5 12h14" />
      </svg>
    );
  }
  if (name === 'profile') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20c0-4 4-6 8-6s8 2 8 6" />
      </svg>
    );
  }
  if (name === 'upgrade') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2l3 7h7l-5.5 4 2 7-6.5-4.5L5.5 20l2-7L2 9h7z" />
      </svg>
    );
  }
  if (name === 'coupon') {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 12v10H4V12" />
        <path d="M2 7h20" />
        <path d="M12 22v-5" />
      </svg>
    );
  }
  return null;
}

export default function CustomerAppBar() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = usePathname();

  const closeDrawer = () => setDrawerOpen(false);

  return (
    <>
      <div className="sticky top-0 z-[100] mb-4 flex items-center gap-3 rounded-xl bg-white px-4 py-3 shadow-[0_2px_10px_rgba(0,0,0,0.1)] md:px-6">
        <button
          type="button"
          className="flex h-11 min-h-[44px] w-11 min-w-[44px] flex-col items-center justify-center gap-1 rounded-lg border-0 bg-transparent p-2.5 transition-colors hover:bg-gray-100"
          onClick={() => setDrawerOpen(true)}
          aria-label="เปิดเมนู"
        >
          <span className="block h-0.5 w-[22px] rounded-full bg-gray-800" />
          <span className="block h-0.5 w-[22px] rounded-full bg-gray-800" />
          <span className="block h-0.5 w-[22px] rounded-full bg-gray-800" />
        </button>
        <Link href="/home" className="flex-1 text-lg font-bold text-[#6B46C1] no-underline md:text-xl" onClick={closeDrawer}>
          MagicBiz-Card
        </Link>
      </div>

      <div
        className={`fixed inset-0 z-[200] bg-black/40 transition-all duration-300 ${drawerOpen ? 'visible opacity-100' : 'invisible opacity-0'}`}
        onClick={closeDrawer}
        onKeyDown={(e) => e.key === 'Escape' && closeDrawer()}
        role="button"
        tabIndex={0}
        aria-label="ปิดเมนู"
      />
      <div
        className={`fixed left-0 top-0 z-[201] flex h-screen w-[280px] max-w-[85vw] flex-col bg-white py-4 pl-4 pr-4 shadow-[4px_0_20px_rgba(0,0,0,0.15)] transition-transform duration-300 ease-out pt-[max(env(safe-area-inset-top),12px)] pl-[max(env(safe-area-inset-left),16px)] pb-[max(env(safe-area-inset-bottom),16px)] ${drawerOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="mb-3 px-1 text-xs uppercase tracking-wider text-gray-500">เมนู</div>
        {menuItems.map(({ path, label, icon }) => {
          const isActive = pathname === path || pathname?.startsWith(path + '/');
          return (
            <Link
              key={path}
              href={path}
              className={`mb-1 flex min-h-[44px] items-center gap-3 rounded-xl border-2 px-4 py-3.5 text-base font-medium no-underline transition-colors ${
                isActive
                  ? 'border-[#6B46C1] bg-[#EDE9FE] text-[#6B46C1]'
                  : 'border-transparent text-gray-800 hover:bg-gray-100'
              }`}
              onClick={closeDrawer}
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center">
                <Icon name={icon} />
              </span>
              {label}
            </Link>
          );
        })}
      </div>
    </>
  );
}
