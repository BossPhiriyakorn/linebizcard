'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getCmsHeaders, handleCmsResponse } from '../cmsApi';
import { useCmsAlert } from '../hooks/useCmsAlert';

export default function UsersPage() {
  const [alert, showAlert] = useCmsAlert();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

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
      <div className="mb-6 rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-5 py-4 font-semibold">รายการลูกค้า (ผู้ใช้งาน)</div>
        <div className="overflow-x-auto p-4 md:p-5">
          {loading ? (
            <div className="py-12 text-center text-slate-500">
              <p className="m-0">กำลังโหลด...</p>
            </div>
          ) : list.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <p className="m-0">ยังไม่มีผู้ใช้</p>
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
                {list.map((u, i) => {
                  const fullName = [u.first_name, u.last_name].filter(Boolean).join(' ') || '-';
                  return (
                    <tr key={u.id} className="hover:bg-slate-50">
                      <td className="border-b border-gray-200 px-3 py-2 md:px-4 md:py-3">{i + 1}</td>
                      <td className="border-b border-gray-200 px-3 py-2 md:px-4 md:py-3">{u.username || '-'}</td>
                      <td className="border-b border-gray-200 px-3 py-2 md:px-4 md:py-3">{u.email || '-'}</td>
                      <td className="border-b border-gray-200 px-3 py-2 md:px-4 md:py-3">{fullName}</td>
                      <td className="border-b border-gray-200 px-3 py-2 md:px-4 md:py-3">{u.phone || '-'}</td>
                      <td className="border-b border-gray-200 px-3 py-2 md:px-4 md:py-3">
                        {u.is_active !== false ? (
                          <span className="inline-block rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">ใช้งาน</span>
                        ) : (
                          <span className="inline-block rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">ระงับ</span>
                        )}
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
          )}
        </div>
      </div>
    </>
  );
}
