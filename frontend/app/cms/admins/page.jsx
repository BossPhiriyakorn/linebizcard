'use client';

import { useEffect, useState } from 'react';
import { getCmsHeaders, handleCmsResponse } from '../cmsApi';
import { useCmsAlert } from '../hooks/useCmsAlert';

export default function AdminsPage() {
  const [alert, showAlert] = useCmsAlert();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [me, setMe] = useState(null);
  const [form, setForm] = useState({
    username: '',
    full_name: '',
    nickname: '',
    email: '',
    password: '',
    is_active: true,
    view_only: true,
    can_delete_admins: false,
    can_manage_users: false,
  });

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

  useEffect(() => {
    fetch('/api/cms/me', { headers: getCmsHeaders() })
      .then((r) => (handleCmsResponse(r) ? null : r.json()))
      .then((data) => {
        if (data?.success && data?.data) setMe(data.data);
      })
      .catch(() => {});
  }, []);

  useEffect(() => load(), []);

  const openAdd = () => {
    setEditingId(null);
    setForm({
      username: '',
      full_name: '',
      nickname: '',
      email: '',
      password: '',
      is_active: true,
      view_only: false,
      can_delete_admins: false,
      can_manage_users: true,
    });
    setModalOpen(true);
  };

  const openEdit = (a) => {
    setEditingId(a.id);
    setForm({
      username: a.username || '',
      full_name: a.full_name || '',
      nickname: a.nickname || '',
      email: a.email || '',
      password: '',
      is_active: a.is_active !== false,
      view_only: a.permissions?.view_only !== false,
      can_delete_admins: a.permissions?.can_delete_admins === true,
      can_manage_users: a.permissions?.can_manage_users === true,
    });
    setModalOpen(true);
  };

  const save = () => {
    const { username, full_name, nickname, email, password } = form;
    // เมื่อสร้างแอดมินใหม่: สิทธิ์เต็ม (view_only: false, can_manage_users: true) แต่ห้ามลบแอดมินคนแรก (can_delete_admins: false)
    // เมื่อแก้ไข: ใช้ permissions จาก form (แต่ซ่อน UI ไว้)
    const perms = editingId
      ? { view_only: form.view_only === true, can_delete_admins: form.can_delete_admins === true, can_manage_users: form.can_manage_users === true }
      : { view_only: false, can_delete_admins: false, can_manage_users: true };
    if (editingId) {
      fetch('/api/cms/admins/' + editingId, {
        method: 'PUT',
        headers: getCmsHeaders(),
        body: JSON.stringify({
          username: username?.trim() || undefined,
          full_name: full_name?.trim() || null,
          nickname: nickname?.trim() || null,
          permissions: perms,
          is_active: form.is_active,
        }),
      })
        .then((r) => (handleCmsResponse(r) ? null : r.json().catch(() => null)))
        .then((data) => {
          if (data === null) return;
          if (data.success) {
            showAlert('แก้ไขแอดมินแล้ว', 'success');
            setModalOpen(false);
            setEditingId(null);
            load();
          } else showAlert(data?.message || 'แก้ไขไม่สำเร็จ', 'error');
        })
        .catch(() => showAlert('เกิดข้อผิดพลาด', 'error'));
      return;
    }
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
      body: JSON.stringify({
        username: username.trim(),
        full_name: full_name?.trim() || null,
        nickname: nickname?.trim() || null,
        email: email.trim(),
        password,
        permissions: perms,
      }),
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

  const onDelete = (id) => {
    if (!confirm('ต้องการลบแอดมินคนนี้ใช่หรือไม่?')) return;
    fetch('/api/cms/admins/' + id, { method: 'DELETE', headers: getCmsHeaders() })
      .then((r) => (handleCmsResponse(r) ? null : r.json()))
      .then((data) => {
        if (data === null) return;
        if (data.success) {
          showAlert('ลบแอดมินแล้ว', 'success');
          load();
        } else showAlert(data?.message || 'ลบไม่สำเร็จ', 'error');
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
            <table className="w-full min-w-[800px] border-collapse">
              <thead>
                <tr>
                  <th className="border-b border-gray-200 bg-slate-50 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 md:px-4 md:py-3">ลำดับ</th>
                  <th className="border-b border-gray-200 bg-slate-50 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 md:px-4 md:py-3">ชื่อผู้ใช้</th>
                  <th className="border-b border-gray-200 bg-slate-50 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 md:px-4 md:py-3">ชื่อ-นามสกุล</th>
                  <th className="border-b border-gray-200 bg-slate-50 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 md:px-4 md:py-3">ชื่อเล่น</th>
                  <th className="border-b border-gray-200 bg-slate-50 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 md:px-4 md:py-3">อีเมล</th>
                  <th className="border-b border-gray-200 bg-slate-50 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 md:px-4 md:py-3">สถานะ</th>
                  <th className="border-b border-gray-200 bg-slate-50 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 md:px-4 md:py-3">สร้างเมื่อ</th>
                  <th className="border-b border-gray-200 bg-slate-50 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 md:px-4 md:py-3">ดำเนินการ</th>
                </tr>
              </thead>
              <tbody>
                {list.map((a, i) => (
                  <tr key={a.id} className="hover:bg-slate-50">
                    <td className="border-b border-gray-200 px-3 py-2 md:px-4 md:py-3">{i + 1}</td>
                    <td className="border-b border-gray-200 px-3 py-2 md:px-4 md:py-3">{a.username || '-'}</td>
                    <td className="border-b border-gray-200 px-3 py-2 md:px-4 md:py-3">{a.full_name || '-'}</td>
                    <td className="border-b border-gray-200 px-3 py-2 md:px-4 md:py-3">{a.nickname || '-'}</td>
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
                    <td className="border-b border-gray-200 px-3 py-2 md:px-4 md:py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        {me?.permissions?.can_manage_users && (
                          <button
                            type="button"
                            className="inline-flex items-center justify-center rounded-md bg-slate-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
                            onClick={() => openEdit(a)}
                          >
                            แก้ไข
                          </button>
                        )}
                        {me?.permissions?.can_delete_admins && me?.id !== a.id && (
                          <button
                            type="button"
                            className="inline-flex items-center justify-center rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
                            onClick={() => onDelete(a.id)}
                          >
                            ลบ
                          </button>
                        )}
                      </div>
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
            <div className="border-b border-gray-200 px-5 py-4 font-semibold">{editingId ? 'แก้ไขแอดมิน' : 'สร้างแอดมินใหม่'}</div>
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
                <label className="mb-1.5 block font-medium text-gray-800">ชื่อจริงนามสกุล</label>
                <input
                  className="w-full rounded-md border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-700/20"
                  placeholder="เช่น สมชาย ใจดี"
                  value={form.full_name}
                  onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                />
              </div>
              <div className="mb-4">
                <label className="mb-1.5 block font-medium text-gray-800">ชื่อเล่นแอดมิน</label>
                <input
                  className="w-full rounded-md border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-700/20"
                  placeholder="เช่น แอดมินบอส"
                  value={form.nickname}
                  onChange={(e) => setForm((f) => ({ ...f, nickname: e.target.value }))}
                />
              </div>
              {!editingId && (
                <>
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
                </>
              )}
              {editingId && (
                <>
                  <div className="mb-4 text-sm text-slate-500">
                    อีเมล: {form.email || '-'} (ไม่สามารถแก้ไขได้)
                  </div>
                  <div className="mb-4">
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        checked={form.is_active === true}
                        onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                        className="h-4 w-4 rounded border-gray-300 text-violet-700 focus:ring-violet-700"
                      />
                      <span className="text-sm font-medium text-gray-800">สถานะใช้งาน</span>
                    </label>
                  </div>
                </>
              )}
              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-300"
                  onClick={() => { setModalOpen(false); setEditingId(null); }}
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-md bg-violet-700 px-4 py-2 text-sm font-medium text-white hover:bg-violet-800"
                  onClick={save}
                >
                  {editingId ? 'บันทึก' : 'สร้างแอดมิน'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
