'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { getCmsHeaders, handleCmsResponse } from '../cmsApi';
import { useCmsAlert } from '../hooks/useCmsAlert';

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
      <div className="mb-3 flex h-11 w-11 items-center justify-center">
        {isImg ? (
          <img src={`/assets/icons/${icon}`} alt="" className="h-8 w-8 object-contain" />
        ) : (
          <span className="text-2xl">{icon}</span>
        )}
      </div>
      <div className="text-2xl font-bold text-[#b8960c] md:text-3xl">{value}</div>
      <div className="mt-1 text-sm text-slate-500">{label}</div>
    </div>
  );
}

export default function UsersPage() {
  const [alert, showAlert] = useCmsAlert();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'active' | 'pending' | 'suspended'
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef(null);
  const [stats, setStats] = useState({
    total_users: '-',
    verified_users: '-',
    pending_transfer_count: '-',
    suspended_users: '-',
  });

  const load = () => {
    setLoading(true);
    fetch('/api/cms/users', { headers: getCmsHeaders() })
      .then((r) => {
        if (handleCmsResponse(r)) return null;
        return r.json().catch(() => null);
      })
      .then((data) => {
        setLoading(false);
        if (data === null) {
          showAlert('โหลดรายการไม่สำเร็จ (การเชื่อมต่อหรือรูปแบบข้อมูลผิดพลาด)', 'error');
          return;
        }
        if (data.success === true && Array.isArray(data.data)) {
          setList(data.data);
          fetch('/api/cms/users/stats', { headers: getCmsHeaders() })
            .then((r) => (handleCmsResponse(r) ? null : r.json()))
            .then((statsData) => {
              if (statsData?.success && statsData?.data) {
                setStats({
                  total_users: statsData.data.total_users ?? '-',
                  verified_users: statsData.data.verified_users ?? '-',
                  pending_transfer_count: statsData.data.pending_transfer_count ?? '-',
                  suspended_users: statsData.data.suspended_users ?? '-',
                });
              }
            })
            .catch(() => {});
        } else if (data.success === true && data.data != null && !Array.isArray(data.data)) {
          setList([]);
        } else {
          setList([]);
          showAlert(data?.message || 'โหลดรายการไม่สำเร็จ', 'error');
        }
      })
      .catch(() => {
        setLoading(false);
        showAlert('โหลดรายการไม่สำเร็จ', 'error');
      });
  };

  useEffect(() => {
    fetch('/api/cms/users/stats', { headers: getCmsHeaders() })
      .then((r) => (handleCmsResponse(r) ? null : r.json()))
      .then((data) => {
        if (data?.success && data?.data) {
          setStats({
            total_users: data.data.total_users ?? '-',
            verified_users: data.data.verified_users ?? '-',
            pending_transfer_count: data.data.pending_transfer_count ?? '-',
            suspended_users: data.data.suspended_users ?? '-',
          });
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => load(), []);

  return (
    <>
      {alert.show && (
        <div
          className={`mb-4 rounded-md border px-4 py-3 ${
            alert.type === 'error'
              ? 'border-red-200 bg-red-50 text-red-800'
              : 'border-green-200 bg-green-50 text-green-800'
          }`}
        >
          {alert.msg}
        </div>
      )}

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon="team.png" value={stats.total_users} label="จำนวนผู้ใช้ทั้งหมด" />
        <StatCard icon="verified.png" value={stats.verified_users} label="ยืนยันตัวตนแล้ว" />
        <StatCard icon="hourglass.png" value={stats.pending_transfer_count} label="รอตรวจสอบยอดโอน" />
        <StatCard icon="prohibition.png" value={stats.suspended_users} label="ผู้ใช้โดนระงับ" />
      </div>

      <div className="mb-6 rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-gray-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <span className="font-semibold">รายการผู้ใช้งาน</span>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-slate-600">ค้นหา:</label>
              <input
                ref={searchInputRef}
                type="text"
                placeholder="ค้นหาชื่อผู้ใช้, อีเมล, เบอร์โทร..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full min-w-[200px] rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm text-slate-800 placeholder:text-slate-500 focus:border-[#c9a962] focus:outline-none focus:ring-2 focus:ring-[#c9a962]/20 sm:w-auto"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-slate-600">สถานะ:</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm focus:border-[#c9a962] focus:outline-none focus:ring-2 focus:ring-[#c9a962]/20"
              >
                <option value="all">ทั้งหมด</option>
                <option value="active">ใช้งาน</option>
                <option value="pending">รอตรวจสอบยอด</option>
                <option value="suspended">ระงับ</option>
              </select>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto p-4 md:p-5">
          {loading ? (
            <div className="py-12 text-center text-slate-500">
              <p className="m-0">กำลังโหลด...</p>
            </div>
          ) : (() => {
            let filteredList = statusFilter === 'all' ? list : statusFilter === 'active' ? list.filter((u) => u.is_active !== false && (u.pending_slip_count || 0) === 0) : statusFilter === 'pending' ? list.filter((u) => (u.pending_slip_count || 0) > 0) : list.filter((u) => u.is_active === false);
            if (searchQuery.trim()) {
              const query = searchQuery.trim().toLowerCase();
              filteredList = filteredList.filter((u) => {
                const username = (u.username || '').toLowerCase();
                const email = (u.email || '').toLowerCase();
                const phone = (u.phone || '').toLowerCase();
                const firstName = (u.first_name || '').toLowerCase();
                const lastName = (u.last_name || '').toLowerCase();
                const fullName = `${firstName} ${lastName}`.trim();
                return username.includes(query) || email.includes(query) || phone.includes(query) || fullName.includes(query);
              });
            }
            return filteredList.length === 0 ? (
              <div className="py-12 text-center text-slate-500">
                <p className="m-0">
                  {list.length === 0
                    ? 'ยังไม่มีผู้ใช้'
                    : searchQuery.trim()
                      ? 'ไม่พบผู้ใช้ที่ค้นหา'
                      : statusFilter === 'active'
                        ? 'ไม่มีผู้ใช้ที่ใช้งาน'
                        : statusFilter === 'pending'
                          ? 'ไม่มีผู้ใช้ที่รอตรวจสอบยอด'
                          : 'ไม่มีผู้ใช้ที่ระงับ'}
                </p>
              </div>
            ) : (
            <table className="w-full min-w-[600px] border-collapse">
              <thead>
                <tr>
                  <th className="border-b border-gray-200 bg-slate-50 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 md:px-4 md:py-3">ลำดับ</th>
                  <th className="border-b border-gray-200 bg-slate-50 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 md:px-4 md:py-3">ชื่อผู้ใช้</th>
                  <th className="border-b border-gray-200 bg-slate-50 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 md:px-4 md:py-3">อีเมล</th>
                  <th className="border-b border-gray-200 bg-slate-50 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 md:px-4 md:py-3">ชื่อ-นามสกุล</th>
                  <th className="border-b border-gray-200 bg-slate-50 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 md:px-4 md:py-3">เบอร์โทร</th>
                  <th className="border-b border-gray-200 bg-slate-50 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 md:px-4 md:py-3">สถานะ</th>
                  <th className="border-b border-gray-200 bg-slate-50 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 md:px-4 md:py-3">ยืนยันตน</th>
                  <th className="border-b border-gray-200 bg-slate-50 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 md:px-4 md:py-3">ลงทะเบียน</th>
                  <th className="border-b border-gray-200 bg-slate-50 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 md:px-4 md:py-3">ดำเนินการ</th>
                </tr>
              </thead>
              <tbody>
                {filteredList.map((u, i) => {
                  const fullName = [u.first_name, u.last_name].filter(Boolean).join(' ') || '-';
                  return (
                    <tr key={u.id} className="hover:bg-slate-50">
                      <td className="border-b border-gray-200 px-3 py-2 md:px-4 md:py-3">{i + 1}</td>
                      <td className="border-b border-gray-200 px-3 py-2 md:px-4 md:py-3">{u.username || '-'}</td>
                      <td className="border-b border-gray-200 px-3 py-2 md:px-4 md:py-3">{u.email || '-'}</td>
                      <td className="border-b border-gray-200 px-3 py-2 md:px-4 md:py-3">{fullName}</td>
                      <td className="border-b border-gray-200 px-3 py-2 md:px-4 md:py-3">{u.phone || '-'}</td>
                      <td className="border-b border-gray-200 px-3 py-2 md:px-4 md:py-3">
                        {u.is_active === false ? (
                          <span className="inline-block rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">ระงับ</span>
                        ) : (u.pending_slip_count > 0 ? (
                          <span className="inline-block rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">ตรวจสอบยอด</span>
                        ) : (
                          <span className="inline-block rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">ใช้งาน</span>
                        ))}
                      </td>
                      <td className="border-b border-gray-200 px-3 py-2 md:px-4 md:py-3">
                        {u.email_verified ? (
                          <span className="inline-block rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">ยืนยันแล้ว</span>
                        ) : (
                          <span className="inline-block rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">ยังไม่ยืนยัน</span>
                        )}
                      </td>
                      <td className="border-b border-gray-200 px-3 py-2 text-sm md:px-4 md:py-3">{u.created_at ? new Date(u.created_at).toLocaleDateString('th-TH') : '-'}</td>
                      <td className="border-b border-gray-200 px-3 py-2 md:px-4 md:py-3">
                        <Link
                          href={'/cms/users/' + u.id}
                          className="inline-flex items-center justify-center rounded-md bg-slate-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
                        >
                          รายละเอียด
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            );
          })()}
        </div>
      </div>
    </>
  );
}
