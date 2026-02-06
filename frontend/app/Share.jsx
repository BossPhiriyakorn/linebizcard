'use client';

import { useEffect, useState } from 'react';

let LIFF_ID = '';

async function fetchLiffId() {
  const res = await fetch('/api/liff-id');
  if (!res.ok) throw new Error('ไม่สามารถดึง LIFF ID ได้');
  const data = await res.json();
  if (data.success && data.liff_id) LIFF_ID = data.liff_id;
  else throw new Error('ไม่พบ LIFF ID ใน response');
}

async function fetchJson(name) {
  const res = await fetch(`/json/${name}.json`);
  if (!res.ok) throw new Error('ไม่พบไฟล์ JSON');
  return res.json();
}

async function sendShare(name, id, showError, showSuccess) {
  const flexContent = await fetchJson(name);
  const flexIndex = parseInt(id, 10) || 1;
  if (!flexContent.tectony1 || !flexContent.tectony1[0] || !flexContent.tectony1[flexIndex]) {
    throw new Error('รูปแบบ JSON ไม่ถูกต้อง');
  }
  const contents = flexContent.tectony1[flexIndex];
  const altText = (flexContent.tectony1[0].linemsg || 'การ์ด').trim().slice(0, 400);
  if (!contents || (contents.type !== 'bubble' && contents.type !== 'carousel')) {
    throw new Error('รูปแบบการ์ดไม่รองรับ (ต้องเป็น bubble หรือ carousel)');
  }
  const flexMessage = {
    type: 'flex',
    altText: altText || 'การ์ด',
    contents: { ...contents },
  };
  const result = await window.liff.shareTargetPicker([flexMessage]);
  if (result) {
    showSuccess('แชร์ Flex Message สำเร็จแล้ว!');
    setTimeout(() => window.liff.closeWindow && window.liff.closeWindow(), 2000);
  } else {
    showError('ยกเลิกการแชร์');
    setTimeout(() => window.liff.closeWindow && window.liff.closeWindow(), 2000);
  }
}

function getLoginUrl() {
  if (typeof window === 'undefined') return '/api/auth/line/login';
  return window.location.origin + '/api/auth/line/login';
}

export default function Share() {
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState('');

  const showError = (msg) => {
    setStatus('error');
    setMessage(msg);
  };
  const showSuccess = (msg) => {
    setStatus('success');
    setMessage(msg);
  };

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const hashParams = typeof window !== 'undefined' && window.location.hash
      ? new URLSearchParams(window.location.hash.replace(/^#/, ''))
      : new URLSearchParams();
    const name = searchParams.get('name') || hashParams.get('name');
    const id = searchParams.get('id') || hashParams.get('id') || '1';
    const token = searchParams.get('token') || hashParams.get('token');
    const savedName = localStorage.getItem('share_card_name');
    const savedId = localStorage.getItem('share_card_id');
    const cardName = name || savedName;
    const cardId = id || savedId || '1';

    if (name) localStorage.setItem('share_card_name', name);
    if (id) localStorage.setItem('share_card_id', id);
    if (token) {
      localStorage.setItem('auth_token', token);
      localStorage.setItem('token', token);
      if (!name && savedName) {
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.set('name', savedName);
        if (savedId) newUrl.searchParams.set('id', savedId);
        newUrl.searchParams.set('token', token);
        window.location.replace(newUrl.toString());
        return;
      }
    }

    (async () => {
      try {
        await fetchLiffId();
        if (!LIFF_ID) throw new Error('ไม่พบ LIFF ID');

        let retries = 0;
        const maxRetries = 25;
        while (typeof window !== 'undefined' && !window.liff && retries < maxRetries) {
          await new Promise((r) => setTimeout(r, 200));
          retries++;
        }

        if (typeof window === 'undefined' || !window.liff) {
          window.location.href = getLoginUrl();
          return;
        }
        await window.liff.init({ liffId: LIFF_ID });

        if (!window.liff.isInClient() && !cardName) {
          window.location.href = getLoginUrl();
          return;
        }

        const savedToken = token || (typeof localStorage !== 'undefined' ? (localStorage.getItem('token') || localStorage.getItem('auth_token')) : null);
        if (savedToken && !cardName && !window.liff.isInClient()) {
          window.location.href = window.location.origin + '/home';
          return;
        }

        if (!window.liff.isLoggedIn()) {
          if (cardName) localStorage.setItem('share_card_name', cardName);
          if (cardId) localStorage.setItem('share_card_id', cardId);
          window.liff.login();
          return;
        }

        if (!cardName) {
          showError('ไม่พบข้อมูลการ์ดสำหรับแชร์ กรุณากดปุ่ม "แชร์" บนการ์ดอีกครั้ง');
          return;
        }

        localStorage.removeItem('share_card_name');
        localStorage.removeItem('share_card_id');
        await sendShare(cardName, cardId, showError, showSuccess);
      } catch (err) {
        console.error(err);
        let msg = err.message || 'ไม่สามารถแชร์การ์ดได้';
        if (msg.includes('shareTargetPicker is not allowed')) {
          const pageUrl = typeof window !== 'undefined' ? window.location.origin + (window.location.pathname || '/') : '';
          msg = 'shareTargetPicker ยังไม่เปิดสำหรับ LIFF app นี้ — ใน LINE Developers ตั้ง Endpoint URL ของ LIFF ให้ตรงกับ URL หน้านี้: ' + pageUrl;
        }
        if (name) {
          showError(msg);
        } else {
          window.location.href = getLoginUrl();
        }
      }
    })();
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center p-5 font-sans md:p-8" style={{ paddingLeft: 'max(1.25rem, env(safe-area-inset-left))', paddingRight: 'max(1.25rem, env(safe-area-inset-right))', paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom))' }}>
      <div className="w-full max-w-[min(500px,100%)] rounded-xl bg-white p-6 text-center shadow-lg md:p-10">
        {status === 'loading' && (
          <>
            <div className="mx-auto inline-block h-10 w-10 rounded-full border-4 border-[#1DB446]/30 border-t-[#1DB446] animate-spin-slow" />
            <p className="mt-5">Loading...</p>
          </>
        )}
        {status === 'error' && (
          <div className="mt-5 rounded-lg bg-red-50 px-4 py-3.5 text-red-700">
            {message}
          </div>
        )}
        {status === 'success' && (
          <div className="mt-5 rounded-lg bg-green-50 px-4 py-3.5 text-green-800">
            {message}
          </div>
        )}
      </div>
    </div>
  );
}
