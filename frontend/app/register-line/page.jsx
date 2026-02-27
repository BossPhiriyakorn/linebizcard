'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import CustomerAppBar from '../components/CustomerAppBar';
import AlertBanner from '../components/AlertBanner';

function getToken() {
  return typeof window !== 'undefined' ? localStorage.getItem('token') : null;
}

function getHeaders() {
  return { Authorization: 'Bearer ' + getToken(), 'Content-Type': 'application/json' };
}

const inputClass =
  'w-full rounded-xl border-2 border-gray-200 bg-gray-50 px-4 py-3 text-base text-slate-800 placeholder:text-slate-500 transition-all focus:border-[#1DB446] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#1DB446]/15';
const labelClass = 'mb-2 block text-sm font-medium text-gray-800';

function RegisterLineContent() {
  const searchParams = useSearchParams();
  const [form, setForm] = useState({ first_name: '', last_name: '', nickname: '', phone: '', email: '', accepted_privacy_policy: false, accepted_terms: false });
  const [consentDocs, setConsentDocs] = useState({ privacy_policy: '', terms_of_service: '' });
  const [alert, setAlert] = useState({ show: false, msg: '', type: 'error' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [consentLoading, setConsentLoading] = useState(true);
  const [consentModal, setConsentModal] = useState({ open: false, type: null });
  const [scrolledToBottom, setScrolledToBottom] = useState(false);
  const consentScrollRef = useRef(null);

  useEffect(() => {
    const urlToken = searchParams.get('token');
    if (urlToken) {
      localStorage.setItem('token', urlToken);
      const p = new URLSearchParams(window.location.search);
      p.delete('token');
      const newSearch = p.toString();
      window.history.replaceState({}, '', window.location.pathname + (newSearch ? '?' + newSearch : ''));
    }
  }, [searchParams]);

  useEffect(() => {
    fetch('/api/consent-documents')
      .then((r) => r.json())
      .then((data) => {
        if (data?.success && data.data) {
          setConsentDocs({ privacy_policy: data.data.privacy_policy || '', terms_of_service: data.data.terms_of_service || '' });
        }
      })
      .finally(() => setConsentLoading(false));
  }, []);

  const openConsentModal = (type) => {
    setConsentModal({ open: true, type });
    setScrolledToBottom(false);
  };

  const closeConsentModal = () => {
    setConsentModal({ open: false, type: null });
    setScrolledToBottom(false);
  };

  const onConsentScroll = (e) => {
    const el = e.target;
    const isBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 30;
    setScrolledToBottom(isBottom);
  };

  const onConsentAgree = () => {
    if (consentModal.type === 'privacy') {
      setForm((f) => ({ ...f, accepted_privacy_policy: true }));
    } else if (consentModal.type === 'terms') {
      setForm((f) => ({ ...f, accepted_terms: true }));
    }
    setFieldErrors((p) => ({ ...p, consent: '' }));
    closeConsentModal();
  };

  const modalContent = consentModal.type === 'privacy' ? consentDocs.privacy_policy : consentDocs.terms_of_service;
  const modalTitle = consentModal.type === 'privacy' ? 'นโยบายความเป็นส่วนตัว (Privacy Policy)' : 'ข้อกำหนดการใช้บริการ (Terms of Service)';
  const canAgree = scrolledToBottom || (typeof modalContent === 'string' && modalContent.length < 500);

  // ปุ่มสมัครกดได้และเป็นสีเขียวเมื่อกรอกครบ (ชื่อ นามสกุล เบอร์โทร) และยอมรับทั้ง 2 ข้อ — ชื่อเล่น/อีเมลไม่บังคับ
  const canSubmit =
    !!form.first_name?.trim() &&
    !!form.last_name?.trim() &&
    !!form.phone?.trim() &&
    form.accepted_privacy_policy &&
    form.accepted_terms;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = {};
    if (!form.first_name?.trim()) err.first_name = 'กรุณากรอกชื่อ';
    if (!form.last_name?.trim()) err.last_name = 'กรุณากรอกนามสกุล';
    if (!form.phone?.trim()) err.phone = 'กรุณากรอกเบอร์โทรศัพท์';
    if (!form.accepted_privacy_policy || !form.accepted_terms) err.consent = 'กรุณาอ่านและยอมรับนโยบายความเป็นส่วนตัวและข้อกำหนดการใช้บริการ';
    setFieldErrors(err);
    if (Object.keys(err).length > 0) {
      setAlert({ show: true, msg: 'กรุณากรอกข้อมูลให้ครบและยอมรับข้อกำหนด', type: 'error' });
      return;
    }
    setLoading(true);
    try {
      const payload = { ...form, accepted_privacy_policy: true, accepted_terms: true };
      const res = await fetch('/api/line/complete-profile', { method: 'POST', headers: getHeaders(), body: JSON.stringify(payload) });
      const data = await res.json();
      if (data.success) {
        setAlert({ show: true, msg: 'ลงทะเบียนสำเร็จ กำลังพาไปเลือกแพ็กเกจ...', type: 'success' });
        setTimeout(() => { window.location.href = '/choose-package'; }, 1500);
      } else setAlert({ show: true, msg: data.message || 'ลงทะเบียนไม่สำเร็จ', type: 'error' });
    } catch {
      setAlert({ show: true, msg: 'เกิดข้อผิดพลาด', type: 'error' });
    }
    setLoading(false);
  };

  return (
    <div className="w-full box-border" style={{ width: '100%', minWidth: 0 }}>
      <CustomerAppBar hideMenu />
      <div
        className="my-6 rounded-xl bg-white p-4 shadow-[0_8px_30px_rgba(0,0,0,0.12)] md:p-8"
        style={{ maxWidth: 500, marginLeft: 'auto', marginRight: 'auto', width: '100%' }}
      >
        <div className="mb-6 text-center">
          <h1 className="mb-2.5 text-2xl font-bold text-[#1DB446]">ลงทะเบียน</h1>
          <p className="text-gray-500">กรุณากรอกข้อมูลเพื่อสร้างการ์ดของคุณ</p>
        </div>
        <div className="mb-5 rounded-xl bg-gradient-to-br from-[#667eea] to-[#764ba2] p-4 text-center text-white">
          <p className="m-0">✅ คุณได้เข้าสู่ระบบด้วย LINE แล้ว</p>
          <p className="mt-1 text-sm opacity-90">กรุณากรอกข้อมูลเพิ่มเติมเพื่อเริ่มใช้งาน</p>
        </div>
        <AlertBanner
          show={alert.show}
          msg={alert.msg}
          type={alert.type}
          onClose={() => setAlert((a) => ({ ...a, show: false }))}
          autoCloseMs={alert.type === 'success' ? 0 : 0}
        />
        <form onSubmit={handleSubmit}>
          <div className="mb-5">
            <label className={labelClass}>ชื่อ <span className="text-red-600" aria-hidden="true">*</span></label>
            <input type="text" required placeholder="กรอกชื่อ" value={form.first_name} onChange={(e) => { setForm((f) => ({ ...f, first_name: e.target.value })); setFieldErrors((p) => ({ ...p, first_name: '' })); }} className={inputClass} />
            {fieldErrors.first_name && <p className="mt-1 text-sm text-red-600">{fieldErrors.first_name}</p>}
          </div>
          <div className="mb-5">
            <label className={labelClass}>นามสกุล <span className="text-red-600" aria-hidden="true">*</span></label>
            <input type="text" required placeholder="กรอกนามสกุล" value={form.last_name} onChange={(e) => { setForm((f) => ({ ...f, last_name: e.target.value })); setFieldErrors((p) => ({ ...p, last_name: '' })); }} className={inputClass} />
            {fieldErrors.last_name && <p className="mt-1 text-sm text-red-600">{fieldErrors.last_name}</p>}
          </div>
          <div className="mb-5">
            <label className={labelClass}>ชื่อเล่น</label>
            <input type="text" placeholder="ชื่อเล่น (ไม่บังคับ)" value={form.nickname} onChange={(e) => setForm((f) => ({ ...f, nickname: e.target.value }))} className={inputClass} />
          </div>
          <div className="mb-5">
            <label className={labelClass}>เบอร์โทร <span className="text-red-600" aria-hidden="true">*</span></label>
            <input type="tel" placeholder="0812345678" maxLength={10} value={form.phone} onChange={(e) => { setForm((f) => ({ ...f, phone: e.target.value })); setFieldErrors((p) => ({ ...p, phone: '' })); }} className={inputClass} />
            {fieldErrors.phone && <p className="mt-1 text-sm text-red-600">{fieldErrors.phone}</p>}
          </div>
          <div className="mb-5">
            <label className={labelClass}>อีเมล</label>
            <input type="email" placeholder="อีเมล" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className={inputClass} />
          </div>

          {/* ความยินยอม (PDPA) — กดช่องติ๊ก/แถว → เด้งโมดัล อ่านแล้วเลื่อนลงล่าง กดยินยอมถึงติ๊กถูก */}
          <div className="mb-5 rounded-lg border border-gray-200 bg-gray-50 p-4">
            <p className="mb-3 text-sm font-medium text-gray-800">กรุณาอ่านและยอมรับก่อนลงทะเบียน</p>
            {consentLoading ? (
              <p className="text-sm text-gray-500">กำลังโหลด...</p>
            ) : (
              <>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => openConsentModal('privacy')}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openConsentModal('privacy'); } }}
                  className="mb-3 flex cursor-pointer items-start gap-3 rounded-lg border border-transparent p-2 transition-colors hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-[#1DB446]"
                >
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 border-gray-400 bg-white">
                    {form.accepted_privacy_policy ? <span className="text-[#1DB446]">✓</span> : null}
                  </span>
                  <span className="block text-sm text-gray-700">
                    ข้าพเจ้าอ่านและยอมรับ <strong>นโยบายความเป็นส่วนตัว</strong> แล้ว
                    <span className="mt-1 block text-[#1DB446]">ดูเนื้อหา</span>
                  </span>
                </div>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => openConsentModal('terms')}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openConsentModal('terms'); } }}
                  className="flex cursor-pointer items-start gap-3 rounded-lg border border-transparent p-2 transition-colors hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-[#1DB446]"
                >
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 border-gray-400 bg-white">
                    {form.accepted_terms ? <span className="text-[#1DB446]">✓</span> : null}
                  </span>
                  <span className="block text-sm text-gray-700">
                    ข้าพเจ้าอ่านและยอมรับ <strong>ข้อกำหนดการใช้บริการ</strong> แล้ว
                    <span className="mt-1 block text-[#1DB446]">ดูเนื้อหา</span>
                  </span>
                </div>
              </>
            )}
            {fieldErrors.consent && <p className="mt-1 text-sm text-red-600">{fieldErrors.consent}</p>}
          </div>

          {/* โมดัลอ่านเนื้อหา — เลื่อนลงล่างสุดแล้วกดยินยอมถึงติ๊กถูก */}
          {consentModal.open && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={(e) => e.target === e.currentTarget && closeConsentModal()}>
              <div className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
                <div className="border-b border-gray-200 px-4 py-3 font-semibold text-gray-800">{modalTitle}</div>
                <div
                  ref={consentScrollRef}
                  onScroll={onConsentScroll}
                  className="flex-1 overflow-y-auto whitespace-pre-wrap px-4 py-3 text-sm text-gray-700"
                  style={{ maxHeight: '50vh' }}
                >
                  {(typeof modalContent === 'string' ? modalContent.replace(/ข้าพเจา/g, 'ข้าพเจ้า') : modalContent) || 'ไม่มีเนื้อหา'}
                </div>
                <div className="flex flex-col gap-2 border-t border-gray-200 bg-gray-50 px-4 py-3">
                  {!canAgree && (
                    <p className="text-center text-xs text-amber-700">กรุณาเลื่อนลงล่างสุดเพื่อกดยินยอม</p>
                  )}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={closeConsentModal}
                      className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      ปิด
                    </button>
                    <button
                      type="button"
                      onClick={onConsentAgree}
                      disabled={!canAgree}
                      className="flex-1 rounded-lg bg-[#1DB446] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0FA03A] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      ยินยอม
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <button
            type="submit"
            className={`w-full min-h-[44px] rounded-lg px-5 py-3 font-semibold text-white transition-all disabled:cursor-not-allowed ${
              canSubmit && !loading
                ? 'bg-[#1DB446] hover:bg-[#0FA03A]'
                : 'bg-gray-400'
            }`}
            disabled={loading || !canSubmit}
          >
            {loading ? 'กำลังสมัคร...' : 'สมัคร'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function RegisterLinePage() {
  return (
    <Suspense fallback={
      <div className="w-full box-border" style={{ width: '100%', minWidth: 0 }}>
        <CustomerAppBar hideMenu />
        <div className="flex flex-col items-center justify-center py-16">
          <p className="text-gray-500">กำลังโหลด...</p>
        </div>
      </div>
    }>
      <RegisterLineContent />
    </Suspense>
  );
}
