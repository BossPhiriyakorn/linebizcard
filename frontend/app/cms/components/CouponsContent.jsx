'use client';

import { useEffect, useState } from 'react';
import { getCmsHeaders, handleCmsResponse } from '../cmsApi';
import { useCmsAlert } from '../hooks/useCmsAlert';

const formControl =
  'w-full rounded-md border border-gray-200 bg-white px-3 py-2.5 text-sm text-slate-800 placeholder:text-slate-500 focus:border-[#c9a962] focus:outline-none focus:ring-2 focus:ring-[#c9a962]/20';

function formatDate(val) {
  if (!val) return '-';
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function generateCouponCode(length = 12) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export default function CouponsContent() {
  const [alert, showAlert] = useCmsAlert();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    code: '',
    name: '',
    description: '',
    coupon_type: 'extend_days',
    value: '',
    condition_types: [], // รายการเงื่อนไข (หลายรายการได้) เช่น ['annual', '3months']
    discount_percent: '',
    valid_from: '',
    valid_until: '',
    max_uses: '',
    is_active: true,
  });

  const load = () => {
    setLoading(true);
    fetch('/api/cms/coupons', { headers: getCmsHeaders() })
      .then((r) => {
        if (handleCmsResponse(r)) return null;
        return r.json();
      })
      .then((data) => {
        setLoading(false);
        if (!data) return;
        if (data.success && Array.isArray(data.data)) setList(data.data);
        else showAlert(data?.message || 'โหลดรายการไม่สำเร็จ', 'error');
      })
      .catch(() => {
        setLoading(false);
        showAlert('โหลดรายการไม่สำเร็จ', 'error');
      });
  };

  useEffect(() => load(), []);

  const openAdd = () => {
    setEditingId(null);
    setForm({
      code: '',
      name: '',
      description: '',
      coupon_type: 'extend_days',
      value: '7',
      condition_types: [],
      discount_percent: '10',
      valid_from: '',
      valid_until: '',
      max_uses: '',
      is_active: true,
    });
    setModalOpen(true);
  };

  const openEdit = (id) => {
    fetch('/api/cms/coupons/' + id, { headers: getCmsHeaders() })
      .then((r) => {
        if (handleCmsResponse(r)) return null;
        return r.json();
      })
      .then((data) => {
        if (!data) return;
        if (data.success && data.data) {
          const c = data.data;
          const toStr = (v) => (v != null && v !== '' ? String(v) : '');
          const toDateStr = (v) => {
            if (!v) return '';
            const d = new Date(v);
            return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
          };
          setForm({
            code: toStr(c.code),
            name: toStr(c.name),
            description: toStr(c.description),
            coupon_type: c.coupon_type || 'extend_days',
            value: c.value != null ? String(c.value) : '7',
            condition_types: [],
            discount_percent: c.discount_percent != null ? String(c.discount_percent) : '10',
            valid_from: toDateStr(c.valid_from),
            valid_until: toDateStr(c.valid_until),
            max_uses: c.max_uses != null ? String(c.max_uses) : '',
            is_active: c.is_active !== false,
          });
          setEditingId(c.id);
          setModalOpen(true);
        }
      })
      .catch(() => showAlert('โหลดข้อมูลไม่สำเร็จ', 'error'));
  };

  const save = () => {
    const rawCode = (form.code || '').trim();
    if (!rawCode) {
      showAlert('กรุณากรอกรหัสคูปอง', 'error');
      return;
    }
    const type = (form.coupon_type || 'extend_days').toLowerCase();
    const val = parseInt(String(form.value), 10);
    if (type === 'extend_days' && (isNaN(val) || val < 1)) {
      showAlert('กรุณาระบุจำนวนวัน (value) เป็นตัวเลขมากกว่า 0', 'error');
      return;
    }
    if (type === 'discount') {
      const pct = parseInt(String(form.discount_percent), 10);
      if (isNaN(pct) || pct < 1 || pct > 100) {
        showAlert('กรุณาระบุเปอร์เซ็นต์ส่วนลด 1-100', 'error');
        return;
      }
    }
    const url = editingId ? '/api/cms/coupons/' + editingId : '/api/cms/coupons';
    fetch(url, {
      method: editingId ? 'PUT' : 'POST',
      headers: { ...getCmsHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: rawCode,
        name: form.name?.trim() || null,
        description: form.description?.trim() || null,
        coupon_type: type,
        value: type === 'extend_days' ? (isNaN(val) ? 0 : val) : 0,
        condition_type: null,
        discount_percent: type === 'discount' ? parseInt(String(form.discount_percent), 10) : null,
        valid_from: form.valid_from || null,
        valid_until: form.valid_until || null,
        max_uses: form.max_uses !== '' ? parseInt(form.max_uses, 10) : null,
        is_active: form.is_active,
      }),
    })
      .then((r) => {
        if (handleCmsResponse(r)) return null;
        return r.json();
      })
      .then((data) => {
        if (!data) return;
        if (data.success) {
          showAlert(editingId ? 'แก้ไขคูปองแล้ว' : 'สร้างคูปองแล้ว', 'success');
          setModalOpen(false);
          load();
        } else showAlert(data.message || 'บันทึกไม่สำเร็จ', 'error');
      })
      .catch(() => showAlert('เกิดข้อผิดพลาด', 'error'));
  };

  const deleteCoupon = (id, code) => {
    if (!window.confirm('ต้องการลบคูปอง "' + (code || id) + '" ใช่หรือไม่?')) return;
    fetch('/api/cms/coupons/' + id, { method: 'DELETE', headers: getCmsHeaders() })
      .then((r) => {
        if (handleCmsResponse(r)) return null;
        return r.json();
      })
      .then((data) => {
        if (!data) return;
        if (data.success) {
          showAlert('ลบคูปองแล้ว', 'success');
          load();
        } else showAlert(data.message || 'ลบไม่สำเร็จ', 'error');
      })
      .catch(() => showAlert('เกิดข้อผิดพลาด', 'error'));
  };

  return (
    <>
      {alert.show && (
        <div
          className={`mb-4 rounded-md border px-4 py-3 ${
            alert.type === 'error' ? 'border-red-200 bg-red-50 text-red-800' : 'border-green-200 bg-green-50 text-green-800'
          }`}
        >
          {alert.msg}
        </div>
      )}
      <div className="mb-6 rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 font-semibold">
          <span>รายการคูปอง</span>
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-md bg-[#c9a962] px-3 py-1.5 text-sm font-medium text-[#0c1222] hover:bg-[#b8960c]"
            onClick={openAdd}
          >
            + สร้างคูปอง
          </button>
        </div>
        <div className="overflow-x-auto p-4 md:p-5">
          {loading ? (
            <div className="py-12 text-center text-slate-500">กำลังโหลด...</div>
          ) : list.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <p className="m-0 mb-4">ยังไม่มีคูปอง</p>
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-md bg-[#c9a962] px-4 py-2 text-sm font-medium text-[#0c1222] hover:bg-[#b8960c]"
                onClick={openAdd}
              >
                สร้างคูปอง
              </button>
            </div>
          ) : (
            <table className="w-full min-w-[700px] border-collapse">
              <thead>
                <tr>
                  <th className="border-b border-gray-200 bg-slate-50 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 md:px-4 md:py-3">รหัส</th>
                  <th className="border-b border-gray-200 bg-slate-50 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 md:px-4 md:py-3">ชื่อ / ประเภท</th>
                  <th className="border-b border-gray-200 bg-slate-50 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 md:px-4 md:py-3">ค่า (วัน)</th>
                  <th className="border-b border-gray-200 bg-slate-50 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 md:px-4 md:py-3">ใช้แล้ว / สูงสุด</th>
                  <th className="border-b border-gray-200 bg-slate-50 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 md:px-4 md:py-3">วันเริ่ม-หมดอายุ</th>
                  <th className="border-b border-gray-200 bg-slate-50 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 md:px-4 md:py-3">สถานะ</th>
                  <th className="border-b border-gray-200 bg-slate-50 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 md:px-4 md:py-3">ดำเนินการ</th>
                </tr>
              </thead>
              <tbody>
                {list.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="border-b border-gray-200 px-3 py-2 font-mono text-sm md:px-4 md:py-3">{c.code || '-'}</td>
                    <td className="border-b border-gray-200 px-3 py-2 md:px-4 md:py-3">
                      <span className="font-medium">{c.name || '-'}</span>
                      <span className="ml-1 text-xs text-slate-500">
                        ({c.coupon_type === 'extend_days' ? 'เพิ่มวัน' : c.coupon_type === 'discount' ? `ส่วนลด ${c.discount_percent != null ? c.discount_percent + '%' : ''}` : c.coupon_type || '-'})
                      </span>
                    </td>
                    <td className="border-b border-gray-200 px-3 py-2 md:px-4 md:py-3">{c.coupon_type === 'discount' ? (c.discount_percent != null ? c.discount_percent + '%' : '-') : (c.value != null ? c.value : '-')}</td>
                    <td className="border-b border-gray-200 px-3 py-2 md:px-4 md:py-3">{c.use_count ?? 0} / {c.max_uses != null ? c.max_uses : '∞'}</td>
                    <td className="border-b border-gray-200 px-3 py-2 text-sm md:px-4 md:py-3">{formatDate(c.valid_from)} – {formatDate(c.valid_until)}</td>
                    <td className="border-b border-gray-200 px-3 py-2 md:px-4 md:py-3">
                      {c.is_active !== false ? (
                        <span className="inline-block rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">เปิดใช้</span>
                      ) : (
                        <span className="inline-block rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">ปิดใช้</span>
                      )}
                    </td>
                    <td className="border-b border-gray-200 px-3 py-2 md:px-4 md:py-3">
                      <div className="flex gap-2">
                        <button type="button" className="inline-flex items-center justify-center rounded-md bg-gray-200 px-3 py-1.5 text-sm font-medium text-gray-800 hover:bg-gray-300" onClick={() => openEdit(c.id)}>แก้ไข</button>
                        <button type="button" className="inline-flex items-center justify-center rounded-md bg-red-100 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-200" onClick={() => deleteCoupon(c.id, c.code)}>ลบ</button>
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
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg bg-white shadow-xl">
            <div className="border-b border-gray-200 px-5 py-4 font-semibold">{editingId ? 'แก้ไขคูปอง' : 'สร้างคูปอง'}</div>
            <div className="space-y-4 p-5">
              <div>
                <label className="mb-1.5 block font-medium text-gray-800">รหัสคูปอง *</label>
                <div className="flex gap-2">
                  <input
                    className={formControl}
                    placeholder="เช่น WELCOME7"
                    value={form.code}
                    onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                    readOnly={!!editingId}
                  />
                  {!editingId && (
                    <button
                      type="button"
                      className="shrink-0 rounded-md border border-[#c9a962] bg-white px-3 py-2.5 text-sm font-medium text-[#b8960c] transition-colors hover:bg-[#c9a962]/10"
                      onClick={() => setForm((f) => ({ ...f, code: generateCouponCode(12) }))}
                    >
                      สุ่มรหัส
                    </button>
                  )}
                </div>
                {editingId && <p className="mt-1 text-xs text-slate-500">ไม่สามารถแก้รหัสได้</p>}
              </div>
              <div>
                <label className="mb-1.5 block font-medium text-gray-800">ชื่อคูปอง</label>
                <input className={formControl} placeholder="เช่น คูปองต้อนรับ 7 วัน" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className="mb-1.5 block font-medium text-gray-800">ประเภท</label>
                <select className={formControl} value={form.coupon_type} onChange={(e) => setForm((f) => ({ ...f, coupon_type: e.target.value }))}>
                  <option value="extend_days">เพิ่มวันใช้งาน (extend_days)</option>
                  <option value="discount">คูปองส่วนลด (discount)</option>
                </select>
              </div>
              {form.coupon_type === 'discount' ? (
                <div>
                  <label className="mb-1.5 block font-medium text-gray-800">ส่วนลด (%) *</label>
                  <input type="number" min={1} max={100} className={formControl} placeholder="10" value={form.discount_percent} onChange={(e) => setForm((f) => ({ ...f, discount_percent: e.target.value }))} />
                </div>
              ) : (
                <div>
                  <label className="mb-1.5 block font-medium text-gray-800">จำนวนวัน *</label>
                  <input type="number" min={1} className={formControl} placeholder="7" value={form.value} onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))} />
                </div>
              )}
              <div>
                <label className="mb-1.5 block font-medium text-gray-800">รายละเอียด</label>
                <textarea className={formControl} rows={2} placeholder="อธิบายคูปอง" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block font-medium text-gray-800">วันเริ่มต้น</label>
                  <input type="date" className={formControl} value={form.valid_from} onChange={(e) => setForm((f) => ({ ...f, valid_from: e.target.value }))} />
                </div>
                <div>
                  <label className="mb-1.5 block font-medium text-gray-800">วันหมดอายุ</label>
                  <input type="date" className={formControl} value={form.valid_until} onChange={(e) => setForm((f) => ({ ...f, valid_until: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block font-medium text-gray-800">จำนวนครั้งที่ใช้ได้สูงสุด (เว้นว่าง = ไม่จำกัด)</label>
                <input type="number" min={1} className={formControl} placeholder="ไม่จำกัด" value={form.max_uses} onChange={(e) => setForm((f) => ({ ...f, max_uses: e.target.value }))} />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="coupon_active" checked={form.is_active} onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))} className="rounded border-gray-300" />
                <label htmlFor="coupon_active" className="text-sm font-medium text-gray-800">เปิดใช้งาน</label>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <button type="button" className="rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-300" onClick={() => setModalOpen(false)}>ยกเลิก</button>
                <button type="button" className="rounded-md bg-[#c9a962] px-4 py-2 text-sm font-medium text-[#0c1222] hover:bg-[#b8960c]" onClick={save}>บันทึก</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
