'use client';

import { useEffect, useState } from 'react';
import { getCmsHeaders, handleCmsResponse } from '../cmsApi';
import { useCmsAlert } from '../hooks/useCmsAlert';

const formControl =
  'w-full rounded-md border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-700/20';

export default function TemplatesPage() {
  const [alert, showAlert] = useCmsAlert();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'active' | 'inactive'
  const [form, setForm] = useState({ name: '', description: '', send_message: 'การ์ดของ {name}', template_json: '', sample_image_urls: [], card_type: 'normal', default_expires_at: '' });

  const load = () => {
    setLoading(true);
    fetch('/api/cms/templates', { headers: getCmsHeaders() })
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
    setForm({ name: '', description: '', send_message: 'การ์ดของ {name}', template_json: '', sample_image_urls: [], card_type: 'normal', default_expires_at: '' });
    setModalOpen(true);
  };

  const openEdit = (id) => {
    fetch('/api/cms/templates/' + id, { headers: getCmsHeaders() })
      .then((r) => {
        if (handleCmsResponse(r)) return null;
        return r.json();
      })
      .then((data) => {
        if (!data) return;
        if (data.success && data.data) {
          const t = data.data;
          const json = typeof t.template_json === 'string' ? JSON.parse(t.template_json) : t.template_json;
          let sampleUrls = [];
          if (t.sample_image_urls != null && t.sample_image_urls !== '') {
            try {
              sampleUrls = typeof t.sample_image_urls === 'string' ? JSON.parse(t.sample_image_urls) : t.sample_image_urls;
              if (!Array.isArray(sampleUrls)) sampleUrls = [];
            } catch (_) { sampleUrls = []; }
          }
          const defaultExpiresAt = t.default_expires_at ? new Date(t.default_expires_at).toISOString().slice(0, 10) : '';
          setForm({
            name: t.name || '',
            description: t.description || '',
            send_message: json?.tectony1?.[0]?.linemsg || 'การ์ดของ {name}',
            template_json: typeof t.template_json === 'string' ? t.template_json : JSON.stringify(t.template_json, null, 2),
            sample_image_urls: sampleUrls,
            card_type: t.card_type === 'special' || t.card_type === 'event' ? t.card_type : 'normal',
            default_expires_at: defaultExpiresAt,
          });
          setEditingId(t.id);
          setModalOpen(true);
        }
      })
      .catch(() => showAlert('โหลดข้อมูลไม่สำเร็จ', 'error'));
  };

  const toggleActive = (id, currentlyActive) => {
    fetch('/api/cms/templates/' + id + '/toggle', { method: 'PATCH', headers: getCmsHeaders() })
      .then((r) => {
        if (handleCmsResponse(r)) return null;
        return r.json();
      })
      .then((data) => {
        if (!data) return;
        if (data.success) {
          load();
        } else showAlert(data.message || 'ดำเนินการไม่สำเร็จ', 'error');
      })
      .catch(() => showAlert('เกิดข้อผิดพลาด', 'error'));
  };

  const save = () => {
    const { name, description, send_message, template_json, sample_image_urls } = form;
    if (!name?.trim() || !template_json?.trim()) {
      showAlert('กรุณากรอกชื่อและ JSON แทมเพลต', 'error');
      return;
    }
    if (!send_message?.trim()) {
      showAlert('กรุณากรอกข้อความแสดงตอนส่งการ', 'error');
      return;
    }
    let parsed;
    try {
      parsed = JSON.parse(template_json);
    } catch (e) {
      showAlert('รูปแบบ JSON ไม่ถูกต้อง: ' + e.message, 'error');
      return;
    }
    const urls = Array.isArray(sample_image_urls) ? sample_image_urls.filter((u) => typeof u === 'string' && u.trim() !== '') : [];
    const cardType = form.card_type === 'special' || form.card_type === 'event' ? form.card_type : 'normal';
    const defaultExpiresAt = (form.card_type === 'special' || form.card_type === 'event') && form.default_expires_at ? form.default_expires_at : null;
    const url = editingId ? '/api/cms/templates/' + editingId : '/api/cms/templates';
    const method = editingId ? 'PUT' : 'POST';
    fetch(url, {
      method,
      headers: getCmsHeaders(),
      body: JSON.stringify({ name: name.trim(), description: description?.trim() || null, template_json: parsed, send_message: send_message.trim(), sample_image_urls: urls, card_type: cardType, default_expires_at: defaultExpiresAt }),
    })
      .then((r) => {
        if (handleCmsResponse(r)) return null;
        return r.json();
      })
      .then((data) => {
        if (!data) return;
        if (data.success) {
          showAlert(editingId ? 'แก้ไขแล้ว' : 'เพิ่มแทมเพลตแล้ว', 'success');
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
          <span>รายการแทมเพลต</span>
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-md bg-violet-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-violet-800"
            onClick={openAdd}
          >
            + เพิ่มแทมเพลต
          </button>
        </div>
        <div className="grid grid-cols-1 gap-4 border-b border-gray-200 p-4 md:grid-cols-3 md:p-5">
          <div className="flex min-w-0 flex-col rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-violet-400">
              <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="text-2xl font-bold text-violet-700 md:text-3xl">{loading ? '-' : list.length}</div>
            <div className="mt-1 text-sm text-slate-500">จำนวนแทมเพลตทั้งหมด</div>
          </div>
          <div className="flex min-w-0 flex-col rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-violet-400">
              <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="text-2xl font-bold text-violet-700 md:text-3xl">{loading ? '-' : list.filter((t) => t.is_active !== false).length}</div>
            <div className="mt-1 text-sm text-slate-500">จำนวนแทมเพลตที่ใช้งาน</div>
          </div>
          <div className="flex min-w-0 flex-col rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-violet-400">
              <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="text-2xl font-bold text-violet-700 md:text-3xl">{loading ? '-' : list.filter((t) => t.is_active === false).length}</div>
            <div className="mt-1 text-sm text-slate-500">จำนวนแทมเพลตที่ไม่ได้ใช้งาน</div>
          </div>
        </div>
        <div className="border-b border-gray-200 px-4 py-3 md:px-5">
          <span className="mr-3 text-sm font-medium text-slate-600">แสดง:</span>
          <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-0.5">
            <button
              type="button"
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                statusFilter === 'all' ? 'bg-white text-violet-700 shadow-sm' : 'text-slate-600 hover:text-slate-800'
              }`}
              onClick={() => setStatusFilter('all')}
            >
              ทั้งหมด
            </button>
            <button
              type="button"
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                statusFilter === 'active' ? 'bg-white text-violet-700 shadow-sm' : 'text-slate-600 hover:text-slate-800'
              }`}
              onClick={() => setStatusFilter('active')}
            >
              ที่ใช้งาน
            </button>
            <button
              type="button"
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                statusFilter === 'inactive' ? 'bg-white text-violet-700 shadow-sm' : 'text-slate-600 hover:text-slate-800'
              }`}
              onClick={() => setStatusFilter('inactive')}
            >
              ไม่ได้ใช้งาน
            </button>
          </div>
        </div>
        <div className="overflow-x-auto p-4 md:p-5">
          {loading ? (
            <div className="py-12 text-center text-slate-500">
              <p className="m-0">กำลังโหลด...</p>
            </div>
          ) : (() => {
            const filteredList = statusFilter === 'all' ? list : statusFilter === 'active' ? list.filter((t) => t.is_active !== false) : list.filter((t) => t.is_active === false);
            const isEmpty = filteredList.length === 0;
            return isEmpty ? (
              <div className="py-12 text-center text-slate-500">
                <p className="m-0 mb-4">
                  {list.length === 0
                    ? 'ยังไม่มีแทมเพลต'
                    : statusFilter === 'active'
                      ? 'ไม่มีแทมเพลตที่เปิดใช้งานในขณะนี้'
                      : 'ไม่มีแทมเพลตที่ปิดใช้งาน'}
                </p>
                {list.length === 0 && (
                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-md bg-violet-700 px-4 py-2 text-sm font-medium text-white hover:bg-violet-800"
                    onClick={openAdd}
                  >
                    เพิ่มแทมเพลต
                  </button>
                )}
              </div>
            ) : (
            <table className="w-full min-w-[600px] border-collapse">
              <thead>
                <tr>
                  <th className="border-b border-gray-200 bg-slate-50 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 md:px-4 md:py-3">ลำดับ</th>
                  <th className="border-b border-gray-200 bg-slate-50 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 md:px-4 md:py-3">ชื่อ</th>
                  <th className="border-b border-gray-200 bg-slate-50 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 md:px-4 md:py-3">คำอธิบาย</th>
                  <th className="border-b border-gray-200 bg-slate-50 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 md:px-4 md:py-3">ประเภทการ์ด</th>
                  <th className="border-b border-gray-200 bg-slate-50 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 md:px-4 md:py-3">สถานะ</th>
                  <th className="border-b border-gray-200 bg-slate-50 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 md:px-4 md:py-3">สร้างเมื่อ</th>
                  <th className="border-b border-gray-200 bg-slate-50 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 md:px-4 md:py-3">ดำเนินการ</th>
                </tr>
              </thead>
              <tbody>
                {filteredList.map((t, i) => (
                  <tr key={t.id} className="hover:bg-slate-50">
                    <td className="border-b border-gray-200 px-3 py-2 md:px-4 md:py-3">{i + 1}</td>
                    <td className="border-b border-gray-200 px-3 py-2 md:px-4 md:py-3">{t.name || '-'}</td>
                    <td className="border-b border-gray-200 px-3 py-2 md:px-4 md:py-3">{t.description || '-'}</td>
                    <td className="border-b border-gray-200 px-3 py-2 md:px-4 md:py-3">
                      {t.card_type === 'special' ? (
                        <span className="inline-block rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">พิเศษ/เทศกาล</span>
                      ) : (
                        <span className="inline-block rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">ธรรมดา</span>
                      )}
                    </td>
                    <td className="border-b border-gray-200 px-3 py-2 md:px-4 md:py-3">
                      {t.is_active !== false ? (
                        <span className="inline-block rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">เปิดใช้</span>
                      ) : (
                        <span className="inline-block rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">ปิดใช้</span>
                      )}
                    </td>
                    <td className="border-b border-gray-200 px-3 py-2 text-sm md:px-4 md:py-3">{t.created_at ? new Date(t.created_at).toLocaleDateString('th-TH') : '-'}</td>
                    <td className="border-b border-gray-200 px-3 py-2 md:px-4 md:py-3">
                      <button
                        type="button"
                        className="mr-3 inline-flex items-center justify-center rounded-md bg-gray-200 px-3 py-1.5 text-sm font-medium text-gray-800 hover:bg-gray-300"
                        onClick={() => openEdit(t.id)}
                      >
                        แก้ไข
                      </button>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={t.is_active !== false}
                        title={t.is_active !== false ? 'ปิดใช้' : 'เปิดใช้'}
                        className={`relative inline-flex h-8 w-14 shrink-0 cursor-pointer items-center rounded-full border-0 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 ${
                          t.is_active !== false ? 'bg-green-500' : 'bg-gray-400'
                        }`}
                        onClick={() => toggleActive(t.id, t.is_active !== false)}
                      >
                        <span className="absolute inset-y-0 flex w-full items-center justify-between px-1.5 text-xs font-medium text-white">
                          <span className={t.is_active !== false ? 'opacity-100' : 'opacity-0'}>ON</span>
                          <span className={t.is_active !== false ? 'opacity-0' : 'opacity-100'}>OFF</span>
                        </span>
                        <span
                          className={`pointer-events-none inline-flex h-6 w-6 shrink-0 transform items-center justify-center rounded-full bg-white shadow-md transition-transform duration-200 ease-out ${
                            t.is_active !== false ? 'translate-x-7' : 'translate-x-0.5'
                          }`}
                        />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            );
          })()}
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-5">
          <div className="max-h-[90vh] w-full max-w-[600px] overflow-auto rounded-lg bg-white shadow-xl">
            <div className="border-b border-gray-200 px-5 py-4 font-semibold">{editingId ? 'แก้ไขแทมเพลต' : 'เพิ่มแทมเพลต'}</div>
            <div className="space-y-4 p-5">
              <div>
                <label className="mb-1.5 block font-medium text-gray-800">ชื่อ *</label>
                <input className={formControl} placeholder="เช่น Contact Card" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className="mb-1.5 block font-medium text-gray-800">คำอธิบาย</label>
                <input className={formControl} placeholder="อธิบายสั้นๆ" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
              </div>
              <div>
                <label className="mb-1.5 block font-medium text-gray-800">ประเภทการ์ด</label>
                <select className={formControl} value={form.card_type || 'normal'} onChange={(e) => setForm((f) => ({ ...f, card_type: e.target.value }))}>
                  <option value="normal">การ์ดธรรมดา</option>
                  <option value="special">การ์ดพิเศษ / เทศกาล</option>
                </select>
                <small className="mt-1 block text-slate-500">การ์ดพิเศษ/เทศกาล: กำหนดวันหมดอายุด้านล่าง — การ์ดที่ลูกค้าสร้างจากแทมเพลตนี้จะใช้วันนี้</small>
              </div>
              {(form.card_type === 'special' || form.card_type === 'event') && (
                <div>
                  <label className="mb-1.5 block font-medium text-gray-800">วันหมดอายุ (สำหรับการ์ดจากแทมเพลตนี้)</label>
                  <input
                    type="date"
                    className={formControl}
                    value={form.default_expires_at || ''}
                    onChange={(e) => setForm((f) => ({ ...f, default_expires_at: e.target.value || '' }))}
                    min={new Date().toISOString().slice(0, 10)}
                  />
                  <small className="mt-1 block text-slate-500">เลือกวันที่การ์ดหมดอายุ (เช่น 20 มกราคม) — ลูกค้าที่สร้างการ์ดจากแทมเพลตนี้จะได้วันหมดอายุตามนี้</small>
                </div>
              )}
              <div>
                <label className="mb-1.5 block font-medium text-gray-800">ข้อความแสดงตอนส่งการ *</label>
                <input className={formControl} placeholder="การ์ดของ {name}" value={form.send_message} onChange={(e) => setForm((f) => ({ ...f, send_message: e.target.value }))} />
                <small className="mt-1 block text-slate-500">ใช้ {'{name}'} แทนชื่อผู้ใช้ได้</small>
              </div>
              <div>
                <label className="mb-1.5 block font-medium text-gray-800">รูปตัวอย่างการ์ด (ลิงค์รูป)</label>
                <small className="mb-2 block text-slate-500">นำลิงค์รูปที่ฝากไว้ (เช่น Imgur, Cloudinary) มาใส่ — รูปจะแสดงในกริดบนหน้าสร้างการ์ดให้ผู้ใช้ดูตัวอย่างการ์ดจริง</small>
                {(form.sample_image_urls || []).map((url, idx) => (
                  <div key={idx} className="mb-2 flex items-center gap-2">
                    <input
                      className={`${formControl} flex-1`}
                      placeholder="https://..."
                      value={url}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          sample_image_urls: f.sample_image_urls.map((u, i) => (i === idx ? e.target.value : u)),
                        }))
                      }
                    />
                    <button
                      type="button"
                      className="inline-flex items-center justify-center rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
                      onClick={() => setForm((f) => ({ ...f, sample_image_urls: f.sample_image_urls.filter((_, i) => i !== idx) }))}
                    >
                      ลบ
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-md bg-gray-200 px-3 py-1.5 text-sm font-medium text-gray-800 hover:bg-gray-300"
                  onClick={() => setForm((f) => ({ ...f, sample_image_urls: [...(f.sample_image_urls || []), ''] }))}
                >
                  + เพิ่มลิงค์รูป
                </button>
              </div>
              <div>
                <label className="mb-1.5 block font-medium text-gray-800">JSON แทมเพลต *</label>
                <textarea className={formControl} rows={12} placeholder="วางโค้ด JSON จาก Flex Simulator" value={form.template_json} onChange={(e) => setForm((f) => ({ ...f, template_json: e.target.value }))} />
                <small className="mt-1 block text-slate-500">วางโค้ด JSON ที่ออกแบบจาก Flex Simulator</small>
              </div>
              <div className="flex justify-end gap-2 pt-4">
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
                  บันทึก
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
