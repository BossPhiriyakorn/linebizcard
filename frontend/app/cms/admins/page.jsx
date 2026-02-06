'use client';

import { useEffect, useState } from 'react';
import { getCmsHeaders, handleCmsResponse } from '../cmsApi';
import { useCmsAlert } from '../hooks/useCmsAlert';

export default function AdminsPage() {
  const [alert, showAlert] = useCmsAlert();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ username: '', email: '', password: '' });

  const load = () => {
    setLoading(true);
    fetch('/api/cms/admins', { headers: getCmsHeaders() })
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

  const openAdd = () => {
    setForm({ username: '', email: '', password: '' });
    setModalOpen(true);
  };

  const save = () => {
    const { username, email, password } = form;
    if (!username?.trim() || !email?.trim() || !password) {
      showAlert('กรุณากรอกชื่อผู้ใช้ อีเมล และรหัสผ่าน', 'error');
      return;
    }
    if (password.length < 6) {
      showAlert('รหัสผ่านอย่างน้อย 6 ตัวอักษร', 'error');
      return;
    }
    fetch('/api/cms/admins', {
      method: 'POST',
      headers: getCmsHeaders(),
      body: JSON.stringify({ username: username.trim(), email: email.trim(), password }),
    })
      .then((r) => {
        if (handleCmsResponse(r)) return null;
        return r.json().catch(() => null);
      })
      .then((data) => {
        if (data === null) return;
        if (data.success) {
          showAlert('สร้างแอดมินแล้ว', 'success');
          setModalOpen(false);
          load();
        } else showAlert(data?.message || 'สร้างไม่สำเร็จ', 'error');
      })
      .catch(() => showAlert('เกิดข้อผิดพลาด', 'error'));
  };

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
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 font-semibold">
          <span>รายการแอดมิน</span>
          <button
            type="button"
            className="inline-flex items-center justify-center gap-1.5 rounded-md bg-violet-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-800"
            onClick={openAdd}
          >
            + สร้างแอดมิน
          </button>
        </div>
        <div className="overflow-x-auto p-4 md:p-5">
          {loading ? (
            <div className="py-12 text-center text-slate-500">
              <p className="m-0">กำลังโหลด...</p>
            </div>
          ) : list.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <p className="m-0">ยังไม่มีแอดมิน</p>
            </div>
          ) : (
            <table className="w-full min-w-[600px] border-collapse">
              <thead>
                <tr>
                  <th className="border-b border-gray-200 bg-slate-50 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 md:px-4 md:py-3">ลำดับ</th>
                  <th className="border-b border-gray-200 bg-slate-50 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 md:px-4 md:py-3">ชื่อผู้ใช้</th>
                  <th className="border-b border-gray-200 bg-slate-50 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 md:px-4 md:py-3">อีเมล</th>
                  <th className="border-b border-gray-200 bg-slate-50 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 md:px-4 md:py-3">สถานะ</th>
                  <th className="border-b border-gray-200 bg-slate-50 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 md:px-4 md:py-3">สร้างเมื่อ</th>
                </tr>
              </thead>
              <tbody>
                {list.map((a, i) => (
                  <tr key={a.id} className="hover:bg-slate-50">
                    <td className="border-b border-gray-200 px-3 py-2 md:px-4 md:py-3">{i + 1}</td>
                    <td className="border-b border-gray-200 px-3 py-2 md:px-4 md:py-3">{a.username || '-'}</td>
                    <td className="border-b border-gray-200 px-3 py-2 md:px-4 md:py-3">{a.email || '-'}</td>
                    <td className="border-b border-gray-200 px-3 py-2 md:px-4 md:py-3">
                      {a.is_active !== false ? (
                        <span className="inline-block rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">ใช้งาน</span>
                      ) : (
                        <span className="inline-block rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">ระงับ</span>
                      )}
                    </td>
                    <td className="border-b border-gray-200 px-3 py-2 text-sm md:px-4 md:py-3">
                      {a.created_at ? new Date(a.created_at).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-5">
          <div className="w-full max-w-[420px] rounded-lg bg-white shadow-xl">
            <div className="border-b border-gray-200 px-5 py-4 font-semibold">สร้างแอดมินใหม่</div>
            <div className="p-5">
              <div className="mb-4">
                <label className="mb-1.5 block font-medium text-gray-800">ชื่อผู้ใช้ *</label>
                <input
                  className="w-full rounded-md border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-700/20"
                  placeholder="เช่น admin2"
                  value={form.username}
                  onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                />
              </div>
              <div className="mb-4">
                <label className="mb-1.5 block font-medium text-gray-800">อีเมล *</label>
                <input
                  type="email"
                  className="w-full rounded-md border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-700/20"
                  placeholder="admin2@magicbizcard.local"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                />
              </div>
              <div className="mb-4">
                <label className="mb-1.5 block font-medium text-gray-800">รหัสผ่าน * (อย่างน้อย 6 ตัวอักษร)</label>
                <input
                  type="password"
                  className="w-full rounded-md border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-700/20"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                />
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-300"
                  onClick={() => setModalOpen(false)}
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-md bg-violet-700 px-4 py-2 text-sm font-medium text-white hover:bg-violet-800"
                  onClick={save}
                >
                  สร้างแอดมิน
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
