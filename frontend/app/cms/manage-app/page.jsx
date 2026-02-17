'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';

const TABS = [
  { id: 'settings', label: 'ตั้งค่า', path: '/cms/manage-app?tab=settings' },
  { id: 'packages', label: 'แพ็กเกจ', path: '/cms/manage-app?tab=packages' },
  { id: 'coupons', label: 'คูปอง', path: '/cms/manage-app?tab=coupons' },
];

const SettingsContent = dynamic(() => import('../components/SettingsContent'), { ssr: false });
const PackagesContent = dynamic(() => import('../components/PackagesContent'), { ssr: false });
const CouponsContent = dynamic(() => import('../components/CouponsContent'), { ssr: false });

function ManageAppContent() {
  const searchParams = useSearchParams();
  const tab = (searchParams?.get('tab') || 'settings').toLowerCase();
  const currentTab = TABS.some((t) => t.id === tab) ? tab : 'settings';

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900">จัดการแอป</h1>

      {/* เมนูสลับหน้าแบบ segmented control */}
      <div className="flex w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {TABS.map((t, i) => (
          <Link
            key={t.id}
            href={t.path}
            className={`flex flex-1 items-center justify-center px-5 py-3.5 text-center text-sm font-medium no-underline transition-colors ${
              i === 0 ? 'rounded-l-xl' : ''
            } ${i === TABS.length - 1 ? 'rounded-r-xl' : ''} ${
              i < TABS.length - 1 ? 'border-r border-gray-200' : ''
            } ${
              currentTab === t.id
                ? 'bg-[#c9a962]/15 text-[#b8960c] border-b-2 border-[#c9a962]'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {/* เนื้อหาตามแท็บ */}
      <div className="min-h-[200px]">
        {currentTab === 'settings' && <SettingsContent />}
        {currentTab === 'packages' && <PackagesContent />}
        {currentTab === 'coupons' && <CouponsContent />}
      </div>
    </div>
  );
}

export default function ManageAppPage() {
  return (
    <Suspense fallback={<div className="min-h-[200px] animate-pulse rounded bg-gray-100 p-6" />}>
      <ManageAppContent />
    </Suspense>
  );
}
