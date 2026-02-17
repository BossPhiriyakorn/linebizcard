'use client';

import { useEffect, useRef } from 'react';

/**
 * แถบแจ้งเตือนที่มีปุ่มปิด และปิดอัตโนมัติหลัง autoCloseMs มิลลิวินาที (0 = ไม่ปิดอัตโนมัติ)
 */
export default function AlertBanner({ show, msg, type = 'error', onClose, autoCloseMs = 5000, className = '' }) {
  const timeoutRef = useRef(null);

  useEffect(() => {
    if (!show || !msg || autoCloseMs <= 0 || !onClose) return;
    timeoutRef.current = setTimeout(onClose, autoCloseMs);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [show, msg, autoCloseMs, onClose]);

  if (!show || !msg) return null;

  const isError = type === 'error';
  const wrapperClass = isError
    ? 'border border-red-200 bg-red-50 text-red-800'
    : 'border border-green-200 bg-green-50 text-green-800';

  return (
    <div
      className={`mb-4 flex items-start justify-between gap-3 rounded-lg px-4 py-3 ${wrapperClass} ${className}`}
      role="alert"
    >
      <span className="min-w-0 flex-1">{msg}</span>
      <button
        type="button"
        onClick={onClose}
        className="shrink-0 rounded p-1.5 font-medium opacity-80 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-offset-1"
        aria-label="ปิด"
      >
        ปิด
      </button>
    </div>
  );
}
