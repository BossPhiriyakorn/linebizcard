'use client';

import { useEffect, useState } from 'react';
import { getCmsHeaders, handleCmsResponse } from '../cmsApi';

const glassCard = {
  background: 'rgba(255,255,255,0.75)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: '1px solid rgba(255,255,255,0.8)',
};

function typeLabel(type) {
  const t = type || '';
  if (t === 'new_signup') return 'ลูกค้าสมัครใหม่';
  if (t === 'payment_done') return 'ลูกค้าชำระเงิน';
  if (t === 'payment_pending_review') return 'ลูกค้ารอตรวจสอบยอดชำระ';
  if (t === 'admin_login') return 'การเข้าใช้งานของแอดมิน';
  if (t === 'coupon_used') return 'การใช้งานคูปองของลูกค้า';
  if (t === 'card_expired') return 'การ์ดหมดอายุ';
  if (t === 'card_expiring') return 'การ์ดใกล้หมดอายุ';
  if (t === 'other') return 'การแจ้งเตือนอื่นๆ';
  return 'แจ้งเตือน';
}

/** แจ้งเตือน — ใช้ข้อมูลเดียวกันกับหน้าแดชบอร์ด (API /api/cms/notifications) */
function NotificationsCard() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/cms/notifications', { headers: getCmsHeaders() })
      .then((r) => {
        if (handleCmsResponse(r)) return null;
        return r.json();
      })
      .then((data) => {
        setLoading(false);
        if (data?.success && Array.isArray(data.data)) setList(data.data);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="rounded-2xl p-4 shadow-md md:p-5" style={glassCard}>
      <div className="mb-3 flex items-center gap-2 text-lg font-semibold text-gray-800">
        <span>🔔</span> แจ้งเตือน
      </div>
      <div className="max-h-[320px] overflow-y-auto pr-1">
        {loading && <p className="py-4 text-center text-sm text-slate-500">กำลังโหลด...</p>}
        {!loading && list.length === 0 && (
          <p className="py-4 text-center text-sm text-slate-500">ยังไม่มีแจ้งเตือน</p>
        )}
        {!loading && list.length > 0 && (
          <ul className="space-y-2">
            {list.map((n) => (
              <li key={n.id} className="rounded-xl border border-slate-100 bg-white/60 p-3">
                <div className="min-w-0 flex-1">
                  <span className="inline-block rounded bg-[#c9a962]/15 px-1.5 py-0.5 text-xs font-medium text-[#b8960c]">
                    {typeLabel(n.notification_type)}
                  </span>
                  <p className="mt-1 text-sm font-medium text-gray-800">{n.title}</p>
                  {n.message && <p className="mt-0.5 text-xs text-slate-600 line-clamp-2">{n.message}</p>}
                  <p className="mt-1 text-xs text-slate-400">
                    {n.created_at ? new Date(n.created_at).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' }) : ''}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default function LoginHistoryPage() {
  const [list, setList] = useState([]);
  const [alert, setAlert] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setAlert('');
    fetch('/api/cms/login-history', { headers: getCmsHeaders() })
      .then((r) => {
        if (handleCmsResponse(r)) return null;
        return r.json().catch(() => null);
      })
      .then((data) => {
        setLoading(false);
        if (data === null) {
          setAlert('โหลดประวัติไม่สำเร็จ (การเชื่อมต่อหรือรูปแบบข้อมูลผิดพลาด)');
          return;
        }
        if (data.success === true && Array.isArray(data.data)) {
          setList(data.data);
        } else if (data.success === true && data.data != null && !Array.isArray(data.data)) {
          setList([]);
        } else {
          setList([]);
          setAlert(data?.message || 'โหลดประวัติไม่สำเร็จ');
        }
      })
      .catch((err) => {
        console.error('Login history fetch error:', err);
        setLoading(false);
        setAlert('โหลดประวัติไม่สำเร็จ');
      });
  }, []);

  return (
    <div className="w-full min-w-0 space-y-6">
      {alert && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-red-800">{alert}</div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* คอลัมน์ซ้าย: รายการเข้าใช้งานของแอดมิน */}
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-5 py-4 font-semibold">รายการเข้าใช้งานของแอดมิน</div>
          <div className="overflow-x-auto p-4 md:p-5">
            {loading ? (
              <div className="py-12 text-center text-slate-500">
                <p className="m-0">กำลังโหลด...</p>
              </div>
            ) : list.length === 0 ? (
              <div className="py-12 text-center text-slate-500">
                <p className="m-0">ยังไม่มีประวัติการเข้าใช้งาน</p>
              </div>
            ) : (
              <table className="w-full min-w-[400px] border-collapse">
                <thead>
                  <tr>
                    <th className="border-b border-gray-200 bg-slate-50 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 md:px-4 md:py-3">ลำดับ</th>
                    <th className="border-b border-gray-200 bg-slate-50 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 md:px-4 md:py-3">ชื่อผู้ใช้</th>
                    <th className="border-b border-gray-200 bg-slate-50 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 md:px-4 md:py-3">อีเมล</th>
                    <th className="border-b border-gray-200 bg-slate-50 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 md:px-4 md:py-3">เวลา</th>
                    <th className="border-b border-gray-200 bg-slate-50 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 md:px-4 md:py-3">IP</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((row, i) => (
                    <tr key={row.id} className="hover:bg-slate-50">
                      <td className="border-b border-gray-200 px-3 py-2 md:px-4 md:py-3">{i + 1}</td>
                      <td className="border-b border-gray-200 px-3 py-2 md:px-4 md:py-3">{row.username || '-'}</td>
                      <td className="border-b border-gray-200 px-3 py-2 md:px-4 md:py-3">{row.email || '-'}</td>
                      <td className="border-b border-gray-200 px-3 py-2 text-sm md:px-4 md:py-3">
                        {row.login_at ? new Date(row.login_at).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' }) : '-'}
                      </td>
                      <td className="border-b border-gray-200 px-3 py-2 text-xs md:px-4 md:py-3">{row.ip_address || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* คอลัมน์ขวา: แจ้งเตือน (ข้อมูลเดียวกับแดชบอร์ด) */}
        <NotificationsCard />
      </div>
    </div>
  );
}
