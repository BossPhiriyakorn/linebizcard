'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import CustomerAppBar from '../../components/CustomerAppBar';
import { getToken, getHeaders } from '../../utils/auth';

const inputClass =
  'w-full rounded-xl border-2 border-gray-200 bg-gray-50 px-4 py-3 text-base transition-all focus:border-[#1DB446] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#1DB446]/15';
const labelClass = 'mb-2 block text-sm font-medium text-gray-800';

export default function EditCardPage() {
  const params = useParams();
  const id = params?.id;
  const router = useRouter();
  const [card, setCard] = useState(null);
  const [form, setForm] = useState({ name: '', phone: '', email: '', description: '' });
  const [image1, setImage1] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);
  const [alert, setAlert] = useState({ show: false, msg: '', type: 'error' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetch('/api/cards/' + id, { headers: getHeaders() })
      .then((r) => {
        if (r.status === 401) {
          window.location.href = '/';
          return null;
        }
        return r.json();
      })
      .then((data) => {
        if (data?.success && data.data) {
          const c = data.data;
          setCard(c);
          setForm({
            name: c.user_name || '',
            phone: c.user_phone || '',
            email: c.user_email || '',
            description: c.user_description || '',
          });
        }
      })
      .catch(() => setAlert({ show: true, msg: 'โหลดข้อมูลไม่สำเร็จ', type: 'error' }));
  }, [id]);

  const handlePhoneChange = (e) => {
    const v = e.target.value.replace(/\D/g, '').slice(0, 10);
    setForm((f) => ({ ...f, phone: v }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0] || null;
    if (file && file.size === 0) {
      setAlert({ show: true, msg: 'ไฟล์รูปว่างหรือไม่รองรับ ลองเลือกจากอัลบั้มหรือบันทึกรูปก่อน', type: 'error' });
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
    if (!card || !form.name?.trim()) return;
    if (form.phone.length > 10) {
      setAlert({ show: true, msg: 'เบอร์โทรศัพท์ไม่เกิน 10 หลัก', type: 'error' });
      return;
    }
    setLoading(true);
    const fd = new FormData();
    fd.append('name', form.name.trim());
    fd.append('phone', form.phone || '');
    fd.append('email', form.email || '');
    fd.append('description', form.description || '');
    if (image1) fd.append('image1', image1);
    try {
      const res = await fetch('/api/cards/' + id, {
        method: 'PUT',
        headers: getHeaders(),
        body: fd,
      });
      const data = await res.json();
      if (data.success) {
        setAlert({ show: true, msg: 'แก้ไขการ์ดสำเร็จ', type: 'success' });
        router.replace('/home?updated=1');
      } else {
        setAlert({ show: true, msg: data.message || 'แก้ไขไม่สำเร็จ', type: 'error' });
        setLoading(false);
      }
    } catch {
      setAlert({ show: true, msg: 'เกิดข้อผิดพลาด', type: 'error' });
      setLoading(false);
    }
  };

  if (!card && !alert.show) {
    return (
      <div className="mx-auto w-full max-w-[1200px]">
        <CustomerAppBar />
        <div className="mb-4 rounded-xl bg-white px-4 py-3 shadow-[0_2px_10px_rgba(0,0,0,0.1)] md:px-8">
          <h2 className="text-lg font-semibold text-gray-800 md:text-xl">แก้ไขการ์ด</h2>
        </div>
        <div className="rounded-xl bg-white p-6 shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
          <p className="text-gray-500">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  const previewImageUrl = imagePreviewUrl || card?.user_image || null;

  return (
    <div className="mx-auto w-full max-w-[1200px]">
      <CustomerAppBar />
      <div className="mb-4 rounded-xl bg-white px-4 py-3 shadow-[0_2px_10px_rgba(0,0,0,0.1)] md:px-8">
        <h2 className="text-lg font-semibold text-gray-800 md:text-xl">แก้ไขการ์ด</h2>
      </div>
      <div className="mb-4 rounded-xl bg-white p-4 shadow-[0_8px_30px_rgba(0,0,0,0.12)] md:p-8">
        {alert.show && (
          <div
            className={`mb-5 rounded-lg px-5 py-3.5 ${alert.type === 'error' ? 'border border-red-200 bg-red-50 text-red-800' : 'border border-green-200 bg-green-50 text-green-800'}`}
          >
            {alert.msg}
          </div>
        )}
        {card && (
          <>
            <h2 className="mb-5 text-xl font-bold text-gray-800">แก้ไขข้อมูลการ์ด</h2>
            <div className="flex flex-wrap gap-6 md:gap-8">
              <div className="min-w-0 flex-1 basis-[360px]">
                <form onSubmit={handleSubmit}>
                  <div className="mb-6 rounded-xl border-2 border-gray-200 bg-gray-50 p-4 md:p-5">
                    <div className="mb-5">
                      <label htmlFor="edit-name" className={labelClass}>ชื่อ *</label>
                      <input id="edit-name" type="text" required placeholder="กรอกชื่อ-นามสกุล" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className={inputClass} />
                    </div>
                    <div className="mb-5">
                      <label htmlFor="edit-phone" className={labelClass}>Tel.</label>
                      <input id="edit-phone" type="tel" placeholder="เบอร์โทรศัพท์" maxLength={10} inputMode="numeric" value={form.phone} onChange={handlePhoneChange} className={inputClass} />
                      <small className="mt-1 block text-sm italic text-gray-500">ไม่เกิน 10 หลัก</small>
                    </div>
                    <div className="mb-5">
                      <label htmlFor="edit-email" className={labelClass}>Email</label>
                      <input id="edit-email" type="email" placeholder="อีเมล" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} className={inputClass} />
                    </div>
                    <div className="mb-5">
                      <label htmlFor="edit-desc" className={labelClass}>รายละเอียด</label>
                      <textarea id="edit-desc" rows={3} placeholder="กรอกรายละเอียด..." value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className={inputClass} />
                    </div>
                  </div>
                  <div className="mb-6 rounded-xl border-2 border-gray-200 bg-gray-50 p-4 md:p-5">
                    <div className="mb-5">
                      <label htmlFor="edit-image1" className={labelClass}>รูปภาพ</label>
                      <input id="edit-image1" type="file" accept="image/jpeg,image/png,image/gif,image/webp,image/avif,image/heic,image/heif" onChange={handleImageChange} className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-[#1DB446] file:px-4 file:py-2 file:font-semibold file:text-white" />
                      <small className="mt-1 block text-sm italic text-gray-500">เว้นว่างไว้ถ้าไม่เปลี่ยนรูป รองรับ JPG, PNG, GIF, WebP, HEIC (iPhone)</small>
                      {imagePreviewUrl && (
                        <div className="mt-3 w-full overflow-hidden rounded-lg bg-gray-100">
                          <img src={imagePreviewUrl} alt="Preview" className="w-full max-w-full rounded-lg object-contain shadow" style={{ maxWidth: 2047, maxHeight: 2048 }} />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2.5">
                    <Link href="/home" className="inline-flex min-h-[44px] items-center justify-center rounded-lg border-2 border-[#1DB446] bg-white px-5 py-3 font-semibold text-[#1DB446] no-underline hover:bg-[#1DB446] hover:text-white">
                      ย้อนกลับ
                    </Link>
                    <button type="submit" className="flex-1 min-h-[44px] rounded-lg bg-[#1DB446] px-5 py-3 font-semibold text-white transition-all hover:bg-[#0FA03A] disabled:bg-gray-400" disabled={loading}>
                      {loading ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
                    </button>
                  </div>
                </form>
              </div>
              <div className="min-w-0 flex-1 basis-[360px] md:sticky md:top-5">
                <h3 className="mb-4 text-gray-800 font-semibold">📱 ตัวอย่างการ์ด</h3>
                <div className="flex justify-center">
                  <div className="w-full max-w-[min(100%,420px)] overflow-hidden rounded-xl bg-white shadow-lg">
                    <div className="relative flex min-h-[160px] items-center justify-center overflow-hidden bg-gradient-to-br from-[#667eea] to-[#764ba2]">
                      {previewImageUrl ? (
                        <img src={previewImageUrl} alt="" className="w-full max-w-full object-contain" style={{ maxWidth: 2047, maxHeight: 2048 }} />
                      ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                          <span className="text-4xl">📷</span>
                          <p className="text-sm">อัพโหลดรูปภาพ</p>
                        </div>
                      )}
                    </div>
                    <div className="p-4 md:p-5">
                      <div className="mb-2.5 text-lg font-bold text-[#1DB446]">{form.name.trim() || 'name'}</div>
                      <div className="my-3 h-px bg-gray-200" />
                      <div className="my-2.5">
                        <div className="text-xs text-gray-400">Tel.</div>
                        <div className="text-sm text-gray-600">{form.phone || '-'}</div>
                      </div>
                      <div className="my-2.5">
                        <div className="text-xs text-gray-400">Email</div>
                        <div className="text-sm text-gray-600 break-words">{form.email || '-'}</div>
                      </div>
                      <div className="my-3 h-px bg-gray-200" />
                      <div className="mt-2.5 text-sm text-gray-600 break-words">{form.description.trim() || 'description'}</div>
                    </div>
                    <div className="flex flex-col gap-2 border-t border-gray-200 bg-gray-50 p-3 md:p-4">
                      <div className="flex gap-2.5">
                        <button type="button" className="flex-1 min-h-[44px] rounded-lg bg-[#1DB446] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0FA03A]">โทร</button>
                        <button type="button" className="flex-1 min-h-[44px] rounded-lg border-2 border-[#1DB446] bg-white px-4 py-2.5 text-sm font-semibold text-[#1DB446] hover:bg-[#1DB446] hover:text-white">ส่งอีเมล</button>
                      </div>
                      <div className="flex gap-2.5">
                        <button type="button" className="min-h-[44px] flex-1 rounded-lg border border-gray-200 bg-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-800 hover:bg-gray-200">แชร์</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
