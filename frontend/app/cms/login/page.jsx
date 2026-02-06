'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCmsAlert } from '../hooks/useCmsAlert';

const DEFAULT_BG_COLOR = '#5b21b6';

export default function CmsLoginPage() {
  const router = useRouter();
  const [alert, showAlert, clearAlert] = useCmsAlert();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [loginSettings, setLoginSettings] = useState({
    login_logo_url: null,
    login_bg_image_url: null,
    login_bg_color: DEFAULT_BG_COLOR,
  });

  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('cms_token')) {
      router.replace('/cms');
      return;
    }
    fetch('/api/cms/login-settings')
      .then((r) => r.json())
      .then((data) => {
        if (data?.success && data.data) {
          setLoginSettings({
            login_logo_url: data.data.login_logo_url || null,
            login_bg_image_url: data.data.login_bg_image_url || null,
            login_bg_color: data.data.login_bg_color || DEFAULT_BG_COLOR,
          });
        }
      })
      .catch(() => {});
  }, [router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setLoading(true);
    clearAlert();
    try {
      const res = await fetch('/api/cms/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json();
      if (data.success && data.token) {
        localStorage.setItem('cms_token', data.token);
        router.replace('/cms');
      } else {
        showAlert(data.message || 'อีเมลหรือรหัสผ่านไม่ถูกต้อง', 'error');
        setLoading(false);
      }
    } catch {
      showAlert('เกิดข้อผิดพลาดในการเชื่อมต่อ', 'error');
      setLoading(false);
    }
  };

  const bgStyle = {
    backgroundColor: loginSettings.login_bg_color || DEFAULT_BG_COLOR,
    ...(loginSettings.login_bg_image_url
      ? { backgroundImage: `url(${loginSettings.login_bg_image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }
      : {}),
  };

  return (
    <div className="grid min-h-screen min-h-dvh w-full max-w-[100vw] grid-cols-1 overflow-x-hidden md:grid-cols-2" data-cms>
      <div
        className="flex min-h-[160px] min-h-dvh min-w-0 items-center justify-center overflow-hidden p-4 md:min-h-dvh md:p-10"
        style={bgStyle}
      >
        <div className="max-w-full text-center text-white" style={{ padding: '0 8px' }}>
          {loginSettings.login_logo_url ? (
            <img
              src={loginSettings.login_logo_url}
              alt="Logo"
              className="mx-auto max-h-[80px] max-w-[45vw] object-contain md:max-h-[120px] md:max-w-[200px]"
            />
          ) : (
            <h1 className="m-0 break-words text-lg font-bold tracking-wide md:text-2xl">
              MagicBiz-Card CMS
            </h1>
          )}
        </div>
      </div>
      <div className="flex min-w-0 items-center justify-center overflow-x-hidden bg-slate-50 p-4 md:p-6">
        <div className="w-full max-w-[min(400px,100%)] rounded-2xl bg-white p-5 shadow-lg md:p-10">
          <h2 className="m-0 mb-2 text-xl font-bold text-violet-700 md:text-2xl">Welcome</h2>
          <p className="mb-7 text-sm text-slate-500 md:text-base">เข้าสู่ระบบหลังบ้านเพื่อดำเนินการต่อ</p>
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
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="cms-email" className="mb-1.5 block font-medium text-gray-800">อีเมล</label>
              <input
                type="email"
                id="cms-email"
                required
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-green-50/50 px-3.5 py-3 text-base transition-colors placeholder:text-slate-400 focus:border-violet-700 focus:bg-white focus:outline-none"
              />
            </div>
            <div className="mb-4">
              <label htmlFor="cms-password" className="mb-1.5 block font-medium text-gray-800">รหัสผ่าน</label>
              <input
                type="password"
                id="cms-password"
                required
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-green-50/50 px-3.5 py-3 text-base transition-colors placeholder:text-slate-400 focus:border-violet-700 focus:bg-white focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="mt-2 w-full rounded-xl bg-violet-700 px-4 py-3.5 text-base font-semibold text-white transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={loading}
            >
              {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
