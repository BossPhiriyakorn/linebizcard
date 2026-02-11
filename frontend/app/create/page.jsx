'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import CustomerAppBar from '../components/CustomerAppBar';
import { getToken, getHeaders, handleAuthResponse } from '../utils/auth';

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
  const [loadingMsg, setLoadingMsg] = useState(''); // ข้อความแสดงขั้นตอน
  const [createdSuccess, setCreatedSuccess] = useState(false);

  useEffect(() => {
    const urlToken = searchParams.get('token');
    if (urlToken) {
      localStorage.setItem('token', urlToken);
      window.history.replaceState({}, '', window.location.pathname);
    }
    if (!getToken()) {
      router.replace('/liff/login');
      return;
    }
    fetch('/api/templates', { headers: getHeaders() })
      .then((r) => (handleAuthResponse(r) ? null : r.json()))
      .then((data) => {
        if (data == null) return;
        if (data.success && Array.isArray(data.data)) {
          setTemplates((data.data || []).filter((t) => t.is_active !== false));
        }
      })
      .catch(() => setAlert({ show: true, msg: 'โหลดแทมเพลตไม่สำเร็จ', type: 'error' }));
  }, [router, searchParams]);

  useEffect(() => {
    if (!getToken() || step !== 2) return;
    fetch('/api/user/profile', { headers: getHeaders() })
      .then((r) => (handleAuthResponse(r) ? null : r.json()))
      .then((data) => {
        if (data == null) return;
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

  // ส่ง log จาก frontend ไปแสดงใน pm2 logs บนเซิร์ฟเวอร์
  const sendLogToServer = async (level, message) => {
    try {
      await fetch('/api/debug-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ level, message, timestamp: new Date().toISOString() })
      });
    } catch (e) {
      // Silent fail - ไม่ให้ log เอง error
    }
  };

  /**
   * ลดขนาดไฟล์รูป (compress) โดยไม่เปลี่ยนความละเอียด (dimensions)
   * @param {File} file - ไฟล์รูปต้นฉบับ
   * @param {number} quality - คุณภาพ 0.0-1.0 (0.75 = 75%)
   * @param {number} maxSizeMB - ถ้าไฟล์ใหญ่กว่านี้ค่อย compress (default 2MB)
   * @returns {Promise<File>} - ไฟล์ที่ compress แล้ว
   */
  const compressImage = async (file, quality = 0.75, maxSizeMB = 2) => {
    // ถ้าเป็น HEIF/HEIC ไม่ต้อง compress (Browser ไม่รองรับ - ให้ server จัดการ)
    const isHeic = file.type === 'image/heic' || file.type === 'image/heif' || 
                   file.name.toLowerCase().endsWith('.heic') || 
                   file.name.toLowerCase().endsWith('.heif');
    if (isHeic) {
      const msg = `[Compress] ข้าม HEIF/HEIC (${file.name}) - ให้ server จัดการ`;
      console.log(msg);
      sendLogToServer('info', msg);
      return file;
    }
    
    // ถ้าไฟล์เล็กกว่า maxSizeMB ไม่ต้อง compress
    if (file.size <= maxSizeMB * 1024 * 1024) {
      const msg = `[Compress] ไฟล์ขนาด ${(file.size / 1024 / 1024).toFixed(2)}MB ไม่ต้อง compress (< ${maxSizeMB}MB)`;
      console.log(msg);
      sendLogToServer('info', msg);
      return file;
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const img = new Image();
        
        img.onload = () => {
          const canvas = document.createElement('canvas');
          
          // ใช้ขนาดเดิม (ไม่ resize dimensions)
          canvas.width = img.width;
          canvas.height = img.height;
          
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, img.width, img.height);
          
          // แปลงเป็น JPEG พร้อมลด quality
          canvas.toBlob(
            (blob) => {
              if (blob) {
                // สร้าง File object ใหม่จาก blob
                const compressedFile = new File(
                  [blob], 
                  file.name.replace(/\.\w+$/, '.jpg'), // เปลี่ยนนามสกุลเป็น .jpg
                  { type: 'image/jpeg' }
                );
                
                const originalSizeMB = (file.size / 1024 / 1024).toFixed(2);
                const compressedSizeMB = (compressedFile.size / 1024 / 1024).toFixed(2);
                const reduction = ((1 - compressedFile.size / file.size) * 100).toFixed(0);
                
                const msg = `[Compress] สำเร็จ: ${originalSizeMB}MB → ${compressedSizeMB}MB (ลด ${reduction}%) | ขนาด: ${img.width}x${img.height}px | คุณภาพ: ${quality * 100}%`;
                console.log(msg);
                sendLogToServer('info', msg);
                
                resolve(compressedFile);
              } else {
                reject(new Error('ไม่สามารถลดขนาดรูปได้'));
              }
            },
            'image/jpeg',
            quality  // คุณภาพ 0.75 = 75%
          );
        };
        
        img.onerror = () => reject(new Error('ไม่สามารถโหลดรูปได้'));
        img.src = e.target.result;
      };
      
      reader.onerror = () => reject(new Error('ไม่สามารถอ่านไฟล์ได้'));
      reader.readAsDataURL(file);
    });
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
    if (file && file.size === 0) {
      showAlertMsg('ไฟล์รูปว่างหรือไม่รองรับ (ลองเลือกจากอัลบั้มหรือบันทึกรูปก่อนอัปโหลด)', 'error');
      e.target.value = '';
      return;
    }
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
    if (!form.phone?.trim()) {
      showAlertMsg('กรุณากรอกเบอร์โทรศัพท์', 'error');
      return;
    }
    if (form.phone.length !== 10) {
      showAlertMsg('เบอร์โทรศัพท์ต้อง 10 หลัก', 'error');
      return;
    }
    if (!form.email?.trim()) {
      showAlertMsg('กรุณากรอกอีเมล', 'error');
      return;
    }
    if (!image1) {
      showAlertMsg('กรุณาอัปโหลดรูปภาพ', 'error');
      return;
    }
    
    setLoading(true);
    setAlert({ show: false, msg: '', type: 'error' });
    
    // ขั้นตอนที่ 1: ลดขนาดรูป (ถ้าใหญ่กว่า 2MB)
    let processedImage = image1;
    const originalSizeMB = (image1.size / 1024 / 1024).toFixed(2);
    
    const startMsg = `[Create-Frontend] เริ่มต้น: ${image1.name} (${originalSizeMB}MB)`;
    console.log(startMsg);
    sendLogToServer('info', startMsg);
    
    if (image1.size > 2 * 1024 * 1024) {
      try {
        setLoadingMsg(`กำลังลดขนาดรูป (${originalSizeMB}MB)...`);
        const compressStartMsg = `[Create-Frontend] เริ่มลดขนาดรูป (ขนาดเดิม ${originalSizeMB}MB)`;
        console.log(compressStartMsg);
        sendLogToServer('info', compressStartMsg);
        
        processedImage = await compressImage(image1, 0.75, 2);
        
        const compressedSizeMB = (processedImage.size / 1024 / 1024).toFixed(2);
        const reduction = ((1 - processedImage.size / image1.size) * 100).toFixed(0);
        const compressDoneMsg = `[Create-Frontend] ลดขนาดเสร็จ: ${originalSizeMB}MB → ${compressedSizeMB}MB (ลด ${reduction}%)`;
        console.log(compressDoneMsg);
        sendLogToServer('info', compressDoneMsg);
        setLoadingMsg(`ลดขนาดรูปเสร็จ (${originalSizeMB}MB → ${compressedSizeMB}MB)`);
        
        // รอ 500ms ให้เห็นข้อความ
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (err) {
        const errorMsg = `[Create-Frontend] ลดขนาดไม่สำเร็จ: ${err.message} - ใช้ไฟล์เดิม`;
        console.error(errorMsg);
        sendLogToServer('error', errorMsg);
        // ถ้า compress ไม่ได้ ใช้ไฟล์เดิม
        processedImage = image1;
        setLoadingMsg('ลดขนาดรูปไม่สำเร็จ ใช้ไฟล์เดิม');
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } else {
      const skipMsg = `[Create-Frontend] ไฟล์ขนาด ${originalSizeMB}MB ไม่ต้องลดขนาด (< 2MB)`;
      console.log(skipMsg);
      sendLogToServer('info', skipMsg);
    }
    
    // ขั้นตอนที่ 2: อัปโหลดและสร้างการ์ด
    setLoadingMsg('กำลังอัปโหลดและสร้างการ์ด...');
    const uploadMsg = `[Create-Frontend] เริ่มอัปโหลด: ${processedImage.name} (${(processedImage.size / 1024 / 1024).toFixed(2)}MB)`;
    console.log(uploadMsg);
    sendLogToServer('info', uploadMsg);
    
    const fd = new FormData();
    fd.append('template_id', selectedTemplate.id);
    fd.append('name', form.name.trim());
    if (form.phone) fd.append('phone', form.phone);
    if (form.email) fd.append('email', form.email);
    if (form.description) fd.append('description', form.description);
    fd.append('image1', processedImage);
    
    try {
      const res = await fetch('/api/create-card', {
        method: 'POST',
        headers: getHeaders(),
        body: fd,
      });
      
      const responseMsg = `[Create-Frontend] ได้รับ response: ${res.status} ${res.statusText}`;
      console.log(responseMsg);
      sendLogToServer('info', responseMsg);
      
      if (handleAuthResponse(res)) {
        setLoading(false);
        setLoadingMsg('');
        return;
      }
      const text = await res.text();
      let data;
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        const status = res.status;
        let msg = res.ok ? 'ตอบกลับไม่ถูกต้อง' : 'เกิดข้อผิดพลาดจากเซิร์ฟเวอร์';
        if (status === 408 || status === 504) msg = 'ใช้เวลานานเกินไป กรุณาลองใหม่ (ถ้าเลือกรูปจากกล้อง ลองใช้รูปจากอัลบั้ม)';
        else if (status === 413) msg = 'ไฟล์ใหญ่เกินไป ลองเลือกรูปจากอัลบั้มหรือลดขนาดรูป';
        else if (!res.ok) msg = 'เกิดข้อผิดพลาดจากเซิร์ฟเวอร์ — ถ้าเลือกรูปจากกล้อง ลองใช้รูปจากอัลบั้มหรือถ่ายใหม่แล้วเลือกจากอัลบั้ม';
        const parseErrorMsg = `[Create-Frontend] ❌ Parse error: ${status} ${text?.substring(0, 100)}`;
        console.error(parseErrorMsg);
        sendLogToServer('error', parseErrorMsg);
        showAlertMsg(msg, 'error');
        setLoading(false);
        setLoadingMsg('');
        return;
      }
      
      if (data.success) {
        const cardId = data.data?.unique_id || data.data?.id || 'unknown';
        const successMsg = `[Create-Frontend] ✅ สร้างการ์ดสำเร็จ: ${cardId}`;
        console.log(successMsg);
        sendLogToServer('info', successMsg);
        setLoadingMsg('สร้างการ์ดสำเร็จ! กำลังไปหน้าการ์ดของฉัน...');
        
        // รอ 800ms ให้เห็นข้อความ
        await new Promise(resolve => setTimeout(resolve, 800));
        
        setLoading(false);
        setLoadingMsg('');
        // ไปหน้าการ์ดของฉันพร้อม query ให้ SWR revalidate — ทุกยูสจะเห็นการ์ดใหม่ทันที
        router.push('/my-cards?created=1');
        return;
      } else {
        const failMsg = `[Create-Frontend] ❌ สร้างไม่สำเร็จ: ${data.message}`;
        console.error(failMsg);
        sendLogToServer('error', failMsg);
        showAlertMsg(data.message || 'สร้างไม่สำเร็จ', 'error');
        setLoading(false);
        setLoadingMsg('');
      }
    } catch (err) {
      const exceptionMsg = `[Create-Frontend] ❌ Exception: ${err.message}`;
      console.error(exceptionMsg);
      sendLogToServer('error', exceptionMsg);
      const msg = err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ — ถ้าเลือกรูปจากกล้อง ลองใช้รูปจากอัลบั้ม';
      showAlertMsg(msg, 'error');
      setLoading(false);
      setLoadingMsg('');
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
                  <label htmlFor="create-phone" className={labelClass}>Tel. *</label>
                  <input
                    id="create-phone"
                    type="tel"
                    required
                    placeholder="เบอร์โทรศัพท์ 10 หลัก"
                    maxLength={10}
                    inputMode="numeric"
                    value={form.phone}
                    onChange={handlePhoneChange}
                    className={inputClass}
                  />
                  <small className="mt-1 block text-sm italic text-gray-500">ต้องกรอก 10 หลัก</small>
                </div>
                <div className="mb-5">
                  <label htmlFor="create-email" className={labelClass}>Email *</label>
                  <input
                    id="create-email"
                    type="email"
                    required
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
                  <label htmlFor="create-image1" className={labelClass}>อัพโหลดรูปภาพ *</label>
                  <input
                    id="create-image1"
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp,image/avif,image/heic,image/heif"
                    onChange={handleImageChange}
                    className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-[#1DB446] file:px-4 file:py-2 file:font-semibold file:text-white"
                  />
                  <small className="mt-1 block text-sm italic text-gray-500">รูปภาพสำหรับการ์ดแรก (การ์ดอื่นใช้ดีไซน์ใน template) รองรับทุกรูปแบบรูปภาพ สูงสุด 1GB — ระบบแปลงเป็น WebP อัตโนมัติ</small>
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
                  className="flex-1 min-h-[44px] rounded-lg bg-[#1DB446] px-5 py-3 font-semibold text-white hover:bg-[#0FA03A] disabled:bg-gray-400 disabled:cursor-not-allowed"
                  disabled={loading || !form.name?.trim() || form.phone.length !== 10 || !form.email?.trim() || !image1}
                >
                  {loading ? (loadingMsg || 'กำลังสร้าง...') : 'สร้างการ์ด'}
                </button>
                {loading && loadingMsg && (
                  <div className="mt-3 rounded-lg bg-blue-50 border border-blue-200 px-4 py-2.5 text-sm text-blue-800">
                    <div className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>{loadingMsg}</span>
                    </div>
                  </div>
                )}
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
