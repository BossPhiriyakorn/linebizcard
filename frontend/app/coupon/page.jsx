'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CouponPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/package');
  }, [router]);
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <p className="text-gray-500">กำลังนำทาง...</p>
    </div>
  );
}
