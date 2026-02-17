'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { path: '/cms', label: 'แดชบอร์ด', icon: 'dashboard.png' },
  { path: '/cms/templates', label: 'จัดการแทมเพลต', icon: 'flash-card.png' },
  { path: '/cms/users', label: 'จัดการผู้ใช้', icon: 'project-management.png' },
  { path: '/cms/admins', label: 'จัดการแอดมิน', icon: 'admin.png' },
  { path: '/cms/login-history', label: 'ประวัติ', icon: 'history.png' },
  { path: '/cms/manage-app', label: 'ตั้งค่า', icon: 'settings.png' },
];

export default function CmsLayout({ children }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen w-full bg-slate-100" data-cms style={{ minHeight: '100vh', background: 'linear-gradient(160deg, #f8f6f0 0%, #eee9e0 50%, #f1f5f9 100%)' }}>
      {/* Top bar - โทนหรู ลักชู */}
      <header
        className="sticky top-0 z-50 flex items-center gap-4 border-b border-[#c9a962]/20 px-4 py-3 shadow-sm backdrop-blur-md md:px-6"
        style={{ background: 'rgba(255,255,255,0.85)', WebkitBackdropFilter: 'blur(12px)', backdropFilter: 'blur(12px)', boxShadow: '0 1px 0 0 rgba(201,169,98,0.1)' }}
      >
        {/* ซ้าย: ชื่อแอป (ไม่มีโลโก้) */}
        <Link href="/cms" className="shrink-0 font-bold text-gray-800 no-underline hover:text-[#b8960c]">
          <span className="hidden md:inline">MagicBiz-Card CMS</span>
        </Link>
        {/* มือถือ: ชื่อแอปตรงกลาง */}
        <div className="flex flex-1 justify-center md:hidden">
          <span className="font-bold text-gray-800">MagicBiz-Card CMS</span>
        </div>
        {/* Nav - horizontal (เดสก์ท็อป) */}
        <nav className="hidden flex-1 flex-wrap items-center justify-center gap-1 md:flex">
          {navItems.map(({ path, label, icon }) => {
            const isActive = path === '/cms' ? pathname === '/cms' : pathname?.startsWith(path);
            return (
              <Link
                key={path}
                href={path}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium no-underline transition-all duration-200 ${
                  isActive ? 'bg-[#c9a962]/15 text-[#b8960c] shadow-md border border-[#c9a962]/30' : 'text-slate-600 hover:bg-[#c9a962]/10 hover:text-[#b8960c]'
                }`}
              >
                <img src={`/assets/icons/${icon}`} alt="" className="h-5 w-5 shrink-0 object-contain" />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Right: มือถือ = แฮมเบอร์เกอร์เท่านั้น, เดสก์ท็อป = ออกจากระบบ */}
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-white/60 text-gray-700 transition-all hover:bg-white md:hidden"
            onClick={() => setMobileMenuOpen((o) => !o)}
            aria-label="เมนู"
            aria-expanded={mobileMenuOpen}
          >
            ☰
          </button>
          <Link
            href="/cms/logout"
            className="hidden items-center justify-center gap-1.5 rounded-lg bg-white/80 px-3 py-2 text-sm font-medium text-gray-700 no-underline shadow-sm transition-all duration-200 hover:bg-white hover:shadow md:inline-flex"
          >
            ออกจากระบบ
          </Link>
        </div>
      </header>

      {/* Mobile menu dropdown */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm md:hidden"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden
        />
      )}
      <div
        className={`fixed top-[52px] left-0 right-0 z-40 max-h-[calc(100vh-52px)] overflow-y-auto border-b border-[#c9a962]/20 bg-white/95 shadow-xl backdrop-blur-md transition-all duration-300 md:hidden ${
          mobileMenuOpen ? 'opacity-100 visible' : 'opacity-0 invisible'
        }`}
        style={{ background: 'rgba(255,255,255,0.92)' }}
      >
        <nav className="flex flex-col p-3">
          {navItems.map(({ path, label, icon }) => {
            const isActive = path === '/cms' ? pathname === '/cms' : pathname?.startsWith(path);
            return (
              <Link
                key={path}
                href={path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium no-underline transition-colors ${
                  isActive ? 'bg-[#c9a962]/15 text-[#b8960c]' : 'text-gray-700 hover:bg-slate-100'
                }`}
              >
                <img src={`/assets/icons/${icon}`} alt="" className="h-6 w-6 shrink-0 object-contain" />
                {label}
              </Link>
            );
          })}
          {/* ออกจากระบบอยู่ในเมนู (มือถือ/แท็บเล็ต) */}
          <div className="mt-2 border-t border-slate-200 pt-2">
            <Link
              href="/cms/logout"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-red-600 no-underline transition-colors hover:bg-red-50"
            >
              <span className="text-lg">🚪</span>
              ออกจากระบบ
            </Link>
          </div>
        </nav>
      </div>

      {/* Main content */}
      <main className="min-w-0 flex-1 p-4 md:p-6">
        {children}
      </main>
    </div>
  );
}
