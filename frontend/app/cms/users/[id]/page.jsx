'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getCmsHeaders, handleCmsResponse } from '../../cmsApi';

export default function UserDetailPage() {
  const params = useParams();
  const id = params?.id;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState({ user: null, membership: null, cards: [] });
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [paymentChannels, setPaymentChannels] = useState([]);
  const [pendingPayments, setPendingPayments] = useState([]);
  const [savedCouponNext, setSavedCouponNext] = useState(null);
  const [packages, setPackages] = useState([]);
  const [editMembershipOpen, setEditMembershipOpen] = useState(false);
  const [editForm, setEditForm] = useState({ end_date: '', package_id: '' });
  const [savingMembership, setSavingMembership] = useState(false);

  const loadDetail = () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    fetch('/api/cms/users/' + id, { headers: getCmsHeaders() })
      .then((r) => {
        if (handleCmsResponse(r)) return null;
        if (!r.ok) throw new Error('โหลดไม่สำเร็จ');
        return r.json();
      })
      .then((json) => {
        setLoading(false);
        if (json === null) return;
        if (json.success && json.data) {
          setData({
            user: json.data.user || null,
            membership: json.data.membership || null,
            cards: Array.isArray(json.data.cards) ? json.data.cards : [],
          });
        } else setError(json?.message || 'โหลดรายละเอียดไม่สำเร็จ');
      })
      .catch((err) => {
        setLoading(false);
        setError(err?.message || 'เกิดข้อผิดพลาด');
      });
  };

  useEffect(() => {
    loadDetail();
  }, [id]);

  useEffect(() => {
    if (!id) return;
    fetch('/api/cms/users/' + id + '/payment-history', { headers: getCmsHeaders() })
      .then((r) => (handleCmsResponse(r) ? null : r.json()))
      .then((json) => {
        if (json?.success && Array.isArray(json.data)) setPaymentHistory(json.data);
      })
      .catch(() => {});
  }, [id]);

  useEffect(() => {
    if (!id) return;
    fetch('/api/cms/users/' + id + '/payment-channels', { headers: getCmsHeaders() })
      .then((r) => (handleCmsResponse(r) ? null : r.json()))
      .then((json) => {
        if (json?.success && Array.isArray(json.data)) setPaymentChannels(json.data);
      })
      .catch(() => {});
  }, [id]);

  useEffect(() => {
    if (!id) return;
    fetch('/api/cms/users/' + id + '/pending-payments', { headers: getCmsHeaders() })
      .then((r) => (handleCmsResponse(r) ? null : r.json()))
      .then((json) => {
        if (json?.success && Array.isArray(json.data)) setPendingPayments(json.data);
      })
      .catch(() => {});
  }, [id]);

  useEffect(() => {
    if (!id) return;
    fetch('/api/cms/users/' + id + '/saved-coupon-next-payment', { headers: getCmsHeaders() })
      .then((r) => (handleCmsResponse(r) ? null : r.json()))
      .then((json) => {
        if (json?.success && json.data) setSavedCouponNext(json.data);
        else setSavedCouponNext(null);
      })
      .catch(() => setSavedCouponNext(null));
  }, [id]);

  useEffect(() => {
    fetch('/api/cms/packages', { headers: getCmsHeaders() })
      .then((r) => (handleCmsResponse(r) ? null : r.json()))
      .then((json) => {
        if (json?.success && Array.isArray(json.data)) setPackages(json.data);
      })
      .catch(() => {});
  }, []);

  const verifyPending = (pendingId, action) => {
    const body = action === 'reject' ? { action: 'reject', rejection_reason: window.prompt('เหตุผลการปฏิเสธ (ถ้ามี):') || '' } : { action: 'approve' };
    fetch('/api/cms/pending-payments/' + pendingId + '/verify', {
      method: 'PATCH',
      headers: { ...getCmsHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
      .then((r) => (handleCmsResponse(r) ? null : r.json()))
      .then((json) => {
        if (json?.success) {
          loadDetail();
          fetch('/api/cms/users/' + id + '/pending-payments', { headers: getCmsHeaders() })
            .then((r) => (handleCmsResponse(r) ? null : r.json()))
            .then((j) => { if (j?.success && Array.isArray(j.data)) setPendingPayments(j.data); });
          fetch('/api/cms/users/' + id + '/saved-coupon-next-payment', { headers: getCmsHeaders() })
            .then((r) => (handleCmsResponse(r) ? null : r.json()))
            .then((j) => { if (j?.success && j.data) setSavedCouponNext(j.data); else setSavedCouponNext(null); });
          fetch('/api/cms/users/' + id + '/payment-history', { headers: getCmsHeaders() })
            .then((r) => (handleCmsResponse(r) ? null : r.json()))
            .then((j) => { if (j?.success && Array.isArray(j.data)) setPaymentHistory(j.data); });
        }
      })
      .catch(() => {});
  };

  const openEditMembership = () => {
    if (!membership) return;
    const end = membership.end_date ? new Date(membership.end_date) : null;
    setEditForm({
      end_date: end ? end.toISOString().slice(0, 10) : '',
      package_id: membership.package_id != null ? String(membership.package_id) : '',
    });
    setEditMembershipOpen(true);
  };

  const saveMembership = () => {
    if (!id) return;
    setSavingMembership(true);
    fetch('/api/cms/users/' + id + '/membership', {
      method: 'PATCH',
      headers: { ...getCmsHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        end_date: editForm.end_date || undefined,
        package_id: editForm.package_id || undefined,
      }),
    })
      .then((r) => (handleCmsResponse(r) ? null : r.json()))
      .then((res) => {
        setSavingMembership(false);
        if (res?.success) {
          setEditMembershipOpen(false);
          loadDetail();
        }
      })
      .catch(() => setSavingMembership(false));
  };

  const computedRemainingDays = (() => {
    if (!editForm.end_date) return null;
    const end = new Date(editForm.end_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    const diff = Math.ceil((end - today) / (1000 * 60 * 60 * 24));
    return diff < 0 ? 0 : diff;
  })();

  const setActive = (userId, active) => {
    const action = active ? 'เปิดการใช้งาน' : 'ระงับการใช้งาน';
    if (!window.confirm(`ต้องการ${action}ผู้ใช้นี้หรือไม่?`)) return;
    fetch('/api/cms/users/' + userId + '/active', {
      method: 'PATCH',
      headers: { ...getCmsHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: active }),
    })
      .then((r) => {
        if (handleCmsResponse(r)) return null;
        return r.json().catch(() => null);
      })
      .then((res) => {
        if (res === null) return;
        if (res.success) {
          loadDetail();
        }
      })
      .catch(() => {});
  };

  const user = data.user;
  const membership = data.membership;
  const cards = data.cards;
  const fullName = user ? [user.first_name, user.last_name].filter(Boolean).join(' ') || user.nickname || user.username || '-' : '-';

  if (loading) {
    return (
      <div className="mb-6 rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
        <div className="flex flex-col items-center justify-center py-12 text-slate-500">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
          <p className="mt-3">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <p className="text-red-600">{error || 'ไม่พบผู้ใช้'}</p>
        <Link href="/cms/users" className="mt-4 inline-block text-violet-700 hover:underline">
          ← กลับไปรายการลูกค้า
        </Link>
      </div>
    );
  }

  return (
    <div className="mb-6 space-y-6">
      <div>
        <Link
          href="/cms/users"
          className="inline-flex items-center text-slate-600 hover:text-violet-700"
        >
          ← รายการลูกค้า
        </Link>
      </div>

      {/* ข้อมูลพื้นฐาน + รูปโปรไฟล์ */}
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-5 py-4">
          <span className="font-semibold">ข้อมูลส่วนตัว</span>
          {user.is_active !== false ? (
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
              onClick={() => setActive(user.id, false)}
            >
              ระงับการใช้งาน
            </button>
          ) : (
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-md bg-violet-700 px-4 py-2 text-sm font-medium text-white hover:bg-violet-800"
              onClick={() => setActive(user.id, true)}
            >
              เปิดการใช้งาน
            </button>
          )}
        </div>
        <div className="flex flex-col gap-6 p-5 md:flex-row md:items-start">
          <div className="shrink-0">
            {user.profile_image_url ? (
              <img
                src={user.profile_image_url}
                alt="โปรไฟล์"
                className="h-24 w-24 rounded-full object-cover ring-2 ring-gray-200"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-slate-200 text-3xl text-slate-500">
                {user.username ? user.username.charAt(0).toUpperCase() : '?'}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">ชื่อผู้ใช้</p>
              <p className="text-slate-800">{user.username || '-'}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">อีเมล</p>
              <p className="text-slate-800">{user.email || '-'}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">ชื่อ-นามสกุล</p>
              <p className="text-slate-800">{fullName}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">เบอร์โทร</p>
              <p className="text-slate-800">{user.phone || '-'}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">สถานะ</p>
              <p>
                {user.is_active !== false ? (
                  <span className="inline-block rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">ใช้งาน</span>
                ) : (
                  <span className="inline-block rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">ระงับ</span>
                )}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-slate-400">ลงทะเบียน</p>
              <p className="text-slate-800">{user.created_at ? new Date(user.created_at).toLocaleDateString('th-TH') : '-'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* วันที่สมัครสมาชิก / แพ็กเกจ / วันหมดอายุ / จำนวนวันคงเหลือ / สถานะยืนยันตัวตน */}
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-5 py-4">
          <span className="font-semibold">ข้อมูลสมาชิก</span>
          {membership && (
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-md bg-slate-600 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
              onClick={openEditMembership}
            >
              แก้ไข
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">วันที่สมัครสมาชิก</p>
            <p className="text-slate-800">
              {membership?.start_date ? new Date(membership.start_date).toLocaleDateString('th-TH') : '-'}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">แพ็กเกจที่ใช้</p>
            <p className="text-slate-800">{membership?.package_name || membership?.membership_type || '-'}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">วันหมดอายุ</p>
            <p className="text-slate-800">
              {membership?.end_date ? new Date(membership.end_date).toLocaleDateString('th-TH') : '-'}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">จำนวนวันคงเหลือ</p>
            <p className="text-slate-800">
              {membership?.remaining_days != null ? `${membership.remaining_days} วัน` : '-'}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">สถานะยืนยันตัวตน</p>
            <p>
              {user.email_verified ? (
                <span className="inline-block rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">ยืนยันแล้ว</span>
              ) : (
                <span className="inline-block rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">ยังไม่ยืนยัน</span>
              )}
            </p>
          </div>
        </div>
        {!membership && (
          <p className="border-t border-gray-100 px-5 py-3 text-sm text-slate-500">ยังไม่มีข้อมูลสมาชิกภาพ</p>
        )}
      </div>

      {/* ช่องทางการชำระเงิน */}
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-5 py-4 font-semibold">ช่องทางการชำระเงิน</div>
        <div className="overflow-x-auto p-4 md:p-5">
          {paymentChannels.length === 0 ? (
            <p className="py-8 text-center text-slate-500">ลูกค้ายังไม่ได้ลงทะเบียนช่องทางการชำระเงิน</p>
          ) : (
            <table className="w-full min-w-[640px] border-collapse">
              <thead>
                <tr>
                  <th className="border-b border-gray-200 bg-slate-50 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">ลำดับ</th>
                  <th className="border-b border-gray-200 bg-slate-50 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">ประเภท</th>
                  <th className="border-b border-gray-200 bg-slate-50 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">ชื่อ-นามสกุล</th>
                  <th className="border-b border-gray-200 bg-slate-50 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">รายละเอียดบัตร/บัญชี</th>
                  <th className="border-b border-gray-200 bg-slate-50 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">ลงทะเบียนเมื่อ</th>
                </tr>
              </thead>
              <tbody>
                {paymentChannels.map((ch, i) => {
                  const typeLabel = { qr_self: 'คิวอาร์โค้ด (ชำระด้วยตัวเอง)', credit_card: 'บัตรเครดิต', debit_card: 'บัตรเดบิต', bank_transfer: 'โอนธนาคาร', promptpay: 'พร้อมเพย์', other: 'อื่นๆ' }[ch.channel_type] || ch.channel_type;
                  const detail = ch.channel_type === 'qr_self' ? (ch.full_name || 'ชำระด้วยตัวเอง') : ch.card_last_four ? `${ch.card_brand || 'บัตร'} ****${ch.card_last_four}` : ch.bank_name && ch.bank_account_masked ? `${ch.bank_name} ${ch.bank_account_masked}` : ch.promptpay_phone ? `พร้อมเพย์ ${ch.promptpay_phone}` : ch.display_label || '-';
                  return (
                    <tr key={ch.id} className="hover:bg-slate-50">
                      <td className="border-b border-gray-200 px-3 py-2">{i + 1}</td>
                      <td className="border-b border-gray-200 px-3 py-2">
                        {typeLabel}
                        {ch.is_default && <span className="ml-1 rounded bg-violet-100 px-1.5 py-0.5 text-xs text-violet-700">หลัก</span>}
                      </td>
                      <td className="border-b border-gray-200 px-3 py-2">{ch.full_name || '-'}</td>
                      <td className="border-b border-gray-200 px-3 py-2 text-sm">{detail}</td>
                      <td className="border-b border-gray-200 px-3 py-2 text-sm">{ch.created_at ? new Date(ch.created_at).toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal แก้ไขข้อมูลสมาชิก */}
      {editMembershipOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg border border-gray-200 bg-white shadow-xl">
            <div className="border-b border-gray-200 px-5 py-4 font-semibold">แก้ไขข้อมูลสมาชิก</div>
            <div className="space-y-4 p-5">
              <p className="text-xs text-slate-500">จำนวนวันคงเหลือคำนวณจาก วันปัจจุบัน ถึง วันหมดอายุ (อัปเดตอัตโนมัติเมื่อเปลี่ยนวันหมดอายุ)</p>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">วันหมดอายุ</label>
                <input
                  type="date"
                  value={editForm.end_date}
                  onChange={(e) => setEditForm((f) => ({ ...f, end_date: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">แพ็กเกจ</label>
                <select
                  value={editForm.package_id}
                  onChange={(e) => setEditForm((f) => ({ ...f, package_id: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                >
                  <option value="">-- เลือกแพ็กเกจ --</option>
                  {packages.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-slate-400">จำนวนวันคงเหลือ (จากวันนี้ถึงวันหมดอายุ)</p>
                <p className="text-slate-800">
                  {computedRemainingDays != null ? `${computedRemainingDays} วัน` : '-'}
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-gray-200 px-5 py-4">
              <button
                type="button"
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-gray-50"
                onClick={() => setEditMembershipOpen(false)}
              >
                ยกเลิก
              </button>
              <button
                type="button"
                className="rounded-md bg-violet-700 px-4 py-2 text-sm font-medium text-white hover:bg-violet-800 disabled:opacity-50"
                onClick={saveMembership}
                disabled={savingMembership}
              >
                {savingMembership ? 'กำลังบันทึก...' : 'บันทึก'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* รายการการ์ดที่ลูกค้าสร้าง */}
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-5 py-4 font-semibold">การ์ดที่สร้าง</div>
        <div className="overflow-x-auto p-4 md:p-5">
          {cards.length === 0 ? (
            <p className="py-8 text-center text-slate-500">ลูกค้ายังไม่ได้สร้างการ์ด</p>
          ) : (
            <table className="w-full min-w-[500px] border-collapse">
              <thead>
                <tr>
                  <th className="border-b border-gray-200 bg-slate-50 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">ลำดับ</th>
                  <th className="border-b border-gray-200 bg-slate-50 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">ชื่อบนการ์ด</th>
                  <th className="border-b border-gray-200 bg-slate-50 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">แทมเพลต</th>
                  <th className="border-b border-gray-200 bg-slate-50 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">สร้างเมื่อ</th>
                  <th className="border-b border-gray-200 bg-slate-50 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">หมดอายุ</th>
                  <th className="border-b border-gray-200 bg-slate-50 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">ลิงค์</th>
                </tr>
              </thead>
              <tbody>
                {cards.map((c, i) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="border-b border-gray-200 px-3 py-2">{i + 1}</td>
                    <td className="border-b border-gray-200 px-3 py-2">{c.user_name || '-'}</td>
                    <td className="border-b border-gray-200 px-3 py-2">{c.template_name || '-'}</td>
                    <td className="border-b border-gray-200 px-3 py-2 text-sm">{c.created_at ? new Date(c.created_at).toLocaleDateString('th-TH') : '-'}</td>
                    <td className="border-b border-gray-200 px-3 py-2 text-sm">{c.expires_at ? new Date(c.expires_at).toLocaleDateString('th-TH') : '-'}</td>
                    <td className="border-b border-gray-200 px-3 py-2">
                      {c.liff_url ? (
                        <a href={c.liff_url} target="_blank" rel="noopener noreferrer" className="text-violet-600 hover:underline">
                          เปิด
                        </a>
                      ) : (
                        '-'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ประวัติการชำระเงิน (รอตรวจสอบ + รายการที่ชำระแล้ว) */}
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-5 py-4 font-semibold">ประวัติการชำระเงิน</div>
        <div className="overflow-x-auto p-4 md:p-5">
          {pendingPayments.length > 0 && (
            <>
              <p className="mb-3 text-sm font-medium text-amber-700">รอตรวจสอบ (QR แนบสลิปแล้ว)</p>
              <table className="mb-6 w-full min-w-[640px] border-collapse">
                <thead>
                  <tr>
                    <th className="border-b border-gray-200 bg-amber-50 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">วันที่</th>
                    <th className="border-b border-gray-200 bg-amber-50 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">แพ็กเกจ</th>
                    <th className="border-b border-gray-200 bg-amber-50 px-3 py-2 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">ราคาจริง (บาท)</th>
                    <th className="border-b border-gray-200 bg-amber-50 px-3 py-2 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">ส่วนลด</th>
                    <th className="border-b border-gray-200 bg-amber-50 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">สลิป</th>
                    <th className="border-b border-gray-200 bg-amber-50 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">ดำเนินการ</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingPayments.map((pp) => (
                    <tr key={pp.id} className="hover:bg-amber-50/50">
                      <td className="border-b border-gray-200 px-3 py-2 text-sm">{pp.created_at ? new Date(pp.created_at).toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                      <td className="border-b border-gray-200 px-3 py-2">{pp.package_name || '-'}</td>
                      <td className="border-b border-gray-200 px-3 py-2 text-right">{pp.amount != null ? Number(pp.amount).toLocaleString() : '0'}</td>
                      <td className="border-b border-gray-200 px-3 py-2 text-right text-sm">
                        {pp.extra_days != null && Number(pp.extra_days) > 0 ? `+${pp.extra_days} วัน` : (pp.discount_amount != null && Number(pp.discount_amount) > 0 ? Number(pp.discount_amount).toLocaleString() + ' บาท' : '-')}
                      </td>
                      <td className="border-b border-gray-200 px-3 py-2">
                        {pp.slip_image_url ? (
                          <a href={pp.slip_image_url.startsWith('http') ? pp.slip_image_url : (typeof window !== 'undefined' ? window.location.origin : '') + pp.slip_image_url} target="_blank" rel="noopener noreferrer" className="text-violet-600 hover:underline">ดูสลิป</a>
                        ) : (
                          <span className="text-slate-400">ยังไม่แนบ</span>
                        )}
                      </td>
                      <td className="border-b border-gray-200 px-3 py-2">
                        <button type="button" className="mr-2 rounded bg-green-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-green-700" onClick={() => verifyPending(pp.id, 'approve')}>ยืนยันเงินเข้า</button>
                        <button type="button" className="rounded bg-red-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-red-700" onClick={() => verifyPending(pp.id, 'reject')}>ปฏิเสธ</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
          <p className="mb-3 text-sm font-medium text-slate-600">รายการที่ชำระแล้ว / รอชำระ</p>
          {paymentHistory.length === 0 && pendingPayments.length === 0 && !savedCouponNext ? (
            <p className="py-8 text-center text-slate-500">ยังไม่มีประวัติการชำระเงิน</p>
          ) : paymentHistory.length === 0 && !savedCouponNext ? (
            <p className="py-4 text-center text-slate-500">ยังไม่มีรายการที่ชำระแล้ว</p>
          ) : (
            <table className="w-full min-w-[600px] border-collapse">
              <thead>
                <tr>
                  <th className="border-b border-gray-200 bg-slate-50 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">ลำดับ</th>
                  <th className="border-b border-gray-200 bg-slate-50 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">วันที่</th>
                  <th className="border-b border-gray-200 bg-slate-50 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">แพ็กเกจ / รายการ</th>
                  <th className="border-b border-gray-200 bg-slate-50 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">ประเภท</th>
                  <th className="border-b border-gray-200 bg-slate-50 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">สถานะ</th>
                  <th className="border-b border-gray-200 bg-slate-50 px-3 py-2 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">ราคาจริง (บาท)</th>
                  <th className="border-b border-gray-200 bg-slate-50 px-3 py-2 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">ส่วนลด</th>
                </tr>
              </thead>
              <tbody>
                {savedCouponNext && (
                  <tr className="bg-amber-50/50 hover:bg-amber-50">
                    <td className="border-b border-gray-200 px-3 py-2">0</td>
                    <td className="border-b border-gray-200 px-3 py-2 text-sm">
                      {savedCouponNext.created_at ? new Date(savedCouponNext.created_at).toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}
                    </td>
                    <td className="border-b border-gray-200 px-3 py-2">{savedCouponNext.name || savedCouponNext.code || 'คูปองส่วนลดเดือนถัดไป'}</td>
                    <td className="border-b border-gray-200 px-3 py-2">คูปองใช้รอบตัดอัตโนมัติ</td>
                    <td className="border-b border-gray-200 px-3 py-2">
                      <span className="inline-block rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">รอชำระ</span>
                    </td>
                    <td className="border-b border-gray-200 px-3 py-2 text-right">-</td>
                    <td className="border-b border-gray-200 px-3 py-2 text-right text-sm">
                      {savedCouponNext.discount_percent != null ? `จะได้ ${savedCouponNext.discount_percent}% (เพิ่มวัน)` : '-'}
                    </td>
                  </tr>
                )}
                {paymentHistory.map((row, i) => (
                  <tr key={row.id} className="hover:bg-slate-50">
                    <td className="border-b border-gray-200 px-3 py-2">{i + 1}</td>
                    <td className="border-b border-gray-200 px-3 py-2 text-sm">
                      {row.paid_at ? new Date(row.paid_at).toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}
                    </td>
                    <td className="border-b border-gray-200 px-3 py-2">{row.package_name || '-'}</td>
                    <td className="border-b border-gray-200 px-3 py-2">
                      {row.payment_type === 'renew' ? 'ต่อแพ็กเกจ' : 'ซื้อแพ็กเกจ'}
                    </td>
                    <td className="border-b border-gray-200 px-3 py-2">
                      <span className="inline-block rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-700">ชำระแล้ว</span>
                    </td>
                    <td className="border-b border-gray-200 px-3 py-2 text-right">{row.amount != null ? Number(row.amount).toLocaleString() : '0'}</td>
                    <td className="border-b border-gray-200 px-3 py-2 text-right text-sm">
                      {row.extra_days != null && Number(row.extra_days) > 0 ? `+${row.extra_days} วัน` : (row.discount_amount != null && Number(row.discount_amount) > 0 ? Number(row.discount_amount).toLocaleString() + ' บาท' : '-')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
