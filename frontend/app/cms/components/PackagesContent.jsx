'use client';

import { useEffect, useState } from 'react';
import { getCmsHeaders, handleCmsResponse } from '../cmsApi';
import { useCmsAlert } from '../hooks/useCmsAlert';

const formControl =
  'w-full rounded-md border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-700/20';

export default function PackagesContent() {
  const [alert, showAlert] = useCmsAlert();
  const [list, setList] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    name: '', duration_days: '', description: '', price: '', coupon_id: '', is_active: true,
    requires_payment: true,
    max_uses_per_user: '',  // '' = ไม่จำกัด, ตัวเลข = จำกัดครั้ง
    max_uses_unlimited: true,
  });

  const discountCoupons = (coupons || []).filter((c) => c.coupon_type === 'discount');

  const load = () => {
    setLoading(true);
    fetch('/api/cms/packages', { headers: getCmsHeaders() })
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

  const loadCoupons = () => {
    fetch('/api/cms/coupons', { headers: getCmsHeaders() })
      .then((r) => (handleCmsResponse(r) ? null : r.json()))
      .then((data) => {
        if (data?.success && Array.isArray(data.data)) setCoupons(data.data);
      })
      .catch(() => {});
  };

  useEffect(() => {
    load();
    loadCoupons();
  }, []);

  const openAdd = () => {
    setEditingId(null);
    setForm({
      name: '', duration_days: '', description: '', price: '0', coupon_id: '', is_active: true,
      requires_payment: true, max_uses_per_user: '', max_uses_unlimited: true,
    });
    loadCoupons();
    setModalOpen(true);
  };

  const deletePackage = (id, name) => {
    if (!window.confirm(`ต้องการลบแพ็กเกจ "${name || 'นี้'}" ใช่หรือไม่?\n\nการลบจะลบออกจากฐานข้อมูลถาวร`)) return;
    fetch('/api/cms/packages/' + id, { method: 'DELETE', headers: getCmsHeaders() })
      .then((r) => {
        if (handleCmsResponse(r)) return null;
        return r.json();
      })
      .then((data) => {
        if (!data) return;
        if (data.success) {
          showAlert('ลบแพ็กเกจแล้ว', 'success');
          load();
          if (editingId === id) {
            setModalOpen(false);
            setEditingId(null);
          }
        } else {
          showAlert(data.message || 'ลบไม่สำเร็จ', 'error');
        }
      })
      .catch(() => showAlert('เกิดข้อผิดพลาด', 'error'));
  };

  const openEdit = (id) => {
    loadCoupons();
    fetch('/api/cms/packages/' + id, { headers: getCmsHeaders() })
      .then((r) => {
        if (handleCmsResponse(r)) return null;
        return r.json();
      })
      .then((data) => {
        if (!data) return;
        if (data.success && data.data) {
          const p = data.data;
          const maxUses = p.max_uses_per_user != null ? parseInt(p.max_uses_per_user, 10) : null;
          setForm({
            name: p.name || '',
            duration_days: p.duration_days != null ? String(p.duration_days) : '',
            description: p.description || '',
            price: p.price != null ? String(p.price) : '0',
            coupon_id: p.coupon_id != null ? String(p.coupon_id) : '',
            is_active: p.is_active !== false,
            requires_payment: p.requires_payment !== false,
            max_uses_per_user: maxUses != null ? String(maxUses) : '',
            max_uses_unlimited: maxUses == null,
          });
          setEditingId(p.id);
          setModalOpen(true);
        }
      })
      .catch(() => showAlert('โหลดข้อมูลไม่สำเร็จ', 'error'));
  };

  const save = () => {
    const { name, duration_days, description, price } = form;
    if (!name?.trim()) {
      showAlert('กรุณากรอกชื่อแพ็กเกจ', 'error');
      return;
    }
    const days = parseInt(String(duration_days), 10);
    if (isNaN(days) || days < 0) {
      showAlert('จำนวนวันต้องเป็นตัวเลขที่ไม่ติดลบ', 'error');
      return;
    }
    const url = editingId ? '/api/cms/packages/' + editingId : '/api/cms/packages';
    const method = editingId ? 'PUT' : 'POST';
    const couponIdVal = form.coupon_id != null && String(form.coupon_id).trim() !== '' ? parseInt(form.coupon_id, 10) : null;
    const maxUsesVal = form.max_uses_unlimited ? null : (parseInt(String(form.max_uses_per_user), 10) || null);
    if (!form.max_uses_unlimited && (maxUsesVal == null || maxUsesVal < 1)) {
      showAlert('จำนวนครั้งต่อ 1 ยูส ต้องเป็นตัวเลขอย่างน้อย 1 หรือเลือกไม่จำกัด', 'error');
      return;
    }
    fetch(url, {
      method,
      headers: getCmsHeaders(),
      body: JSON.stringify({
        name: name.trim(),
        duration_days: days,
        description: description?.trim() || null,
        price: parseFloat(price) || 0,
        coupon_id: isNaN(couponIdVal) ? null : couponIdVal,
        is_active: editingId ? form.is_active : true,
        requires_payment: form.requires_payment,
        max_uses_per_user: maxUsesVal,
      }),
    })
      .then((r) => {
        if (handleCmsResponse(r)) return null;
        return r.json();
      })
      .then((data) => {
        if (!data) return;
        if (data.success) {
          showAlert(editingId ? 'แก้ไขแล้ว' : 'เพิ่มแพ็กเกจแล้ว', 'success');
          setModalOpen(false);
          load();
        } else showAlert(data.message || 'บันทึกไม่สำเร็จ', 'error');
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
          <span>รายการแพ็กเกจ</span>
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-md bg-violet-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-800"
            onClick={openAdd}
          >
            + เพิ่มแพ็กเกจ
          </button>
        </div>
        <div className="overflow-x-auto p-4 md:p-5">
          {loading ? (
            <div className="py-12 text-center text-slate-500">กำลังโหลด...</div>
          ) : list.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <p className="m-0 mb-4">ยังไม่มีแพ็กเกจ</p>
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-md bg-violet-700 px-4 py-2 text-sm font-medium text-white hover:bg-violet-800"
                onClick={openAdd}
              >
                เพิ่มแพ็กเกจ
              </button>
            </div>
          ) : (
            <table className="w-full min-w-[600px] border-collapse">
              <thead>
                <tr>
                  <th className="border-b border-gray-200 bg-slate-50 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 md:px-4 md:py-3">ลำดับ</th>
                  <th className="border-b border-gray-200 bg-slate-50 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 md:px-4 md:py-3">ชื่อแพ็กเกจ</th>
                  <th className="border-b border-gray-200 bg-slate-50 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 md:px-4 md:py-3">จำนวนวัน</th>
                  <th className="border-b border-gray-200 bg-slate-50 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 md:px-4 md:py-3">รายละเอียด</th>
                  <th className="border-b border-gray-200 bg-slate-50 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 md:px-4 md:py-3">ราคา (บาท)</th>
                  <th className="border-b border-gray-200 bg-slate-50 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 md:px-4 md:py-3">คูปองส่วนลด</th>
                  <th className="border-b border-gray-200 bg-slate-50 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 md:px-4 md:py-3">สถานะ</th>
                  <th className="border-b border-gray-200 bg-slate-50 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 md:px-4 md:py-3">ดำเนินการ</th>
                </tr>
              </thead>
              <tbody>
                {list.map((p, i) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="border-b border-gray-200 px-3 py-2 md:px-4 md:py-3">{i + 1}</td>
                    <td className="border-b border-gray-200 px-3 py-2 md:px-4 md:py-3 font-medium">{p.name || '-'}</td>
                    <td className="border-b border-gray-200 px-3 py-2 md:px-4 md:py-3">{p.duration_days != null ? p.duration_days : '-'}</td>
                    <td className="border-b border-gray-200 px-3 py-2 md:px-4 md:py-3 max-w-[200px] truncate" title={p.description || ''}>{p.description || '-'}</td>
                    <td className="border-b border-gray-200 px-3 py-2 md:px-4 md:py-3">{p.price != null ? Number(p.price) : '0'}</td>
                    <td className="border-b border-gray-200 px-3 py-2 md:px-4 md:py-3">
                      {p.coupon_id
                        ? (discountCoupons.find((c) => c.id === p.coupon_id)?.name || discountCoupons.find((c) => c.id === p.coupon_id)?.code || `#${p.coupon_id}`)
                        : '-'}
                    </td>
                    <td className="border-b border-gray-200 px-3 py-2 md:px-4 md:py-3">
                      {p.is_active !== false ? (
                        <span className="inline-block rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">เปิดใช้</span>
                      ) : (
                        <span className="inline-block rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">ปิดใช้</span>
                      )}
                    </td>
                    <td className="border-b border-gray-200 px-3 py-2 md:px-4 md:py-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="inline-flex items-center justify-center rounded-md bg-gray-200 px-3 py-1.5 text-sm font-medium text-gray-800 hover:bg-gray-300"
                          onClick={() => openEdit(p.id)}
                        >
                          แก้ไข
                        </button>
                        <button
                          type="button"
                          className="inline-flex items-center justify-center rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
                          onClick={() => deletePackage(p.id, p.name)}
                        >
                          ลบ
                        </button>
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
          <div className="w-full max-w-md rounded-lg bg-white shadow-xl">
            <div className="border-b border-gray-200 px-5 py-4 font-semibold">{editingId ? 'แก้ไขแพ็กเกจ' : 'เพิ่มแพ็กเกจ'}</div>
            <div className="space-y-4 p-5">
              <div>
                <label className="mb-1.5 block font-medium text-gray-800">ชื่อแพ็กเกจ *</label>
                <input className={formControl} placeholder="เช่น ฟรี, โปร" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className="mb-1.5 block font-medium text-gray-800">จำนวนวันการใช้งาน *</label>
                <input type="number" min={0} className={formControl} placeholder="3 หรือ 30" value={form.duration_days} onChange={(e) => setForm((f) => ({ ...f, duration_days: e.target.value }))} />
              </div>
              <div>
                <label className="mb-1.5 block font-medium text-gray-800">รายละเอียด</label>
                <textarea className={formControl} rows={3} placeholder="อธิบายแพ็กเกจ" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
              </div>
              <div>
                <label className="mb-1.5 block font-medium text-gray-800">ราคา (บาท)</label>
                <input type="number" min={0} step={0.01} className={formControl} placeholder="0 หรือ 60" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} />
              </div>
              <div>
                <label className="mb-1.5 block font-medium text-gray-800">ตัวเลือกการชำระเงิน</label>
                <div className="flex flex-wrap gap-4">
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="requires_payment"
                      checked={form.requires_payment === true}
                      onChange={() => setForm((f) => ({ ...f, requires_payment: true }))}
                      className="rounded-full border-gray-300"
                    />
                    <span className="text-sm">ต้องชำระเงิน</span>
                  </label>
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="requires_payment"
                      checked={form.requires_payment === false}
                      onChange={() => setForm((f) => ({ ...f, requires_payment: false }))}
                      className="rounded-full border-gray-300"
                    />
                    <span className="text-sm">ไม่ต้องชำระเงิน (กดเลือกใช้ได้เลย)</span>
                  </label>
                </div>
                <small className="mt-1 block text-slate-500">ไม่ต้องชำระ = ลูกค้าเลือกแพ็กแล้วใช้งานได้ทันที ไม่มีขั้นตอนตรวจสอบยอด</small>
              </div>
              <div>
                <label className="mb-1.5 block font-medium text-gray-800">การใช้งานแพ็กเกจต่อ 1 ยูส</label>
                <div className="flex flex-wrap items-center gap-3">
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.max_uses_unlimited}
                      onChange={(e) => setForm((f) => ({ ...f, max_uses_unlimited: e.target.checked, max_uses_per_user: e.target.checked ? '' : '1' }))}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm">ไม่จำกัด</span>
                  </label>
                  {!form.max_uses_unlimited && (
                    <>
                      <span className="text-slate-500">หรือ</span>
                      <input
                        type="number"
                        min={1}
                        className="w-24 rounded-md border border-gray-200 px-3 py-2 text-sm"
                        placeholder="1"
                        value={form.max_uses_per_user}
                        onChange={(e) => setForm((f) => ({ ...f, max_uses_per_user: e.target.value }))}
                      />
                      <span className="text-sm text-slate-600">ครั้งต่อบัญชี</span>
                    </>
                  )}
                </div>
                <small className="mt-1 block text-slate-500">จำกัดจำนวนครั้งที่ลูกค้า 1 คน ใช้แพ็กนี้ได้ (เช่น แพ็กฟรีใช้ได้ 1 ครั้งต่อยูส)</small>
              </div>
              <div>
                <label className="mb-1.5 block font-medium text-gray-800">คูปองส่วนลดที่ใช้กับแพ็กเกจนี้</label>
                <select
                  className={formControl}
                  value={form.coupon_id}
                  onChange={(e) => setForm((f) => ({ ...f, coupon_id: e.target.value }))}
                >
                  <option value="">ไม่ระบุ</option>
                  {discountCoupons.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name || c.code || `คูปอง #${c.id}`}
                    </option>
                  ))}
                </select>
                <small className="mt-1 block text-slate-500">
                  {discountCoupons.length === 0
                    ? 'ยังไม่มีคูปองส่วนลด สร้างคูปองส่วนลดในแท็บคูปองก่อน'
                    : 'เลือกคูปองที่สร้างแล้วเท่านั้น แพ็กเกจนี้จะใช้ส่วนลดได้เมื่อลูกค้าใส่รหัสคูปองที่ตรงเงื่อนไข'}
                </small>
              </div>
              {editingId && (
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="pkg_active" checked={form.is_active} onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))} className="rounded border-gray-300" />
                  <label htmlFor="pkg_active" className="text-sm font-medium text-gray-800">เปิดใช้งาน</label>
                </div>
              )}
              <div className="flex justify-end gap-2 pt-4">
                <button type="button" className="rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-300" onClick={() => setModalOpen(false)}>ยกเลิก</button>
                <button type="button" className="rounded-md bg-violet-700 px-4 py-2 text-sm font-medium text-white hover:bg-violet-800" onClick={save}>บันทึก</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
