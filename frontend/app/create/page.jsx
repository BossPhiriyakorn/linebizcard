'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import CustomerAppBar from '../components/CustomerAppBar';
import { getToken, getHeaders } from '../utils/auth';

const inputClass =
  'w-full rounded-xl border-2 border-gray-200 bg-gray-50 px-4 py-3 text-base transition-all focus:border-[#1DB446] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#1DB446]/15';
const labelClass = 'mb-2 block text-sm font-medium text-gray-800';
const sectionTitleClass =
  'mb-3 flex items-center gap-2.5 border-b-2 border-[#1DB446] pb-2.5 text-lg font-bold text-[#1DB446]';
const numberBadge = 'inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#1DB446] text-sm font-bold text-white';

function CreateContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState(1);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [form, setForm] = useState({ name: '', phone: '', email: '', description: '' });
  const [image1, setImage1] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);
  const [alert, setAlert] = useState({ show: false, msg: '', type: 'error' });
  const [loading, setLoading] = useState(false);
  const [createdSuccess, setCreatedSuccess] = useState(false);

  useEffect(() => {
    const urlToken = searchParams.get('token');
    if (urlToken) {
      localStorage.setItem('token', urlToken);
      window.history.replaceState({}, '', window.location.pathname);
    }
    if (!getToken()) {
      router.replace('/');
      return;
    }
    fetch('/api/templates', { headers: getHeaders() })
      .then((r) => r.json())
      .then((data) => {
        if (data.success && Array.isArray(data.data)) {
          setTemplates((data.data || []).filter((t) => t.is_active !== false));
        }
      })
      .catch(() => setAlert({ show: true, msg: 'โหลดแทมเพลตไม่สำเร็จ', type: 'error' }));
  }, [router, searchParams]);

  useEffect(() => {
    if (!getToken() || step !== 2) return;
    fetch('/api/user/profile', { headers: getHeaders() })
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.data) {
          const p = data.data;
          const fullName = `${p.first_name || ''} ${p.last_name || ''}`.trim();
          setForm((prev) => ({
            name: prev.name || fullName,
            phone: prev.phone || p.phone || '',
            email: prev.email || p.email || '',
            description: prev.description || '',
          }));
        }
      })
      .catch(() => {});
  }, [step]);

  const showAlertMsg = (msg, type) => {
    setAlert({ show: true, msg, type });
    setTimeout(() => setAlert((p) => ({ ...p, show: false })), 5000);
  };

  const handleSelectTemplate = (t) => {
    setSelectedTemplate(t);
    setStep(2);
  };

  const handleBackToTemplates = () => {
    setSelectedTemplate(null);
    setStep(1);
    setAlert({ show: false, msg: '', type: 'error' });
  };

  const handlePhoneChange = (e) => {
    const v = e.target.value.replace(/\D/g, '').slice(0, 10);
    setForm((f) => ({ ...f, phone: v }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0] || null;
    setImage1(file);
    setImagePreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return file ? URL.createObjectURL(file) : null;
    });
  };

  useEffect(() => {
    return () => {
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    };
  }, [imagePreviewUrl]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTemplate || !form.name?.trim()) {
      showAlertMsg('กรุณากรอกชื่อ', 'error');
      return;
    }
    if (form.phone.length > 10) {
      showAlertMsg('เบอร์โทรศัพท์ไม่เกิน 10 หลัก', 'error');
      return;
    }
    setLoading(true);
    setAlert({ show: false, msg: '', type: 'error' });
    const fd = new FormData();
    fd.append('template_id', selectedTemplate.id);
    fd.append('name', form.name.trim());
    if (form.phone) fd.append('phone', form.phone);
    if (form.email) fd.append('email', form.email);
    if (form.description) fd.append('description', form.description);
    if (image1) fd.append('image1', image1);
    try {
      const res = await fetch('/api/create-card', {
        method: 'POST',
        headers: getHeaders(),
        body: fd,
      });
      const text = await res.text();
      let data;
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        showAlertMsg(res.ok ? 'ตอบกลับไม่ถูกต้อง' : (res.status === 408 ? 'ใช้เวลานานเกินไป กรุณาลองใหม่' : 'เกิดข้อผิดพลาดจากเซิร์ฟเวอร์'), 'error');
        setLoading(false);
        return;
      }
      if (data.success) {
        setLoading(false);
        setCreatedSuccess(true);
        return;
      } else {
        showAlertMsg(data.message || 'สร้างไม่สำเร็จ', 'error');
        setLoading(false);
      }
    } catch (err) {
      showAlertMsg(err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ', 'error');
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-[1200px]">
      <CustomerAppBar />
      {/* ก้อนเดียว: หัวข้อ + แจ้งเตือน + เนื้อหาขั้นตอน */}
      <div className="rounded-xl bg-white p-4 shadow-[0_8px_30px_rgba(0,0,0,0.12)] md:p-8">
        <div className="mb-4 border-b-2 border-gray-100 pb-4">
          <h2 className="text-lg font-bold text-gray-800 md:text-xl">สร้างการ์ด</h2>
        </div>
        {alert.show && (
          <div
            className={`mb-5 rounded-lg px-4 py-3 ${alert.type === 'error' ? 'border border-red-200 bg-red-50 text-red-800' : 'border border-green-200 bg-green-50 text-green-800'}`}
          >
            {alert.msg}
          </div>
        )}

        {createdSuccess && (
          <div className="rounded-xl border-2 border-green-200 bg-green-50 p-6 text-center md:p-8">
            <div className="mb-4 text-5xl">✅</div>
            <h2 className="mb-2 text-xl font-bold text-green-800">สร้างการ์ดสำเร็จ</h2>
            <p className="mb-6 text-gray-600">การ์ดของคุณถูกสร้างแล้ว สามารถไปดูที่การ์ดของฉันหรือสร้างการ์ดเพิ่มได้</p>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <a
                href="/my-cards"
                className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-[#1DB446] px-6 py-3 font-semibold text-white no-underline hover:bg-[#0FA03A]"
              >
                ไปการ์ดของฉัน
              </a>
              <button
                type="button"
                onClick={() => {
                  setCreatedSuccess(false);
                  setSelectedTemplate(null);
                  setStep(1);
                  setForm({ name: '', phone: '', email: '', description: '' });
                  setImage1(null);
                  if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
                  setImagePreviewUrl(null);
                }}
                className="inline-flex min-h-[44px] items-center justify-center rounded-lg border-2 border-[#1DB446] bg-white px-6 py-3 font-semibold text-[#1DB446] hover:bg-[#1DB446] hover:text-white"
              >
                สร้างการ์ดอีก
              </button>
            </div>
          </div>
        )}

        {!createdSuccess && step === 1 && (
        <div>
          <h2 className={`${sectionTitleClass} mb-2`}>
            <span className={numberBadge}>1</span> เลือก Template
          </h2>
          <p className="mb-5 text-gray-500 text-[0.95rem]">
            กดเลือก Template ที่ต้องการ แล้วไปหน้าถัดไปเพื่อกรอกข้อมูล
          </p>
          {templates.length === 0 && !alert.show && <p className="text-gray-500">กำลังโหลด Templates...</p>}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fill,minmax(260px,1fr))]">
            {templates.map((t) => {
              let displayImage = null;
              if (t.sample_image_urls) {
                try {
                  const urls = typeof t.sample_image_urls === 'string' ? JSON.parse(t.sample_image_urls) : t.sample_image_urls;
                  if (Array.isArray(urls) && urls.length > 0 && typeof urls[0] === 'string' && urls[0].trim()) displayImage = urls[0].trim();
                } catch (_) {}
              }
              if (!displayImage) displayImage = t.preview_image || null;
              return (
                <div
                  key={t.id}
                  className="relative cursor-pointer overflow-hidden rounded-2xl border-2 border-gray-200 bg-white p-5 transition-all hover:-translate-y-2 hover:border-[#1DB446] hover:shadow-lg hover:shadow-[#1DB446]/20 before:absolute before:left-0 before:top-0 before:h-1 before:w-full before:scale-x-100 before:bg-gradient-to-r before:from-[#1DB446] before:to-[#00C300]"
                  onClick={() => handleSelectTemplate(t)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && handleSelectTemplate(t)}
                >
                  {displayImage && <img src={displayImage} alt={t.name} className="mb-2.5 h-[150px] w-full rounded-lg object-cover" />}
                  <h3 className="mb-1 text-gray-800 text-lg font-medium">{t.name}</h3>
                  <p className="mb-3 text-sm text-gray-500">{t.description || '-'}</p>
                  <span className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-[#1DB446] px-4 py-2.5 text-sm font-semibold text-white">
                    เลือกและกรอกข้อมูล
                  </span>
                </div>
              );
            })}
          </div>
        </div>
        )}

        {!createdSuccess && step === 2 && selectedTemplate && (
        <div>
          <h2 className="mb-2 text-xl font-bold text-gray-800">2. กรอกข้อมูล</h2>
          <p className="mb-4 text-[0.95rem] text-gray-500">กรอกข้อมูลด้านล่างเพื่อสร้างการ์ด</p>
          <button
            type="button"
            className="mb-6 inline-flex min-h-[44px] items-center justify-center rounded-lg border-2 border-[#1DB446] bg-white px-4 py-2.5 text-sm font-semibold text-[#1DB446] hover:bg-[#1DB446] hover:text-white"
            onClick={handleBackToTemplates}
          >
            ← เปลี่ยน template
          </button>

          {(() => {
            const raw = selectedTemplate.sample_image_urls;
            let urls = [];
            if (raw != null && raw !== '') {
              try {
                urls = typeof raw === 'string' ? JSON.parse(raw) : raw;
                if (!Array.isArray(urls)) urls = [];
              } catch (_) { urls = []; }
            }
            urls = urls.filter((u) => typeof u === 'string' && u.trim() !== '');
            if (urls.length === 0) return null;
            return (
              <div className="mb-6 rounded-xl border-2 border-gray-200 bg-gray-50 p-4 md:p-5">
                <h3 className={sectionTitleClass}>
                  <span className={numberBadge}>🖼</span> รูปตัวอย่างการ์ด (การ์ดจริงที่สร้างแล้ว)
                </h3>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-[repeat(auto-fill,minmax(200px,1fr))]">
                  {urls.map((src, idx) => (
                    <div key={idx} className="aspect-square overflow-hidden rounded-lg border border-gray-200 bg-slate-100">
                      <img src={src} alt={`ตัวอย่างการ์ด ${idx + 1}`} className="h-full w-full object-cover" onError={(e) => { e.target.style.display = 'none'; e.target.parentElement.style.background = '#eee'; }} />
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          <div className="w-full">
            <form onSubmit={handleSubmit}>
              <div className="mb-6 rounded-xl border-2 border-gray-200 bg-gray-50 p-4 transition-colors hover:border-[#1DB446] md:p-5">
                <h3 className={sectionTitleClass}>
                  <span className={numberBadge}>1</span> การ์ดข้อมูลติดต่อ
                </h3>
                <div className="mb-5">
                  <label htmlFor="create-name" className={labelClass}>ชื่อ *</label>
                  <input
                    id="create-name"
                    type="text"
                    required
                    placeholder="กรอกชื่อ-นามสกุล"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    className={inputClass}
                  />
                </div>
                <div className="mb-5">
                  <label htmlFor="create-phone" className={labelClass}>Tel.</label>
                  <input
                    id="create-phone"
                    type="tel"
                    placeholder="เบอร์โทรศัพท์"
                    maxLength={10}
                    inputMode="numeric"
                    value={form.phone}
                    onChange={handlePhoneChange}
                    className={inputClass}
                  />
                  <small className="mt-1 block text-sm italic text-gray-500">ไม่เกิน 10 หลัก</small>
                </div>
                <div className="mb-5">
                  <label htmlFor="create-email" className={labelClass}>Email</label>
                  <input
                    id="create-email"
                    type="email"
                    placeholder="อีเมล"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    className={inputClass}
                  />
                </div>
                <div className="mb-5">
                  <label htmlFor="create-desc" className={labelClass}>รายละเอียด</label>
                  <textarea
                    id="create-desc"
                    rows={3}
                    placeholder="กรอกรายละเอียดสำหรับการ์ด..."
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="mb-6 rounded-xl border-2 border-gray-200 bg-gray-50 p-4 md:p-5">
                <h3 className={sectionTitleClass}>
                  <span className={numberBadge}>📷</span> รูปภาพ
                </h3>
                <div className="mb-5">
                  <label htmlFor="create-image1" className={labelClass}>อัพโหลดรูปภาพ</label>
                  <input
                    id="create-image1"
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp,image/heic,image/heif"
                    onChange={handleImageChange}
                    className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-[#1DB446] file:px-4 file:py-2 file:font-semibold file:text-white"
                  />
                  <small className="mt-1 block text-sm italic text-gray-500">รูปภาพสำหรับการ์ดแรก (การ์ดอื่นใช้ดีไซน์ใน template) รองรับ JPG, PNG, GIF, WebP, HEIC (iPhone) — ระบบแปลงเป็น WebP อัตโนมัติ</small>
                  {imagePreviewUrl && (
                    <div className="mt-3 text-center">
                      <img src={imagePreviewUrl} alt="Preview" className="mx-auto max-h-[200px] max-w-full rounded-lg object-cover shadow" />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-2.5">
                <button
                  type="button"
                  className="inline-flex min-h-[44px] items-center justify-center rounded-lg border-2 border-[#1DB446] bg-white px-5 py-3 font-semibold text-[#1DB446] hover:bg-[#1DB446] hover:text-white"
                  onClick={handleBackToTemplates}
                >
                  ย้อนกลับ
                </button>
                <button
                  type="submit"
                  className="flex-1 min-h-[44px] rounded-lg bg-[#1DB446] px-5 py-3 font-semibold text-white transition-all hover:bg-[#0FA03A] hover:-translate-y-0.5 hover:shadow-lg disabled:bg-gray-400 disabled:translate-y-0 disabled:shadow-none"
                  disabled={loading}
                >
                  {loading ? 'กำลังสร้าง...' : 'สร้างการ์ด'}
                </button>
              </div>
            </form>
          </div>
        </div>
        )}
      </div>
    </div>
  );
}

export default function CreatePage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-[1200px]">
          <CustomerAppBar />
          <div className="mb-4 rounded-xl bg-white px-4 py-3 shadow-[0_2px_10px_rgba(0,0,0,0.1)] md:px-8">
            <h2 className="text-lg font-semibold text-gray-800 md:text-xl">สร้างการ์ด</h2>
          </div>
          <div className="rounded-xl bg-white p-6 shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
            <p className="text-gray-500">กำลังโหลด...</p>
          </div>
        </div>
      }
    >
      <CreateContent />
    </Suspense>
  );
}
