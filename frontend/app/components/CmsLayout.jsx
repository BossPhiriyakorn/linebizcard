'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { path: '/cms', label: 'แดชบอร์ด', icon: '📊' },
  { path: '/cms/templates', label: 'จัดการแทมเพลต', icon: '📄' },
  { path: '/cms/users', label: 'จัดการผู้ใช้', icon: '👥' },
  { path: '/cms/admins', label: 'จัดการแอดมิน', icon: '🔐' },
  { path: '/cms/login-history', label: 'ประวัติการเข้าใช้งาน', icon: '📋' },
  { path: '/cms/manage-app', label: 'จัดการแอป', icon: '⚙️' },
];

export default function CmsLayout({ children }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen w-full bg-slate-100" data-cms style={{ minHeight: '100vh', background: 'linear-gradient(160deg, #f0f4ff 0%, #e8ecf4 50%, #f1f5f9 100%)' }}>
      {/* Top bar - Glassmorphism */}
      <header
        className="sticky top-0 z-50 flex items-center gap-4 border-b border-white/40 px-4 py-3 shadow-sm backdrop-blur-md md:px-6"
        style={{ background: 'rgba(255,255,255,0.72)', WebkitBackdropFilter: 'blur(12px)', backdropFilter: 'blur(12px)' }}
      >
        {/* Left: Logo (มือถือ) หรือ Logo + ชื่อ (เดสก์ท็อป) */}
        <Link href="/cms" className="flex shrink-0 items-center gap-2 no-underline">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-600 text-lg text-white shadow-md transition-transform duration-200 hover:scale-105">
            📊
          </div>
          <span className="hidden font-bold text-gray-800 md:inline">MagicBiz-Card CMS</span>
        </Link>

        {/* Center: ชื่อแอป (มือถือ/แท็บเล็ต) อยู่ตรงกลางบาร์ */}
        <div className="flex flex-1 justify-center md:hidden">
          <span className="font-bold text-gray-800">MagicBiz-Card CMS</span>
        </div>

        {/* Nav center - horizontal (เดสก์ท็อปเท่านั้น) */}
        <nav className="hidden flex-1 flex-wrap items-center justify-center gap-1 md:flex">
          {navItems.map(({ path, label, icon }) => {
            const isActive = path === '/cms' ? pathname === '/cms' : pathname?.startsWith(path);
            return (
              <Link
                key={path}
                href={path}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium no-underline transition-all duration-200 ${
                  isActive ? 'bg-white text-violet-700 shadow-md' : 'text-slate-600 hover:bg-white/60 hover:text-violet-600'
                }`}
              >
                <span className="text-base opacity-90">{icon}</span>
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
        className={`fixed top-[52px] left-0 right-0 z-40 max-h-[calc(100vh-52px)] overflow-y-auto border-b border-white/40 bg-white/90 shadow-xl backdrop-blur-md transition-all duration-300 md:hidden ${
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
                  isActive ? 'bg-violet-100 text-violet-700' : 'text-gray-700 hover:bg-slate-100'
                }`}
              >
                <span className="text-lg">{icon}</span>
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
