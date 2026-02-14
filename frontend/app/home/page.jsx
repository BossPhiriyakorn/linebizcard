'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import CustomerAppBar from '../components/CustomerAppBar';
import { getToken, getHeaders, handleAuthResponse, clearTokenAndRedirectToLogin, isMembershipExpired } from '../utils/auth';

function formatDate(value) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function HomeContent() {
  const searchParams = useSearchParams();
  const [profile, setProfile] = useState(null);
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState({ show: false, msg: '', type: 'success' });
  const [membershipExpired, setMembershipExpired] = useState(false);

  useEffect(() => {
    const created = searchParams.get('created') === '1';
    const updated = searchParams.get('updated') === '1';
    const membershipExpiredRedirect = searchParams.get('membership_expired') === '1';
    
    if (membershipExpiredRedirect) {
      setAlert({ show: true, msg: 'ยังไม่ได้สมัครแพ็กเกจ กรุณาสมัครแพ็กเกจเพื่อใช้งานการ์ด', type: 'error' });
      setMembershipExpired(true);
      window.history.replaceState({}, '', '/home');
      setTimeout(() => setAlert((a) => ({ ...a, show: false })), 6000);
    } else if (created) {
      setAlert({ show: true, msg: 'สร้างการ์ดสำเร็จ! คัดลอกลิงค์เพื่อแชร์ใน LINE', type: 'success' });
      window.history.replaceState({}, '', '/home');
      setTimeout(() => setAlert((a) => ({ ...a, show: false })), 5000);
    } else if (updated) {
      setAlert({ show: true, msg: 'แก้ไขการ์ดสำเร็จ!', type: 'success' });
      window.history.replaceState({}, '', '/home');
      setTimeout(() => setAlert((a) => ({ ...a, show: false })), 5000);
    }
  }, [searchParams]);

  // รับ token จาก URL หลังล็อกอิน (redirect มาหน้าแรกเสมอ)
  useEffect(() => {
    const urlToken = searchParams.get('token');
    if (urlToken && typeof window !== 'undefined') {
      localStorage.setItem('token', urlToken);
      window.history.replaceState({}, '', '/home');
    }
  }, [searchParams]);

  useEffect(() => {
    const t = getToken();
    if (!t) {
      window.location.href = '/liff/login';
      return;
    }
    Promise.all([
      fetch('/api/user/profile', { headers: getHeaders() }).then((r) => {
        if (handleAuthResponse(r)) return null; // 401 → redirect ไป login
        if (r.status === 403) { clearTokenAndRedirectToLogin(); return null; } // บัญชีถูกระงับ
        return r.json();
      }),
      fetch('/api/my-cards', { headers: getHeaders() }).then((r) => {
        // 401 เท่านั้นที่ redirect (handleAuthResponse) — 403 จาก my-cards = สมาชิกหมดอายุ ไม่ redirect
        if (handleAuthResponse(r)) return null;
        return r.json();
      }),
    ])
      .then(([profileRes, cardsRes]) => {
        setLoading(false);
        if (profileRes?.success && profileRes.data) setProfile(profileRes.data);
        // redirect เฉพาะเมื่อ profile ล้มเหลว (ไม่มี token / บัญชีระงับ) — ไม่ redirect เพราะสมาชิกหมดอายุ
        if (profileRes === null || (profileRes && !profileRes.success)) {
          clearTokenAndRedirectToLogin();
          return;
        }

        // เช็คว่ามีแพ็กเกจหรือไม่จาก 2 แหล่ง:
        // 1) my-cards ตอบ 403 (MEMBERSHIP_EXPIRED)
        // 2) profile.membership.package_name = null/empty (ยังไม่ได้สมัครแพ็กเกจ หรือหมดอายุแล้ว)
        let expired = false;
        if (isMembershipExpired(cardsRes)) {
          expired = true;
        }
        // เช็คเพิ่มจาก profile data — ใช้ package_name เป็นตัวบ่งชี้
        if (profileRes?.success && profileRes.data) {
          const m = profileRes.data.membership;
          if (!m || !m.package_name) {
            expired = true;
          }
        }

        if (expired) {
          setMembershipExpired(true);
        } else if (cardsRes?.success && Array.isArray(cardsRes.data)) {
          setCards(cardsRes.data);
        }
      })
      .catch(() => setLoading(false));
  }, []);

  // การ์ดล่าสุด (เรียงตาม created_at ล่าสุดแล้วเอาใบแรก)
  const latestCard =
    cards.length === 0
      ? null
      : [...cards].sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))[0];

  const displayName = profile
    ? [profile.first_name, profile.last_name].filter(Boolean).join(' ') || profile.username || 'ผู้ใช้'
    : '';

  const deleteCard = (cardId) => {
    if (!window.confirm('คุณแน่ใจหรือไม่ว่าต้องการลบการ์ดนี้?')) return;
    fetch('/api/cards/' + cardId, { method: 'DELETE', headers: getHeaders() })
      .then((r) => (handleAuthResponse(r) ? null : r.json()))
      .then((data) => {
        if (data == null) return;
        if (data.success) {
          setCards((prev) => prev.filter((c) => c.id !== cardId));
          setAlert({ show: true, msg: 'ลบการ์ดแล้ว', type: 'success' });
        } else setAlert({ show: true, msg: data.message || 'ลบไม่สำเร็จ', type: 'error' });
      })
      .catch(() => setAlert({ show: true, msg: 'เกิดข้อผิดพลาด', type: 'error' }));
  };

  const copyLink = (url) => {
    navigator.clipboard.writeText(url).then(() => setAlert({ show: true, msg: 'คัดลอกลิงค์แล้ว!', type: 'success' }));
    setTimeout(() => setAlert((a) => ({ ...a, show: false })), 2000);
  };

  const shareLink = (url, card) => {
    if (card?.unique_id) {
      localStorage.setItem('share_card_name', card.unique_id);
      localStorage.setItem('share_card_id', '1');
    }
    // ต้องไปที่ LIFF URL เพื่อให้หน้าแชร์โหลดใน LINE และ shareTargetPicker ทำงานได้
    window.location.href = url;
  };

  if (!getToken()) return null;

  return (
    <div className="mx-auto w-full max-w-[1200px]">
      <CustomerAppBar />

      {/* ก้อนเดียว: คอลัมน์ซ้าย = การ์ดสรุป, คอลัมน์ขวา = การ์ดของฉัน */}
      <div className="rounded-xl bg-white p-4 shadow-[0_8px_30px_rgba(0,0,0,0.12)] md:p-6">
        {alert.show && (
          <div
            className={`mb-4 rounded-lg px-4 py-3 ${alert.type === 'error' ? 'border border-red-200 bg-red-50 text-red-800' : 'border border-green-200 bg-green-50 text-green-800'}`}
          >
            {alert.msg}
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 md:flex-row md:gap-8">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#1DB446]/30 border-t-[#1DB446]" />
            <p className="mt-3 text-gray-500 md:mt-0">กำลังโหลด...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[340px_1fr]">
            {/* คอลัมน์ 1: การ์ดสรุป — รูปบนกลางขนาดใหญ่ ข้อมูลอยู่ข้างล่าง พื้นหลังเดียวกับแอป */}
            <div
              className="rounded-xl p-5 md:p-6"
              style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
            >
              <div className="flex flex-col items-center">
                {/* บนกลาง: รูปโปรไฟล์ขนาดใหญ่ */}
                <div className="mb-4 h-28 w-28 overflow-hidden rounded-full border-4 border-white/80 shadow-lg md:h-36 md:w-36">
                  {profile?.profile_image_url ? (
                    <img src={profile.profile_image_url} alt="โปรไฟล์" className="h-full w-full object-cover" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center bg-white/20 text-3xl font-bold text-white md:text-4xl">
                      {displayName ? displayName.charAt(0).toUpperCase() : '?'}
                    </span>
                  )}
                </div>
                {/* ข้างล่าง: ชื่อ + รายละเอียด */}
                <h2 className="mb-3 text-center text-lg font-bold text-white md:text-xl">{displayName || '-'}</h2>
                <div className="w-full space-y-2.5 text-sm">
                  <div className="flex justify-between gap-2 text-white/95">
                    <span className="text-white/80">วันสมัคร</span>
                    <span className="font-medium shrink-0">
                      {profile?.membership?.start_date
                        ? formatDate(profile.membership.start_date)
                        : profile?.created_at
                          ? formatDate(profile.created_at)
                          : '-'}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2 text-white/95">
                    <span className="text-white/80">วันหมดอายุ</span>
                    <span className="font-medium shrink-0">
                      {profile?.membership?.end_date ? formatDate(profile.membership.end_date) : '-'}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2 text-white/95">
                    <span className="text-white/80">แพ็กเกจ</span>
                    <span className="font-medium shrink-0">{profile?.membership?.package_name || '-'}</span>
                  </div>
                  <div className="flex justify-between gap-2 text-white/95">
                    <span className="text-white/80">จำนวนการ์ด</span>
                    <span className="font-bold text-[#a7f3d0] shrink-0">{cards.length} ใบ</span>
                  </div>
                  <div className="flex justify-between items-center gap-2 text-white/95">
                    <span className="text-white/80">สถานะยืนยันตัวตน</span>
                    <span className="shrink-0">
                      {profile?.email_verified ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-500/90 px-2.5 py-0.5 text-xs font-medium text-white">
                          <span className="h-1.5 w-1.5 rounded-full bg-white" />
                          ยืนยันแล้ว
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/90 px-2.5 py-0.5 text-xs font-medium text-white">
                          <span className="h-1.5 w-1.5 rounded-full bg-white" />
                          ยังไม่ยืนยัน
                        </span>
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* คอลัมน์ 2: การ์ดของฉัน */}
            <div className="min-w-0">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-lg font-bold text-gray-800 md:text-xl">การ์ดของฉัน</h3>
                {!membershipExpired && (
                  <Link
                    href="/my-cards"
                    className="text-sm font-medium text-[#1DB446] no-underline hover:underline"
                  >
                    ดูทั้งหมด
                  </Link>
                )}
              </div>

              {membershipExpired ? (
                <div className="rounded-xl border-2 border-dashed border-amber-300 bg-amber-50 py-12 text-center">
                  <p className="mb-2 text-2xl">📦</p>
                  <p className="mb-2 font-medium text-amber-800">ยังไม่ได้สมัครแพ็กเกจ</p>
                  <p className="mb-4 text-sm text-amber-700">กรุณาสมัครแพ็กเกจเพื่อใช้งานการ์ด</p>
                  <Link
                    href="/choose-package"
                    className="inline-flex items-center justify-center rounded-lg bg-amber-500 px-5 py-3 font-semibold text-white no-underline hover:bg-amber-600"
                  >
                    สมัครแพ็กเกจ
                  </Link>
                </div>
              ) : !latestCard ? (
                <div className="rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 py-12 text-center">
                  <p className="mb-2 font-medium text-gray-600">ยังไม่มีการ์ด</p>
                  <p className="mb-4 text-sm text-gray-500">เริ่มสร้างการ์ดแรกของคุณเลย!</p>
                  <Link
                    href="/create"
                    className="inline-flex items-center justify-center rounded-lg bg-[#1DB446] px-5 py-3 font-semibold text-white no-underline hover:bg-[#0FA03A]"
                  >
                    สร้างการ์ดใหม่
                  </Link>
                </div>
              ) : (
                <div
                  className={`flex min-w-0 flex-col rounded-xl border bg-white p-4 shadow-sm transition-all hover:shadow-md ${
                    latestCard.template_name === 'ออกแบบเอง'
                      ? 'border-violet-200 hover:border-violet-400 ring-1 ring-violet-100'
                      : 'border-gray-200 hover:border-[#1DB446]'
                  }`}
                >
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <h4 className="min-w-0 truncate font-medium text-gray-800">{latestCard.user_name || 'ไม่ระบุชื่อ'}</h4>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium text-white ${
                        latestCard.template_name === 'ออกแบบเอง' ? 'bg-violet-600' : 'bg-[#1DB446]'
                      }`}
                    >
                      {latestCard.template_name || 'Template'}
                    </span>
                  </div>
                  {latestCard.user_image && (
                    <div className="mb-3 w-full overflow-hidden rounded-lg bg-gray-100">
                      <img src={latestCard.user_image} alt="การ์ด" className="w-full rounded-lg object-contain" style={{ maxWidth: 2047, maxHeight: 2048 }} />
                    </div>
                  )}
                  <div className="mb-3 space-y-1 text-xs text-gray-500">
                    {latestCard.user_phone && <p>📞 {latestCard.user_phone}</p>}
                    {latestCard.user_email && <p>✉️ {latestCard.user_email}</p>}
                    {latestCard.expires_at && (
                      <p>หมดอายุ: {new Date(latestCard.expires_at).toLocaleDateString('th-TH')}</p>
                    )}
                  </div>
                  <div className="mt-auto flex flex-wrap gap-2">
                    {membershipExpired ? (
                      <>
                        <button
                          type="button"
                          disabled
                          className="flex-1 min-w-[70px] rounded-lg bg-gray-300 px-3 py-2 text-center text-sm font-semibold text-gray-500 cursor-not-allowed"
                          title="ยังไม่ได้สมัครแพ็กเกจ ไม่สามารถแก้ไขได้"
                        >
                          แก้ไข
                        </button>
                        <button
                          type="button"
                          className="flex-1 min-w-[70px] rounded-lg border border-[#1DB446] px-3 py-2 text-sm font-semibold text-[#1DB446] hover:bg-[#1DB446] hover:text-white"
                          onClick={() => copyLink(latestCard.liff_url)}
                        >
                          คัดลอก
                        </button>
                        <button
                          type="button"
                          disabled
                          className="flex-1 min-w-[70px] rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-400 cursor-not-allowed"
                          title="ยังไม่ได้สมัครแพ็กเกจ ไม่สามารถแชร์ได้"
                        >
                          แชร์
                        </button>
                      </>
                    ) : (
                      <>
                        {latestCard.template_name === 'ออกแบบเอง' ? (
                          <button
                            type="button"
                            className="flex-1 min-w-[70px] rounded-lg bg-red-600 px-3 py-2 text-center text-sm font-semibold text-white hover:bg-red-700"
                            onClick={() => deleteCard(latestCard.id)}
                          >
                            ลบ
                          </button>
                        ) : (
                          <Link
                            href={'/edit-card/' + latestCard.id}
                            className="flex-1 min-w-[70px] rounded-lg bg-[#1DB446] px-3 py-2 text-center text-sm font-semibold text-white no-underline hover:bg-[#0FA03A]"
                          >
                            แก้ไข
                          </Link>
                        )}
                        <button
                          type="button"
                          className="flex-1 min-w-[70px] rounded-lg border border-[#1DB446] px-3 py-2 text-sm font-semibold text-[#1DB446] hover:bg-[#1DB446] hover:text-white"
                          onClick={() => copyLink(latestCard.liff_url)}
                        >
                          คัดลอก
                        </button>
                        <button
                          type="button"
                          className="flex-1 min-w-[70px] rounded-lg border border-[#1DB446] px-3 py-2 text-sm font-semibold text-[#1DB446] hover:bg-[#1DB446] hover:text-white"
                          onClick={() => shareLink(latestCard.liff_url, latestCard)}
                        >
                          แชร์
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={
      <div className="mx-auto w-full max-w-[1200px]">
        <CustomerAppBar />
        <div className="flex flex-col items-center justify-center py-16">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#1DB446]/30 border-t-[#1DB446]" />
          <p className="mt-3 text-gray-500">กำลังโหลด...</p>
        </div>
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
}
