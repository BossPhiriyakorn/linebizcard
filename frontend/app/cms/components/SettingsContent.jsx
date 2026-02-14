'use client';

import { useEffect, useState } from 'react';
import { getCmsHeaders, handleCmsResponse } from '../cmsApi';
import { useCmsAlert } from '../hooks/useCmsAlert';

export default function SettingsContent() {
  const [alert, showAlert] = useCmsAlert();
  const [form, setForm] = useState({
    login_logo_url: '',
    login_bg_image_url: '',
    login_bg_color: '#5b21b6',
    qr_payment_bank_name: '',
    qr_payment_account_no: '',
    qr_payment_account_name: '',
    qr_payment_qr_image_url: '',
    privacy_policy_content: '',
    terms_of_service_content: '',
    contact_design_url: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBg, setUploadingBg] = useState(false);
  const [uploadingQr, setUploadingQr] = useState(false);

  useEffect(() => {
    fetch('/api/cms/settings', { headers: getCmsHeaders() })
      .then((r) => {
        if (handleCmsResponse(r)) return null;
        return r.json();
      })
      .then((data) => {
        setLoading(false);
        if (data?.success && data.data) {
          setForm({
            login_logo_url: data.data.login_logo_url || '',
            login_bg_image_url: data.data.login_bg_image_url || '',
            login_bg_color: data.data.login_bg_color || '#5b21b6',
            qr_payment_bank_name: data.data.qr_payment_bank_name || '',
            qr_payment_account_no: data.data.qr_payment_account_no || '',
            qr_payment_account_name: data.data.qr_payment_account_name || '',
            qr_payment_qr_image_url: data.data.qr_payment_qr_image_url || '',
            privacy_policy_content: data.data.privacy_policy_content ?? '',
            terms_of_service_content: data.data.terms_of_service_content ?? '',
            contact_design_url: data.data.contact_design_url || '',
          });
        }
      })
      .catch(() => {
        setLoading(false);
        showAlert('โหลดตั้งค่าไม่สำเร็จ', 'error');
      });
  }, []);

  const save = () => {
    setSaving(true);
    fetch('/api/cms/settings', {
      method: 'PUT',
      headers: getCmsHeaders(),
      body: JSON.stringify({
        login_logo_url: form.login_logo_url.trim() || null,
        login_bg_image_url: form.login_bg_image_url.trim() || null,
        login_bg_color: form.login_bg_color.trim() || '#5b21b6',
        qr_payment_bank_name: form.qr_payment_bank_name.trim() || null,
        qr_payment_account_no: form.qr_payment_account_no.trim() || null,
        qr_payment_account_name: form.qr_payment_account_name.trim() || null,
        qr_payment_qr_image_url: form.qr_payment_qr_image_url.trim() || null,
        privacy_policy_content: form.privacy_policy_content.trim() || null,
        terms_of_service_content: form.terms_of_service_content.trim() || null,
        contact_design_url: form.contact_design_url.trim() || null,
      }),
    })
      .then((r) => {
        if (handleCmsResponse(r)) return null;
        return r.json();
      })
      .then((data) => {
        setSaving(false);
        if (data?.success) {
          showAlert('บันทึกตั้งค่าแล้ว', 'success');
        } else {
          showAlert(data?.message || 'บันทึกไม่สำเร็จ', 'error');
        }
      })
      .catch(() => {
        setSaving(false);
        showAlert('เกิดข้อผิดพลาด', 'error');
      });
  };

  const getUploadHeaders = () => {
    const h = getCmsHeaders();
    return { Authorization: h?.Authorization || '' };
  };

  const uploadFile = (endpoint, setUploading, formKey) => (e) => {
    const file = e.target?.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('file', file);
    fetch('/api/cms' + endpoint, {
      method: 'POST',
      headers: getUploadHeaders(),
      body: fd,
    })
      .then((r) => {
        if (handleCmsResponse(r)) return null;
        return r.json();
      })
      .then((data) => {
        setUploading(false);
        e.target.value = '';
        if (data?.success && data.url) {
          setForm((f) => ({ ...f, [formKey]: data.url }));
          showAlert('อัปโหลดรูปแล้ว กดบันทึกตั้งค่าเพื่อเก็บค่า', 'success');
        } else {
          showAlert(data?.message || 'อัปโหลดไม่สำเร็จ', 'error');
        }
      })
      .catch(() => {
        setUploading(false);
        e.target.value = '';
        showAlert('อัปโหลดไม่สำเร็จ', 'error');
      });
  };

  if (loading) {
    return (
      <div className="mb-6 rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="p-4 md:p-5">
          <p className="m-0 text-slate-600">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

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
        <div className="border-b border-gray-200 px-5 py-4 font-semibold">ตั้งค่าหน้า Login</div>
        <div className="p-4 md:p-5">
          <p className="mb-5 text-slate-500">
            ตั้งค่าโลโก้และภาพพื้นหลังของหน้าเข้าสู่ระบบ CMS (/cms/login) หากไม่กรอกหรืออัปโหลด ระบบจะใช้สีพื้นหลังตามที่กำหนดด้านล่าง
          </p>
          <div className="mb-4">
            <label className="mb-1.5 block font-medium text-gray-800">โลโก้หน้า Login</label>
            {form.login_logo_url && (
              <div className="mb-2">
                <img src={form.login_logo_url} alt="โลโก้" className="max-h-20 rounded border border-gray-200 object-contain" />
              </div>
            )}
            <input
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp,image/avif,image/heic,image/heif"
              className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-md file:border-0 file:bg-violet-700 file:px-4 file:py-2 file:font-medium file:text-white"
              onChange={uploadFile('/upload/settings/logo', setUploadingLogo, 'login_logo_url')}
              disabled={uploadingLogo}
            />
            <small className="mt-1 block text-slate-500">รองรับ JPG, PNG, GIF, WebP, HEIC (iPhone) — ระบบจะแปลงเป็น WebP อัตโนมัติ ว่างไว้ = แสดงข้อความ MagicBiz-Card CMS</small>
            {uploadingLogo && <span className="mt-1 block text-sm text-violet-600">กำลังอัปโหลด...</span>}
          </div>
          <div className="mb-4">
            <label className="mb-1.5 block font-medium text-gray-800">ภาพพื้นหลังหน้า Login</label>
            {form.login_bg_image_url && (
              <div className="mb-2">
                <img src={form.login_bg_image_url} alt="พื้นหลัง" className="max-h-24 max-w-md rounded border border-gray-200 object-cover" />
              </div>
            )}
            <input
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp,image/avif,image/heic,image/heif"
              className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-md file:border-0 file:bg-violet-700 file:px-4 file:py-2 file:font-medium file:text-white"
              onChange={uploadFile('/upload/settings/bg', setUploadingBg, 'login_bg_image_url')}
              disabled={uploadingBg}
            />
            <small className="mt-1 block text-slate-500">รองรับทุกรูปแบบรูปภาพ รวม iPhone (HEIC) ว่างไว้ = ใช้สีพื้นหลังด้านล่าง</small>
            {uploadingBg && <span className="mt-1 block text-sm text-violet-600">กำลังอัปโหลด...</span>}
          </div>
          <div className="mb-4">
            <label className="mb-1.5 block font-medium text-gray-800">สีพื้นหลัง (เมื่อไม่มีภาพ)</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={form.login_bg_color}
                onChange={(e) => setForm((f) => ({ ...f, login_bg_color: e.target.value }))}
                className="h-9 w-12 cursor-pointer rounded-md border border-gray-200 p-0.5"
              />
              <input
                type="text"
                className="max-w-[140px] rounded-md border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-700/20"
                placeholder="#5b21b6"
                value={form.login_bg_color}
                onChange={(e) => setForm((f) => ({ ...f, login_bg_color: e.target.value }))}
              />
            </div>
          </div>
          <div className="mt-6">
            <button
              type="button"
              className="inline-flex items-center justify-center gap-1.5 rounded-md bg-violet-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-800 disabled:opacity-70"
              onClick={save}
              disabled={saving}
            >
              {saving ? 'กำลังบันทึก...' : 'บันทึกตั้งค่า'}
            </button>
          </div>
        </div>
      </div>

      {/* เนื้อหาสำหรับการยินยอม (ลูกค้าอ่านและติ๊กตอนลงทะเบียน) */}
      <div className="mb-6 rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-5 py-4 font-semibold">ตั้งค่าเนื้อหาสำหรับการยินยอม (ลูกค้า)</div>
        <div className="p-4 md:p-5">
          <p className="mb-5 text-slate-500">
            เนื้อหาต่อไปนี้จะแสดงบนหน้าลงทะเบียนของลูกค้า (LINE) — ลูกค้าต้องติ๊กยอมรับทั้งสองข้อก่อนกดบันทึก เพื่อความสอดคล้อง PDPA
          </p>
          <div className="mb-4">
            <label className="mb-1.5 block font-medium text-gray-800">นโยบายความเป็นส่วนตัว (Privacy Policy)</label>
            <textarea
              rows={6}
              className="w-full rounded-md border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-700/20"
              placeholder="กรอกเนื้อหานโยบายความเป็นส่วนตัวที่ลูกค้าต้องอ่านและยอมรับ..."
              value={form.privacy_policy_content}
              onChange={(e) => setForm((f) => ({ ...f, privacy_policy_content: e.target.value }))}
            />
          </div>
          <div className="mb-4">
            <label className="mb-1.5 block font-medium text-gray-800">ข้อกำหนดการใช้บริการ (Terms of Service)</label>
            <textarea
              rows={6}
              className="w-full rounded-md border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-700/20"
              placeholder="กรอกเนื้อหาข้อกำหนดการใช้บริการที่ลูกค้าต้องอ่านและยอมรับ..."
              value={form.terms_of_service_content}
              onChange={(e) => setForm((f) => ({ ...f, terms_of_service_content: e.target.value }))}
            />
          </div>
          <div className="mt-6">
            <button
              type="button"
              className="inline-flex items-center justify-center gap-1.5 rounded-md bg-violet-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-800 disabled:opacity-70"
              onClick={save}
              disabled={saving}
            >
              {saving ? 'กำลังบันทึก...' : 'บันทึกตั้งค่า'}
            </button>
          </div>
        </div>
      </div>

      {/* ลิงค์ติดต่อออกแบบ — ปุ่ม "ติดต่อออกแบบ" บนหน้าสร้างการ์ด */}
      <div className="mb-6 rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-5 py-4 font-semibold">ลิงค์ติดต่อออกแบบ (ปุ่มติดต่อออกแบบ)</div>
        <div className="p-4 md:p-5">
          <p className="mb-5 text-slate-500">
            ใส่ลิงค์ช่องทางติดต่อเมื่อลูกค้ากดปุ่ม &quot;ติดต่อออกแบบ&quot; บนหน้าสร้างการ์ด (เช่น ลิงค์ LINE, Facebook, ฟอร์มติดต่อ หรือหน้าเว็บ)
          </p>
          <div className="mb-4">
            <label className="mb-1.5 block font-medium text-gray-800">ลิงค์ช่องทางติดต่อออกแบบ</label>
            <input
              type="url"
              className="w-full rounded-md border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-700/20"
              placeholder="https://line.me/ti/p/... หรือ https://..."
              value={form.contact_design_url}
              onChange={(e) => setForm((f) => ({ ...f, contact_design_url: e.target.value }))}
            />
            <small className="mt-1 block text-slate-500">ว่างไว้ = ปุ่มติดต่อออกแบบจะไม่เปิดลิงค์ (หรือแสดงตามที่ frontend กำหนด)</small>
          </div>
          <div className="mt-6">
            <button
              type="button"
              className="inline-flex items-center justify-center gap-1.5 rounded-md bg-violet-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-800 disabled:opacity-70"
              onClick={save}
              disabled={saving}
            >
              {saving ? 'กำลังบันทึก...' : 'บันทึกตั้งค่า'}
            </button>
          </div>
        </div>
      </div>

      {/* ตั้งค่า QR Code สำหรับการชำระเงิน (ลูกค้าเลือกชำระเอง) */}
      <div className="mb-6 rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-5 py-4 font-semibold">ตั้งค่า QR Code การชำระเงิน</div>
        <div className="p-4 md:p-5">
          <p className="mb-5 text-slate-500">
            ใช้เมื่อลูกค้าเลือกชำระด้วยตัวเอง (คิวอาร์โค้ด) — ระบบจะแสดงข้อมูลบัญชีและรูป QR นี้บนหน้าชำระเงินให้ลูกค้าโอนเงินและแนบสลิป
          </p>
          <div className="mb-4">
            <label className="mb-1.5 block font-medium text-gray-800">ชื่อธนาคาร</label>
            <input
              type="text"
              className="w-full rounded-md border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-700/20"
              placeholder="เช่น ธนาคารกสิกรไทย"
              value={form.qr_payment_bank_name}
              onChange={(e) => setForm((f) => ({ ...f, qr_payment_bank_name: e.target.value }))}
            />
          </div>
          <div className="mb-4">
            <label className="mb-1.5 block font-medium text-gray-800">เลขบัญชี</label>
            <input
              type="text"
              className="w-full rounded-md border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-700/20"
              placeholder="xxx-x-xxxxx-x"
              value={form.qr_payment_account_no}
              onChange={(e) => setForm((f) => ({ ...f, qr_payment_account_no: e.target.value }))}
            />
          </div>
          <div className="mb-4">
            <label className="mb-1.5 block font-medium text-gray-800">ชื่อบัญชี</label>
            <input
              type="text"
              className="w-full rounded-md border border-gray-200 bg-white px-3 py-2.5 text-sm focus:border-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-700/20"
              placeholder="ชื่อที่แสดงบนบัญชี"
              value={form.qr_payment_account_name}
              onChange={(e) => setForm((f) => ({ ...f, qr_payment_account_name: e.target.value }))}
            />
          </div>
          <div className="mb-4">
            <label className="mb-1.5 block font-medium text-gray-800">รูป QR Code การชำระเงิน</label>
            {form.qr_payment_qr_image_url && (
              <div className="mb-2">
                <img src={form.qr_payment_qr_image_url} alt="QR ชำระเงิน" className="h-24 w-24 rounded border border-gray-200 object-cover" />
              </div>
            )}
            <input
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp,image/avif,image/heic,image/heif"
              className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-md file:border-0 file:bg-violet-700 file:px-4 file:py-2 file:font-medium file:text-white"
              onChange={uploadFile('/upload/qr', setUploadingQr, 'qr_payment_qr_image_url')}
              disabled={uploadingQr}
            />
            <small className="mt-1 block text-slate-500">อัปโหลดรูป QR Code รองรับ JPG, PNG, GIF, WebP, HEIC — ระบบจะแปลงเป็น WebP และเก็บแยกจากรูปตั้งค่า Login</small>
            {uploadingQr && <span className="mt-1 block text-sm text-violet-600">กำลังอัปโหลด...</span>}
          </div>
          <div className="mt-6">
            <button
              type="button"
              className="inline-flex items-center justify-center gap-1.5 rounded-md bg-violet-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-800 disabled:opacity-70"
              onClick={save}
              disabled={saving}
            >
              {saving ? 'กำลังบันทึก...' : 'บันทึกตั้งค่า'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
