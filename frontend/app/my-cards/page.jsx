'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import CustomerAppBar from '../components/CustomerAppBar';
import { getToken, getHeaders, handleAuthResponse, isMembershipExpired } from '../utils/auth';

const MY_CARDS_KEY = '/api/my-cards';

async function fetcherMyCards(url) {
  const r = await fetch(url, { headers: getHeaders(), cache: 'no-store' });
  if (handleAuthResponse(r)) throw new Error('Unauthorized');
  const data = await r.json();
  if (isMembershipExpired(data)) {
    const err = new Error(data?.message || 'สมาชิกหมดอายุ');
    err.code = 'MEMBERSHIP_EXPIRED';
    throw err;
  }
  if (!data?.success) throw new Error(data?.message || 'โหลดข้อมูลไม่สำเร็จ');
  return Array.isArray(data.data) ? data.data : [];
}

function SkeletonCards() {
  return (
    <>
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="min-w-0 rounded-xl border border-black/5 bg-white p-4 shadow-sm md:p-6">
          <div className="skeleton mb-4 h-[200px] rounded-lg" />
          <div className="skeleton mb-2.5 h-4 w-[70%]" />
          <div className="skeleton mb-2.5 h-4 w-[40%]" />
          <div className="skeleton mb-2.5 h-4 w-[90%]" />
          <div className="mt-4 flex flex-wrap gap-2.5">
            <div className="skeleton h-10 flex-1 min-w-[80px] rounded-lg" />
            <div className="skeleton h-10 flex-1 min-w-[80px] rounded-lg" />
            <div className="skeleton h-10 flex-1 min-w-[80px] rounded-lg" />
          </div>
        </div>
      ))}
    </>
  );
}

