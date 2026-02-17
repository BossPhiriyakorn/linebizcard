'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMembershipStatus } from '../hooks/useMembershipStatus';

const SIDEBAR_BG = '#0c1222';
const SIDEBAR_ACTIVE_BG = 'rgba(201, 169, 98, 0.15)';
const SIDEBAR_ACTIVE_BAR = '#c9a962';

const menuItems = [
  { path: '/home', label: 'หน้าแรก', icon: 'home.png', requiresActiveMembership: false },
  { path: '/my-cards', label: 'การ์ดของฉัน', icon: 'identification-card.png', requiresActiveMembership: true },
  { path: '/create', label: 'สร้างการ์ด', icon: 'new.png', requiresActiveMembership: true },
  { path: '/package', label: 'แพ็กเกจ', icon: 'crown.png', requiresActiveMembership: false },
  { path: '/profile', label: 'โปรไฟล์', icon: 'user.png', requiresActiveMembership: false },
];

export default function CustomerAppBar({ hideMenu = false }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = usePathname();
  const { isExpired, profile } = useMembershipStatus();

  const closeDrawer = () => setDrawerOpen(false);

  const displayName = profile
    ? [profile.first_name, profile.last_name].filter(Boolean).join(' ') || profile.username || 'ผู้ใช้'
    : 'ผู้ใช้';
  const subtitle = profile?.membership?.package_name ? `สมาชิก ${profile.membership.package_name}` : 'สมาชิก MagicBiz-Card';

  const handleMenuItemClick = (e, item) => {
    if (item.requiresActiveMembership && isExpired) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
    closeDrawer();
  };

  return (
    <>
      <div className="sticky top-0 z-[100] mb-4 flex items-center gap-3 rounded-xl bg-white px-4 py-3 shadow-[0_2px_12px_rgba(0,0,0,0.08),0_0_0_1px_rgba(201,169,98,0.1)] md:px-6">
        {!hideMenu && (
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
        )}
        <Link href="/home" className="flex-1 text-lg font-bold text-[#c9a962] no-underline md:text-xl" onClick={closeDrawer}>
          MagicBiz-Card
        </Link>
      </div>

      {!hideMenu && (
        <>
          <div
            className={`fixed inset-0 z-[200] bg-black/40 transition-all duration-300 ${drawerOpen ? 'visible opacity-100' : 'invisible opacity-0'}`}
            onClick={closeDrawer}
            onKeyDown={(e) => e.key === 'Escape' && closeDrawer()}
            role="button"
            tabIndex={0}
            aria-label="ปิดเมนู"
          />
          <div
            className={`fixed left-0 top-0 z-[201] flex h-screen w-[280px] max-w-[85vw] flex-col shadow-[4px_0_24px_rgba(0,0,0,0.25)] transition-transform duration-300 ease-out pt-[max(env(safe-area-inset-top),12px)] pl-[max(env(safe-area-inset-left),16px)] pb-[max(env(safe-area-inset-bottom),16px)] ${drawerOpen ? 'translate-x-0' : '-translate-x-full'}`}
            style={{ backgroundColor: SIDEBAR_BG }}
          >
            {/* ชื่อแอป (กึ่งกลาง) */}
            <div className="mb-6 flex justify-center px-2">
              <span className="text-lg font-bold text-[#f1f5f9]">MagicBiz-Card</span>
            </div>

            {/* โปรไฟล์ผู้ใช้ */}
            <div className="mb-6 flex flex-col items-center px-2 text-center">
              <div className="mb-2 flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#c9a962]/90 shadow-md ring-2 ring-[#c9a962]/40">
                {profile?.profile_image_url ? (
                  <img src={profile.profile_image_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-xl font-bold text-white">
                    {displayName ? displayName.charAt(0).toUpperCase() : '?'}
                  </span>
                )}
              </div>
              <p className="text-base font-bold text-[#f1f5f9]">{displayName}</p>
              <p className="text-xs text-[#94a3b8]">{subtitle}</p>
            </div>

            {/* เมนู */}
            <nav className="flex-1 space-y-0.5 px-2">
              {menuItems.map((item) => {
                const { path, label, icon, requiresActiveMembership } = item;
                const isActive = pathname === path || pathname?.startsWith(path + '/');
                const isDisabled = requiresActiveMembership && isExpired;

                if (isDisabled) {
                  return (
                    <div
                      key={path}
                      className="relative flex min-h-[44px] items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-[#94a3b8] cursor-not-allowed opacity-70"
                      title="ยังไม่ได้สมัครแพ็กเกจ กรุณาสมัครแพ็กเกจเพื่อใช้งาน"
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center">
                        <img src={`/assets/icons/${icon}`} alt="" className="h-6 w-6 object-contain" />
                      </span>
                      {label}
                    </div>
                  );
                }

                return (
                  <Link
                    key={path}
                    href={path}
                    className={`relative flex min-h-[44px] items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium no-underline transition-colors ${
                      isActive ? 'text-[#f1f5f9]' : 'text-[#cbd5e1] hover:bg-[#c9a962]/10 hover:text-[#f1f5f9]'
                    }`}
                    style={isActive ? { backgroundColor: SIDEBAR_ACTIVE_BG } : {}}
                    onClick={(e) => handleMenuItemClick(e, item)}
                  >
                    {isActive && (
                      <span
                        className="absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-r"
                        style={{ backgroundColor: SIDEBAR_ACTIVE_BAR, width: 4 }}
                        aria-hidden
                      />
                    )}
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center pl-1">
                      <img src={`/assets/icons/${icon}`} alt="" className="h-6 w-6 object-contain" />
                    </span>
                    {label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </>
      )}
    </>
  );
}
