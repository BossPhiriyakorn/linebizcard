'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import CustomerAppBar from '../components/CustomerAppBar';

const token = () => (typeof window !== 'undefined' ? localStorage.getItem('token') : null);
const headers = () => ({ Authorization: 'Bearer ' + token() });

const inputClass =
  'w-full rounded-xl border-2 border-gray-200 bg-gray-50 px-4 py-3 text-base transition-all focus:border-[#1DB446] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#1DB446]/15';
const labelClass = 'mb-2 block text-sm font-medium text-gray-800';

function formatDate(value) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function ProfileContent() {
  const searchParams = useSearchParams();
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({ first_name: '', last_name: '', nickname: '', phone: '', email: '' });
  const [alert, setAlert] = useState({ show: false, msg: '', type: 'error' });
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [paymentChannels, setPaymentChannels] = useState([]);
  const [channelModalOpen, setChannelModalOpen] = useState(false);
  const [channelForm, setChannelForm] = useState({
    channel_type: 'promptpay',
    full_name: '',
    card_last_four: '',
    card_brand: '',
    bank_name: '',
    bank_account_masked: '',
    promptpay_phone: '',
    promptpay_id: '',
    is_default: false,
  });
  const [savingChannel, setSavingChannel] = useState(false);
  const [editingChannelId, setEditingChannelId] = useState(null);

  const fetchProfile = () => {
    fetch('/api/user/profile', { headers: headers() })
      .then((r) => {
        if (r.status === 401) {
          window.location.href = '/';
          return null;
        }
        return r.json();
      })
      .then((data) => {
        if (data?.success && data.data) {
          const p = data.data;
          setProfile(p);
          setForm({
            first_name: p.first_name || '',
            last_name: p.last_name || '',
            nickname: p.nickname || '',
            phone: p.phone || '',
            email: p.email || '',
          });
        }
      })
      .catch(() => setAlert({ show: true, msg: 'โหลดข้อมูลไม่สำเร็จ', type: 'error' }));
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchPaymentChannels = () => {
    fetch('/api/payment-channels', { headers: headers() })
      .then((r) => (r.status === 401 ? null : r.json()))
      .then((data) => {
        if (data?.success && Array.isArray(data.data)) setPaymentChannels(data.data);
      })
      .catch(() => {});
  };

  useEffect(() => {
    if (token()) fetchPaymentChannels();
  }, []);

  useEffect(() => {
    if (searchParams.get('verified') === '1') {
      setAlert({ show: true, msg: 'ยืนยันตัวตนสำเร็จแล้ว', type: 'success' });
      window.history.replaceState({}, '', '/profile');
      setTimeout(() => setAlert((a) => ({ ...a, show: false })), 5000);
    }
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/line/complete-profile', {
        method: 'POST',
        headers: { ...headers(), 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        setAlert({ show: true, msg: 'บันทึกโปรไฟล์แล้ว', type: 'success' });
        setEditing(false);
        fetchProfile();
      } else {
        setAlert({ show: true, msg: data.message || 'บันทึกไม่สำเร็จ', type: 'error' });
      }
    } catch {
      setAlert({ show: true, msg: 'เกิดข้อผิดพลาด', type: 'error' });
    }
    setLoading(false);
  };

  const displayName = profile
    ? [profile.first_name, profile.last_name].filter(Boolean).join(' ') || profile.username || 'ผู้ใช้'
    : '';

  const openAddChannel = () => {
    if (paymentChannels.length >= 1) {
      const ch = paymentChannels[0];
      setEditingChannelId(ch.id);
      setChannelForm({
        channel_type: ch.channel_type || 'qr_self',
        full_name: ch.full_name || [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || '',
        card_last_four: ch.card_last_four || '',
        card_brand: ch.card_brand || '',
        bank_name: ch.bank_name || '',
        bank_account_masked: ch.bank_account_masked || '',
        promptpay_phone: ch.promptpay_phone || '',
        promptpay_id: ch.promptpay_id || '',
        is_default: ch.is_default !== false,
      });
    } else {
      setEditingChannelId(null);
      setChannelForm({
        channel_type: 'qr_self',
        full_name: [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || '',
        card_last_four: '',
        card_brand: '',
        bank_name: '',
        bank_account_masked: '',
        promptpay_phone: '',
        promptpay_id: '',
        is_default: true,
      });
    }
    setChannelModalOpen(true);
  };

  const saveChannel = (e) => {
    e.preventDefault();
    setSavingChannel(true);
    const isEdit = Boolean(editingChannelId);
    const url = isEdit ? '/api/payment-channels/' + editingChannelId : '/api/payment-channels';
    const method = isEdit ? 'PUT' : 'POST';
    fetch(url, {
      method,
      headers: { ...headers(), 'Content-Type': 'application/json' },
      body: JSON.stringify(channelForm),
    })
      .then((r) => r.json())
      .then((data) => {
        setSavingChannel(false);
        if (data?.success) {
          setChannelModalOpen(false);
          setEditingChannelId(null);
          setAlert({ show: true, msg: isEdit ? 'เปลี่ยนช่องทางแล้ว' : 'เพิ่มช่องทางชำระเงินแล้ว', type: 'success' });
          fetchPaymentChannels();
        } else setAlert({ show: true, msg: data?.message || 'บันทึกไม่สำเร็จ', type: 'error' });
      })
      .catch(() => {
        setSavingChannel(false);
        setAlert({ show: true, msg: 'เกิดข้อผิดพลาด', type: 'error' });
      });
  };

  const deleteChannel = (id) => {
    if (!window.confirm('ต้องการลบช่องทางชำระเงินนี้หรือไม่?')) return;
    fetch('/api/payment-channels/' + id, { method: 'DELETE', headers: headers() })
      .then((r) => r.json())
      .then((data) => {
        if (data?.success) {
          setAlert({ show: true, msg: 'ลบแล้ว', type: 'success' });
          fetchPaymentChannels();
        } else setAlert({ show: true, msg: data?.message || 'ลบไม่สำเร็จ', type: 'error' });
      })
      .catch(() => setAlert({ show: true, msg: 'เกิดข้อผิดพลาด', type: 'error' }));
  };

  const channelTypeLabel = (t) => ({ qr_self: 'คิวอาร์โค้ด (ชำระด้วยตัวเอง)', credit_card: 'บัตรเครดิต', debit_card: 'บัตรเดบิต' }[t] || t);

  return (
    <div className="mx-auto w-full max-w-[1200px]">
      <CustomerAppBar />
      {/* ก้อนเดียว: แบ่งเป็น 2 คอลัมน์ (ข้อมูลสมาชิก | ข้อมูลส่วนตัว) */}
      <div className="rounded-xl bg-white p-4 shadow-[0_8px_30px_rgba(0,0,0,0.12)] md:p-6">
        <div className="mb-4 border-b-2 border-gray-100 pb-4">
          <h2 className="text-lg font-bold text-gray-800 md:text-xl">โปรไฟล์</h2>
        </div>
        {alert.show && (
          <div
            className={`mb-4 rounded-lg px-4 py-3 ${alert.type === 'error' ? 'border border-red-200 bg-red-50 text-red-800' : 'border border-green-200 bg-green-50 text-green-800'}`}
          >
            {alert.msg}
          </div>
        )}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
          {/* คอลัมน์ 1: รูปโปรไฟล์ + ข้อมูลสมาชิก */}
          <div className="rounded-xl border-2 border-gray-100 bg-gray-50/50 p-5">
            <div className="mb-4 flex justify-center">
              <div className="h-[100px] w-[100px] overflow-hidden rounded-full border-4 border-white bg-gray-200 shadow-md">
                {profile?.profile_image_url ? (
                  <img src={profile.profile_image_url} alt="โปรไฟล์" className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center bg-[#EDE9FE] text-3xl font-bold text-[#6B46C1]">
                    {displayName ? displayName.charAt(0).toUpperCase() : '?'}
                  </span>
                )}
              </div>
            </div>
            <h3 className="mb-3 border-b border-gray-200 pb-2 text-base font-bold text-gray-800">ข้อมูลสมาชิก</h3>
            <div className="flex flex-col gap-3">
              {/* แถว 1: วันสมัคร (ซ้าย) | วันหมดอายุ (ขวา) */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <span className="text-sm text-gray-500">วันสมัคร</span>
                  <span className="text-sm font-medium text-gray-800">
                    {profile?.membership?.start_date
                      ? formatDate(profile.membership.start_date)
                      : profile?.created_at
                        ? formatDate(profile.created_at)
                        : '-'}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-sm text-gray-500">วันหมดอายุ</span>
                  <span className="text-sm font-medium text-gray-800">
                    {profile?.membership?.end_date ? formatDate(profile.membership.end_date) : '-'}
                  </span>
                </div>
              </div>

              {/* แถว 2: จำนวนวันคงเหลือ (ซ้าย) | แพ็กเกจ (ขวา) */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <span className="text-sm text-gray-500">จำนวนวันคงเหลือ</span>
                  <span className="text-sm font-medium text-gray-800">
                    {profile?.membership?.remaining_days !== null && profile?.membership?.remaining_days !== undefined
                      ? `${profile.membership.remaining_days} วัน`
                      : '-'}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-sm text-gray-500">แพ็กเกจ</span>
                  <span className="text-sm font-medium text-gray-800">{profile?.membership?.package_name || '-'}</span>
                </div>
              </div>

              {/* แถว 3: สถานะ (เต็มความกว้าง) + ปุ่มยืนยันตัวตน */}
              <div className="flex flex-col gap-2 border-t border-gray-200 pt-3">
                <span className="text-sm text-gray-500">สถานะ</span>
                <div className="flex flex-wrap items-center gap-2">
                  {profile?.email_verified ? (
                    <>
                      <span className="inline-flex h-2 w-2 rounded-full bg-green-500"></span>
                      <span className="text-sm font-medium text-green-700">ยืนยันตัวตน</span>
                    </>
                  ) : (
                    <>
                      <span className="inline-flex h-2 w-2 rounded-full bg-yellow-500"></span>
                      <span className="text-sm font-medium text-yellow-700">ยังไม่ยืนยันตัวตน</span>
                      <Link
                        href="/verify-email"
                        className="ml-2 inline-flex items-center rounded-lg bg-[#1DB446] px-4 py-2 text-sm font-semibold text-white no-underline hover:bg-[#0FA03A]"
                      >
                        ยืนยันตัวตน
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* คอลัมน์ 2: ข้อมูลส่วนตัว */}
          <div className="min-w-0">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b-2 border-gray-100 pb-3">
              <h3 className="text-lg font-bold text-gray-800">ข้อมูลส่วนตัว</h3>
              {!editing && (
                <button
                  type="button"
                  className="min-w-[80px] rounded-lg border-2 border-[#1DB446] bg-white px-4 py-2.5 text-sm font-semibold text-[#1DB446] hover:bg-[#1DB446] hover:text-white"
                  onClick={() => setEditing(true)}
                >
                  แก้ไขข้อมูล
                </button>
              )}
            </div>
            {profile && (
              <>
                {editing ? (
                  <form onSubmit={handleSubmit}>
                    <div className="mb-5">
                      <label className={labelClass}>ชื่อ *</label>
                      <input
                        type="text"
                        value={form.first_name}
                        onChange={(e) => setForm((f) => ({ ...f, first_name: e.target.value }))}
                        className={inputClass}
                      />
                    </div>
                    <div className="mb-5">
                      <label className={labelClass}>นามสกุล *</label>
                      <input
                        type="text"
                        value={form.last_name}
                        onChange={(e) => setForm((f) => ({ ...f, last_name: e.target.value }))}
                        className={inputClass}
                      />
                    </div>
                    <div className="mb-5">
                      <label className={labelClass}>ชื่อเล่น</label>
                      <input
                        type="text"
                        value={form.nickname}
                        onChange={(e) => setForm((f) => ({ ...f, nickname: e.target.value }))}
                        className={inputClass}
                      />
                    </div>
                    <div className="mb-5">
                      <label className={labelClass}>เบอร์โทร</label>
                      <input
                        type="tel"
                        maxLength={10}
                        value={form.phone}
                        onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                        className={inputClass}
                      />
                    </div>
                    <div className="mb-5">
                      <label className={labelClass}>อีเมล</label>
                      <input
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                        className={inputClass}
                      />
                    </div>
                    <div className="mt-4 flex gap-2.5">
                      <button
                        type="button"
                        className="inline-flex min-h-[44px] items-center justify-center rounded-lg border-2 border-[#1DB446] bg-white px-5 py-3 font-semibold text-[#1DB446] hover:bg-[#1DB446] hover:text-white"
                        onClick={() => setEditing(false)}
                      >
                        ยกเลิก
                      </button>
                      <button
                        type="submit"
                        className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-[#1DB446] px-5 py-3 font-semibold text-white hover:bg-[#0FA03A] disabled:bg-gray-400"
                        disabled={loading}
                      >
                        {loading ? 'กำลังบันทึก...' : 'บันทึก'}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-1">
                      <span className="text-sm text-gray-500">ชื่อ-นามสกุล</span>
                      <span className="text-gray-800">{[profile.first_name, profile.last_name].filter(Boolean).join(' ') || '-'}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-sm text-gray-500">ชื่อเล่น</span>
                      <span className="text-gray-800">{profile.nickname || '-'}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-sm text-gray-500">เบอร์โทร</span>
                      <span className="text-gray-800">{profile.phone || '-'}</span>
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-sm text-gray-500">อีเมล</span>
                      <span className="text-gray-800">{profile.email || '-'}</span>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* ช่องทางการชำระเงิน */}
      <div className="mt-6 rounded-xl bg-white p-4 shadow-[0_8px_30px_rgba(0,0,0,0.12)] md:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b-2 border-gray-100 pb-3">
          <h3 className="text-lg font-bold text-gray-800">ช่องทางการชำระเงิน</h3>
          <button
            type="button"
            className="rounded-lg bg-[#1DB446] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#0FA03A]"
            onClick={openAddChannel}
          >
            {paymentChannels.length >= 1 ? 'เปลี่ยนช่องทางการชำระเงิน' : '+ เพิ่มช่องทางชำระเงิน'}
          </button>
        </div>
        <p className="mb-4 text-sm text-gray-500">ลงทะเบียนวิธีชำระเงินสำหรับใช้ในระบบ (ระบบไม่เก็บเลขบัตรเต็ม เพื่อความปลอดภัย)</p>
        {paymentChannels.length === 0 ? (
          <p className="py-8 text-center text-gray-500">ยังไม่มีช่องทางชำระเงิน กดปุ่มด้านบนเพื่อเพิ่ม</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[500px] border-collapse">
              <thead>
                <tr>
                  <th className="border-b border-gray-200 bg-gray-50 px-3 py-2 text-left text-xs font-semibold uppercase text-gray-500">ประเภท</th>
                  <th className="border-b border-gray-200 bg-gray-50 px-3 py-2 text-left text-xs font-semibold uppercase text-gray-500">ชื่อ-นามสกุล</th>
                  <th className="border-b border-gray-200 bg-gray-50 px-3 py-2 text-left text-xs font-semibold uppercase text-gray-500">รายละเอียด</th>
                  <th className="border-b border-gray-200 bg-gray-50 px-3 py-2 text-right text-xs font-semibold uppercase text-gray-500">ดำเนินการ</th>
                </tr>
              </thead>
              <tbody>
                {paymentChannels.map((ch) => {
                  const detail = ch.channel_type === 'qr_self' ? (ch.full_name || 'ชำระด้วยตัวเอง') : ch.card_last_four ? `${ch.card_brand || 'บัตร'} ****${ch.card_last_four}` : ch.display_label || '-';
                  return (
                    <tr key={ch.id} className="hover:bg-gray-50">
                      <td className="border-b border-gray-200 px-3 py-2">
                        {channelTypeLabel(ch.channel_type)}
                        {ch.is_default && <span className="ml-1 rounded bg-green-100 px-1.5 py-0.5 text-xs text-green-700">หลัก</span>}
                      </td>
                      <td className="border-b border-gray-200 px-3 py-2">{ch.full_name || '-'}</td>
                      <td className="border-b border-gray-200 px-3 py-2 text-sm">{detail}</td>
                      <td className="border-b border-gray-200 px-3 py-2 text-right">
                        <button type="button" className="text-red-600 hover:underline" onClick={() => deleteChannel(ch.id)}>ลบ</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal เพิ่มช่องทางชำระเงิน */}
      {channelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white shadow-xl">
            <div className="border-b border-gray-200 px-5 py-4 font-semibold">{editingChannelId ? 'เปลี่ยนช่องทางการชำระเงิน' : 'เพิ่มช่องทางชำระเงิน'}</div>
            <form onSubmit={saveChannel} className="space-y-4 p-5">
              <div>
                <label className={labelClass}>ประเภทช่องทาง *</label>
                <select
                  value={channelForm.channel_type}
                  onChange={(e) => setChannelForm((f) => ({ ...f, channel_type: e.target.value }))}
                  className={inputClass}
                >
                  <option value="qr_self">คิวอาร์โค้ด (ชำระด้วยตัวเอง)</option>
                  <option value="credit_card">บัตรเครดิต (ตัดเงินอัตโนมัติ)</option>
                  <option value="debit_card">บัตรเดบิต (ตัดเงินอัตโนมัติ)</option>
                </select>
              </div>

              {(channelForm.channel_type === 'credit_card' || channelForm.channel_type === 'debit_card') ? (
                <>
                  <div className="rounded-lg border-2 border-amber-200 bg-amber-50 p-4">
                    <p className="mb-2 font-semibold text-amber-800">รอพัฒนาก่อน</p>
                    <p className="mb-3 text-sm text-amber-700">
                      ช่องทางบัตรเครดิต/เดบิต (ตัดเงินอัตโนมัติ) กำลังเตรียมการเชื่อมต่อ Payment Gateway
                      เมื่อเชื่อมต่อแล้ว ลูกค้าจะสามารถลงทะเบียนบัตรเพื่อตัดยอดอัตโนมัติได้จากหน้านี้
                    </p>
                    <div className="rounded border border-amber-200 bg-white/60 p-3 text-sm text-gray-600">
                      <p className="mb-2 font-medium text-gray-700">เตรียมระบบสำหรับการเชื่อมต่อ Payment Gateway</p>
                      <ul className="list-inside list-disc space-y-1 text-xs">
                        <li>ฟอร์มกรอกข้อมูลบัตรจะแสดงเมื่อเชื่อมต่อ Gateway แล้ว</li>
                        <li>ระบบจะไม่เก็บเลขบัตรเต็ม (ตามมาตรฐาน PCI)</li>
                        <li>ตัดยอดอัตโนมัติเมื่อเลือกแพ็กเกจด้วยวิธีชำระบัตร</li>
                      </ul>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button type="button" className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50" onClick={() => { setChannelModalOpen(false); setEditingChannelId(null); }}>ปิด</button>
                    <button type="button" className="rounded-lg bg-gray-400 px-4 py-2.5 text-sm font-medium text-white cursor-not-allowed" disabled>บันทึก (รอพัฒนาก่อน)</button>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className={labelClass}>ชื่อ-นามสกุล (สำหรับใบเสร็จ/การชำระเงิน)</label>
                    <input
                      type="text"
                      value={channelForm.full_name}
                      onChange={(e) => setChannelForm((f) => ({ ...f, full_name: e.target.value }))}
                      className={inputClass}
                      placeholder="ชื่อผู้โอน (สำหรับตรวจสอบสลิป)"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="ch_default"
                      checked={channelForm.is_default}
                      onChange={(e) => setChannelForm((f) => ({ ...f, is_default: e.target.checked }))}
                      className="rounded border-gray-300"
                    />
                    <label htmlFor="ch_default" className="text-sm font-medium text-gray-700">ตั้งเป็นช่องทางหลัก</label>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button type="button" className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50" onClick={() => { setChannelModalOpen(false); setEditingChannelId(null); }}>ยกเลิก</button>
                    <button type="submit" className="rounded-lg bg-[#1DB446] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#0FA03A] disabled:opacity-50" disabled={savingChannel}>{savingChannel ? 'กำลังบันทึก...' : 'บันทึก'}</button>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense fallback={
      <div className="mx-auto w-full max-w-[800px]">
        <CustomerAppBar />
        <div className="flex flex-col items-center justify-center py-16">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#1DB446]/30 border-t-[#1DB446]" />
          <p className="mt-3 text-gray-500">กำลังโหลด...</p>
        </div>
      </div>
    }>
      <ProfileContent />
    </Suspense>
  );
}