function MyCardsContent() {
  const searchParams = useSearchParams();
  const [search, setSearch] = useState('');
  const [alert, setAlert] = useState({ show: false, msg: '', type: 'success' });

  const token = typeof window !== 'undefined' ? getToken() : null;
  const { data: cards = [], isLoading, error, mutate } = useSWR(
    token ? MY_CARDS_KEY : null,
    fetcherMyCards,
    {
      revalidateOnFocus: false,
      dedupingInterval: 2000,
      onError: (err) => {
        if (err?.message !== 'Unauthorized') {
          setAlert({ show: true, msg: err?.message || 'โหลดข้อมูลไม่สำเร็จ', type: 'error' });
        }
      },
    }
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!token) {
      window.location.href = '/liff/login';
      return;
    }
  }, [token]);

  useEffect(() => {
    const urlToken = searchParams.get('token');
    if (urlToken) {
      localStorage.setItem('token', urlToken);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [searchParams]);

  useEffect(() => {
    const created = searchParams.get('created') === '1';
    const updated = searchParams.get('updated') === '1';
    if (!created && !updated) return;

    setAlert({
      show: true,
      msg: updated ? 'แก้ไขการ์ดสำเร็จ!' : 'สร้างการ์ดสำเร็จ! คัดลอกลิงค์ด้านล่างเพื่อแชร์ใน LINE',
      type: 'success',
    });
    window.history.replaceState({}, '', '/my-cards');
    setTimeout(() => setAlert((prev) => ({ ...prev, show: false })), 5000);
    mutate();
  }, [searchParams, mutate]);

  const filtered =
    search.trim() === ''
      ? cards
      : cards.filter(
          (c) =>
            (c.user_name && c.user_name.toLowerCase().includes(search.toLowerCase())) ||
            (c.user_phone && c.user_phone.includes(search)) ||
            (c.user_email && c.user_email.toLowerCase().includes(search))
        );

  const copyLink = (url) => {
    navigator.clipboard.writeText(url).then(() => setAlert({ show: true, msg: 'คัดลอกลิงค์แล้ว!', type: 'success' }));
    setTimeout(() => setAlert((prev) => ({ ...prev, show: false })), 2000);
  };

  const shareLink = (url, card) => {
    if (card?.unique_id) {
      localStorage.setItem('share_card_name', card.unique_id);
      localStorage.setItem('share_card_id', '1');
    }
    // ต้องไปที่ LIFF URL เพื่อให้หน้าแชร์โหลดใน LINE และ shareTargetPicker ทำงานได้
    window.location.href = url;
  };

  const deleteCard = (cardId) => {
    if (!window.confirm('คุณแน่ใจหรือไม่ว่าต้องการลบการ์ดนี้?')) return;
    fetch('/api/cards/' + cardId, { method: 'DELETE', headers: getHeaders() })
      .then((r) => (handleAuthResponse(r) ? null : r.json()))
      .then((data) => {
        if (data == null) return;
        if (data.success) {
          setAlert({ show: true, msg: 'ลบการ์ดแล้ว', type: 'success' });
          mutate();
        } else setAlert({ show: true, msg: data.message || 'ลบไม่สำเร็จ', type: 'error' });
      })
      .catch(() => setAlert({ show: true, msg: 'เกิดข้อผิดพลาด', type: 'error' }));
  };

  return (
    <div className="mx-auto w-full max-w-[1200px]">
      <CustomerAppBar />
      {/* ก้อนเดียว: หัวข้อ + แจ้งเตือน + ค้นหา + รายการการ์ด */}
      <div className="rounded-xl bg-white p-4 shadow-[0_8px_30px_rgba(0,0,0,0.12)] md:p-6">
        <div className="mb-4 border-b-2 border-gray-100 pb-4">
          <h2 className="text-lg font-bold text-gray-800 md:text-xl">การ์ดของฉัน</h2>
        </div>
        {alert.show && (
          <div
            className={`mb-4 rounded-lg px-4 py-3 ${alert.type === 'error' ? 'border border-red-200 bg-red-50 text-red-800' : 'border border-green-200 bg-green-50 text-green-800'}`}
          >
            {alert.msg}
          </div>
        )}
        <div className="mb-4">
          <input
            type="text"
            placeholder="ค้นหาการ์ด (ชื่อ, เบอร์โทร, อีเมล)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full min-w-0 rounded-lg border-2 border-gray-200 px-4 py-3 text-base transition-colors focus:border-[#1DB446] focus:outline-none focus:ring-4 focus:ring-[#1DB446]/15"
          />
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-[repeat(auto-fill,minmax(300px,1fr))]">
        {isLoading && <SkeletonCards />}
        {!isLoading && error && error.code === 'MEMBERSHIP_EXPIRED' && (
          <div className="col-span-full rounded-xl border-2 border-dashed border-amber-300 bg-amber-50 p-6">
            <div className="py-10 text-center">
              <p className="mb-2 text-3xl">⏰</p>
              <h3 className="mb-2 text-lg font-semibold text-amber-800">สมาชิกหมดอายุ</h3>
              <p className="mb-4 text-sm text-amber-700">ไม่สามารถดู สร้าง หรือแชร์การ์ดได้ กรุณาต่ออายุสมาชิก</p>
              <Link
                href="/choose-package"
                className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-amber-500 px-5 py-3 font-semibold text-white no-underline hover:bg-amber-600"
              >
                ต่ออายุสมาชิก
              </Link>
            </div>
          </div>
        )}
        {!isLoading && error && error.code !== 'MEMBERSHIP_EXPIRED' && (
          <div className="rounded-xl bg-white p-6 shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
            <div className="py-14 text-center text-gray-500">
              <p className="mb-4">{error.message || 'โหลดข้อมูลไม่สำเร็จ'}</p>
              <button
                type="button"
                className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-[#1DB446] px-5 py-3 font-semibold text-white transition-all hover:bg-[#0FA03A] hover:-translate-y-0.5 hover:shadow-lg"
                onClick={() => mutate()}
              >
                ลองใหม่
              </button>
            </div>
          </div>
        )}
        {!isLoading && !error && filtered.length === 0 && (
          <div className="rounded-xl bg-white p-6 shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
            <div className="py-14 text-center text-gray-500">
              <h3 className="mb-2.5 text-xl font-semibold text-gray-700">ยังไม่มีการ์ด</h3>
              <p className="mb-4">เริ่มสร้างการ์ดแรกของคุณเลย!</p>
              <Link
                href="/create"
                className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-[#1DB446] px-5 py-3 font-semibold text-white no-underline transition-all hover:bg-[#0FA03A] hover:-translate-y-0.5 hover:shadow-lg"
              >
                สร้างการ์ดใหม่
              </Link>
            </div>
          </div>
        )}
        {!isLoading && !error && filtered.length > 0 &&
          filtered.map((card) => (
            <div key={card.id} className="min-w-0 rounded-xl border border-black/5 bg-white p-4 shadow-sm transition-all hover:-translate-y-1 hover:border-[#1DB446] hover:shadow-md md:p-6">
              <div className="mb-4 flex justify-between items-start gap-2">
                <h3 className="text-gray-800 text-lg font-medium">{card.user_name || 'ไม่ระบุชื่อ'}</h3>
                <span className="shrink-0 rounded-full bg-[#1DB446] px-3 py-1 text-xs font-medium text-white">
                  {card.template_name || 'Template'}
                </span>
              </div>
              {card.user_image && (
                <div className="mb-4 w-full overflow-hidden rounded-lg bg-gray-100">
                  <img src={card.user_image} alt="Card" className="w-full rounded-lg object-contain" style={{ maxWidth: 2047, maxHeight: 2048 }} />
                </div>
              )}
              <div className="mb-4 space-y-1 text-sm text-gray-500">
                {card.user_phone && <p>📞 {card.user_phone}</p>}
                {card.user_email && <p>✉️ {card.user_email}</p>}
                <p className="text-xs text-gray-400">
                  สร้างเมื่อ: {card.created_at ? new Date(card.created_at).toLocaleDateString('th-TH') : '-'}
                </p>
                <p className="text-xs text-gray-600">
                  วันหมดอายุ: {card.expires_at ? new Date(card.expires_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}
                </p>
              </div>
              <div className="my-4 overflow-x-auto rounded-lg bg-gray-100 p-3">
                <input
                  type="text"
                  value={card.liff_url || ''}
                  readOnly
                  className="w-full min-w-0 rounded border-2 border-gray-200 bg-white px-3 py-2 text-sm"
                />
              </div>
              <div className="flex flex-wrap gap-2.5">
                <Link
                  href={'/edit-card/' + card.id}
                  className="inline-flex min-h-[44px] flex-1 min-w-[85px] items-center justify-center rounded-lg bg-[#1DB446] px-4 py-2.5 text-sm font-semibold text-white no-underline hover:bg-[#0FA03A]"
                >
                  แก้ไข
                </Link>
                <button
                  type="button"
                  className="inline-flex min-h-[44px] flex-1 min-w-[85px] items-center justify-center rounded-lg border-2 border-[#1DB446] bg-white px-4 py-2.5 text-sm font-semibold text-[#1DB446] hover:bg-[#1DB446] hover:text-white"
                  onClick={() => copyLink(card.liff_url)}
                >
                  คัดลอกลิงค์
                </button>
                <button
                  type="button"
                  className="inline-flex min-h-[44px] flex-1 min-w-[85px] items-center justify-center rounded-lg border-2 border-[#1DB446] bg-white px-4 py-2.5 text-sm font-semibold text-[#1DB446] hover:bg-[#1DB446] hover:text-white"
                  onClick={() => shareLink(card.liff_url, card)}
                >
                  แชร์ใน LINE
                </button>
                <button
                  type="button"
                  className="inline-flex min-h-[44px] flex-1 min-w-[85px] items-center justify-center rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700"
                  onClick={() => deleteCard(card.id)}
                >
                  ลบ
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function MyCardsPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-[1200px]">
          <CustomerAppBar />
          <div className="mb-4 rounded-xl bg-white px-4 py-3 shadow-[0_2px_10px_rgba(0,0,0,0.1)] md:px-8">
            <h2 className="text-lg font-semibold text-gray-800 md:text-xl">การ์ดของฉัน</h2>
          </div>
          <div className="rounded-xl bg-white p-6 shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
            <div className="flex flex-col items-center justify-center py-8">
              <div className="h-5 w-5 rounded-full border-2 border-[#1DB446]/30 border-t-[#1DB446] animate-spin-slow" />
              <p className="mt-3 text-gray-500">กำลังโหลด...</p>
            </div>
          </div>
        </div>
      }
    >
      <MyCardsContent />
    </Suspense>
  );
}
