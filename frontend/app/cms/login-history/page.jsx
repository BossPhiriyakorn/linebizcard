'use client';

import { useEffect, useState } from 'react';
import { getCmsHeaders, handleCmsResponse } from '../cmsApi';

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
    <>
      {alert && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-red-800">{alert}</div>
      )}
      <div className="mb-6 rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-5 py-4 font-semibold">รายการเข้าใช้งาน CMS</div>
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
            <table className="w-full min-w-[600px] border-collapse">
              <thead>
                <tr>
                  <th className="border-b border-gray-200 bg-slate-50 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 md:px-4 md:py-3">ลำดับ</th>
                  <th className="border-b border-gray-200 bg-slate-50 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 md:px-4 md:py-3">ชื่อผู้ใช้</th>
                  <th className="border-b border-gray-200 bg-slate-50 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 md:px-4 md:py-3">อีเมล</th>
                  <th className="border-b border-gray-200 bg-slate-50 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 md:px-4 md:py-3">เวลาเข้าใช้งาน</th>
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
                      {row.login_at ? new Date(row.login_at).toLocaleString('th-TH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '-'}
                    </td>
                    <td className="border-b border-gray-200 px-3 py-2 md:px-4 md:py-3">{row.ip_address || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
