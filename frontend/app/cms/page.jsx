'use client';

import { useEffect, useState } from 'react';
import { getCmsHeaders, handleCmsResponse } from './cmsApi';
const cardConfig = [
  { key: 'templates_count', label: 'จำนวนแทมเพลต', icon: 'flash-card.png' },
  { key: 'users_count', label: 'จำนวนผู้ใช้งาน', icon: 'team.png' },
  { key: 'cards_count', label: 'จำนวนการ์ดที่สร้าง', icon: 'id-card.png' },
  { key: 'notifications_count', label: 'แจ้งเตือนใหม่', icon: 'bell.png' },
];

const glassCard = {
  background: 'rgba(255,255,255,0.75)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  border: '1px solid rgba(255,255,255,0.8)',
};

function StatCard({ icon, value, label }) {
  const isImg = typeof icon === 'string' && icon.endsWith('.png');
  return (
    <div
      className="relative flex min-w-0 flex-col rounded-2xl p-5 shadow-md md:p-6"
      style={glassCard}
    >
      <div className="mb-3 flex items-center justify-center h-11 w-11">
        {isImg ? (
          <img src={`/assets/icons/${icon}`} alt="" className="h-8 w-8 object-contain" />
        ) : (
          <span className="text-2xl">{icon}</span>
        )}
      </div>
      <div className="text-2xl font-bold text-[#b8960c] md:text-3xl">
        {value}
      </div>
      <div className="mt-1 text-sm text-slate-500">{label}</div>
    </div>
  );
}

/** ปฏิทินเดือนนี้ + วันหยุดจาก Nager.Date API (ฟรี) */
function CalendarCard() {
  const [holidays, setHolidays] = useState([]);
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startBlank = firstDay.getDay();
  const daysInMonth = lastDay.getDate();

  useEffect(() => {
    fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/TH`)
      .then((r) => r.json())
      .then((data) => setHolidays(Array.isArray(data) ? data : []))
      .catch(() => setHolidays([]));
  }, [year]);

  const monthNames = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
  const dayNames = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
  const thisMonthHolidays = holidays.filter((h) => {
    const d = new Date(h.date);
    return d.getMonth() === month && d.getFullYear() === year;
  });
  const holidayDates = new Set(thisMonthHolidays.map((h) => h.date));

  const today = now.getDate();
  const isCurrentMonth = now.getFullYear() === year && now.getMonth() === month;

  const totalCells = 42;
  const allDays = [];
  for (let i = 0; i < startBlank; i++) allDays.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const isToday = isCurrentMonth && d === today;
    allDays.push({ day: d, dateStr, isHoliday: holidayDates.has(dateStr), isToday });
  }
  while (allDays.length < totalCells) allDays.push(null);

  return (
    <div className="rounded-2xl p-4 shadow-md md:p-5" style={glassCard}>
      <div className="mb-3 flex items-center gap-2 text-lg font-semibold text-gray-800">
        <span>📅</span> ปฏิทินเดือนนี้
      </div>
      <p className="mb-3 text-sm text-slate-600">{monthNames[month]} {year}</p>
      <div className="grid grid-cols-7 gap-0.5 text-center text-xs">
        {dayNames.map((name) => (
          <div key={name} className="py-1 font-medium text-slate-500">{name}</div>
        ))}
        {allDays.map((cell, i) => (
          <div
            key={i}
            className={`flex min-h-[28px] items-center justify-center py-1 ${cell ? (cell.isToday ? 'text-gray-800 font-semibold' : cell.isHoliday ? 'bg-amber-100 text-amber-800 font-medium' : 'text-gray-700') : ''}`}
          >
            {cell ? (
              <span
                className={`inline-flex h-7 w-7 items-center justify-center rounded-full ${cell.isToday ? 'bg-[#c9a962] text-[#0c1222] ring-2 ring-[#c9a962]/50 ring-offset-1' : ''}`}
              >
                {cell.day}
              </span>
            ) : (
              ''
            )}
          </div>
        ))}
      </div>
      {thisMonthHolidays.length > 0 && (
        <div className="mt-3 border-t border-slate-200 pt-2">
          <p className="mb-1 text-xs font-medium text-slate-500">วันหยุดในเดือนนี้</p>
          <ul className="space-y-0.5 text-xs text-slate-600">
            {thisMonthHolidays.slice(0, 5).map((h) => (
              <li key={h.date}>{h.localName || h.name} ({h.date})</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/** การ์ดแจ้งเตือนแบบเลื่อนได้ */
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

  const typeLabel = (type) => {
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
  };

  return (
    <div className="rounded-2xl p-4 shadow-md md:p-5" style={glassCard}>
      <div className="mb-3 flex items-center gap-2 text-lg font-semibold text-gray-800">
        <span>🔔</span> แจ้งเตือน
      </div>
      <div className="max-h-[280px] overflow-y-auto pr-1">
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

export default function DashboardPage() {
  const [stats, setStats] = useState({
    users_count: '-',
    templates_count: '-',
    cards_count: '-',
    notifications_count: '-',
  });
  const [alert, setAlert] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setAlert('');
    fetch('/api/cms/dashboard', { headers: getCmsHeaders() })
      .then((r) => {
        if (handleCmsResponse(r)) return null;
        return r.json();
      })
      .then((data) => {
        setLoading(false);
        if (!data) return;
        if (data.success && data.data) {
          setStats({
            users_count: data.data.users_count ?? '-',
            templates_count: data.data.templates_count ?? '-',
            cards_count: data.data.cards_count ?? '-',
            notifications_count: data.data.notifications_count ?? '-',
          });
        } else {
          setAlert(data.message || 'โหลดข้อมูลไม่สำเร็จ');
        }
      })
      .catch(() => {
        setLoading(false);
        setAlert('โหลดข้อมูลไม่สำเร็จ');
      });
  }, []);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'สวัสดีตอนเช้า';
    if (h < 18) return 'สวัสดีตอนบ่าย';
    return 'สวัสดีตอนเย็น';
  };

  return (
    <div className="w-full min-w-0" style={{ width: '100%' }}>
      {alert && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-800">
          {alert}
        </div>
      )}

      <h1 className="mb-6 text-2xl font-bold text-gray-800 md:text-3xl">
        {greeting()}, ยินดีต้อนรับ!
      </h1>

      {loading && (
        <div className="py-12 text-center text-slate-500">
          <p className="m-0 mb-4">กำลังโหลด...</p>
        </div>
      )}

      {!loading && (
        <>
          <div className="cms-dashboard-grid">
            {cardConfig.map(({ key, label, icon }) => (
              <StatCard key={key} icon={icon} value={stats[key]} label={label} />
            ))}
          </div>

          {/* การ์ดปฏิทิน + การ์ดแจ้งเตือน (แถวที่สอง) */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <CalendarCard />
            <NotificationsCard />
          </div>
        </>
      )}
    </div>
  );
}
