'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import CustomerAppBar from '../components/CustomerAppBar';
import AlertBanner from '../components/AlertBanner';
import { getToken, getHeaders, handleAuthResponse } from '../utils/auth';

const inputClass =
  'w-full rounded-xl border-2 border-gray-200 bg-gray-50 px-4 py-3 text-base transition-all focus:border-[#c9a962] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#c9a962]/15';
const labelClass = 'mb-2 block text-sm font-medium text-gray-800';
const sectionTitleClass =
  'mb-3 flex items-center gap-2.5 border-b-2 border-[#c9a962] pb-2.5 text-lg font-bold text-[#c9a962]';

const FLEX_SIMULATOR_URL = 'https://developers.line.biz/flex-simulator/?status=success';

/** ตรวจว่า JSON มี placeholder ตามประเภทปุ่มที่เลือกหรือไม่ (ให้ข้อความแจ้งเตือน) */
function validatePlaceholders(jsonStr, buttonType) {
  if (!buttonType || buttonType === 'none') return null;
  const missing = [];
  if (['share', 'share_tel', 'share_mail', 'all'].includes(buttonType) && jsonStr.indexOf('{liff_url}') === -1) {
    missing.push('{liff_url} (ปุ่มแชร์)');
  }
  if (['tel', 'share_tel', 'tel_mail', 'all'].includes(buttonType) && jsonStr.indexOf('tel:{phone}') === -1) {
    missing.push('tel:{phone} (ปุ่มโทร)');
  }
  if (['mail', 'tel_mail', 'share_mail', 'all'].includes(buttonType) && jsonStr.indexOf('mailto:{email}') === -1) {
    missing.push('mailto:{email} (ปุ่มเมล)');
  }
  if (missing.length === 0) return null;
  return `สร้างการ์ดไม่สำเร็จ — ไม่พบ syntax ใน JSON: กรุณาใส่ ${missing.join(', ')} ในปุ่ม Type Uri ตามประเภทปุ่มที่เลือก`;
}

export default function CreateCustomPage() {
  const router = useRouter();
  const [cardTitle, setCardTitle] = useState('นามบัตรของ');
  const [cardName, setCardName] = useState('');
  const [cardDescription, setCardDescription] = useState('');
  const [jsonCode, setJsonCode] = useState('');
  const [buttonType, setButtonType] = useState('none');
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState({ show: false, msg: '', type: 'error' });
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!getToken()) {
      router.replace('/liff/login');
      return;
    }
  }, [router]);

  return (
    <div className="mx-auto w-full max-w-[1200px]">
      <CustomerAppBar />

      <div className="rounded-xl bg-white p-4 shadow-[0_8px_30px_rgba(0,0,0,0.12)] md:p-8">
        <div className="mb-6 border-b-2 border-gray-100 pb-4">
          <h2 className="text-lg font-bold text-gray-800 md:text-xl">ออกแบบการ์ดเอง</h2>
          <p className="mt-1 text-sm text-gray-500">
            ออกแบบการ์ดใน Flex Simulator แล้วนำโค้ด JSON มาวางด้านล่าง
          </p>
        </div>

        {/* วิธีใช้งาน (How to) — ไว้บนสุด */}
        <div className="mb-6 rounded-xl border-2 border-slate-200 bg-slate-50 p-4 md:p-5">
          <h3 className="mb-3 border-b-2 border-slate-300 pb-2 text-lg font-bold text-slate-800">
            📋 วิธีใช้งาน (How to)
          </h3>
          <ol className="list-inside list-decimal space-y-2 text-sm text-slate-700">
            <li>กดปุ่ม <strong>&quot;เปิด Flex Simulator (LINE)&quot;</strong> ด้านล่าง เพื่อไปหน้าออกแบบการ์ดของ LINE</li>
            <li>ออกแบบการ์ด (ข้อความ รูป ปุ่ม ฯลฯ) ใน Simulator ให้เสร็จ</li>
            <li>ใน Flex Simulator กด Copy หรือ Export เป็น JSON</li>
            <li>วางโค้ด JSON ที่ได้ ลงในช่อง &quot;วางโค้ด JSON&quot;</li>
            <li>กรอก &quot;หัวนามบัตร&quot; และเลือกประเภทปุ่ม (แชร์/โทร/เมล) ตามที่ออกแบบไว้</li>
            <li>กดบันทึก — การ์ดจะถูกเก็บเข้าระบบและแชร์ได้เหมือนการ์ดทั่วไป</li>
          </ol>
          <div className="mt-4 rounded-lg border border-slate-300 bg-white p-4 text-slate-700">
            <p className="mb-2 font-bold text-slate-800">วิธีใส่ Syntax ปุ่มในการ์ด (JSON)</p>
            <p className="mb-3 text-sm text-slate-600">ใน Flex Simulator เลือกปุ่ม Type เป็น <code className="rounded bg-slate-200 px-1">Uri</code> แล้ววางค่าตามประเภทปุ่ม:</p>
            <ul className="list-inside list-disc space-y-1.5 text-sm">
              <li><strong>ปุ่มโทร:</strong> วาง <code className="rounded bg-slate-200 px-1">tel:{'{phone}'}</code></li>
              <li><strong>ปุ่มเมล:</strong> วาง <code className="rounded bg-slate-200 px-1">mailto:{'{email}'}</code></li>
              <li><strong>ปุ่มแชร์:</strong> วาง <code className="rounded bg-slate-200 px-1">{'{liff_url}'}</code></li>
              <li><strong>ปุ่มอื่นๆ (ลิงก์เว็บ):</strong> ใส่ <code className="rounded bg-slate-200 px-1">https://...</code> ได้ตามปกติ</li>
            </ul>
          </div>
        </div>

        {/* ปุ่มไป Flex Simulator */}
        <div className="mb-6 rounded-xl border-2 border-gray-200 bg-gray-50 p-4 md:p-5">
          <h3 className={sectionTitleClass}>
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#c9a962] text-sm font-bold text-[#0c1222]">🔗</span>
            ออกแบบการ์ดใน Flex Simulator
          </h3>
          <a
            href={FLEX_SIMULATOR_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-[#00B900] px-5 py-3 text-base font-semibold text-white shadow-sm transition-all hover:bg-[#009900] hover:shadow-md"
          >
            เปิด Flex Simulator (LINE)
          </a>
        </div>

        {/* ฟิลด์หัวนามบัตร / การ์ดของ */}
        <div className="mb-6 rounded-xl border-2 border-gray-200 bg-gray-50 p-4 transition-colors hover:border-[#c9a962]/50 md:p-5">
          <h3 className={sectionTitleClass}>
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#c9a962] text-sm font-bold text-[#0c1222]">1</span>
            หัวนามบัตร (ข้อความแสดงตอนส่งการ)
          </h3>
          <p className="mb-3 text-sm text-gray-500">
            ข้อความที่แสดงเมื่อมีคนส่งการ์ดนี้ใน LINE (เช่น &quot;นามบัตรของ&quot; หรือ &quot;การ์ดของ ชื่อ&quot;)
          </p>
          <input
            type="text"
            className={inputClass}
            placeholder="การ์ดของ {name}"
            value={cardTitle}
            onChange={(e) => setCardTitle(e.target.value)}
          />
          <small className="mt-1.5 block text-gray-500">ใช้ {'{name}'} แทนชื่อผู้ใช้ได้ (ถ้าต้องการ)</small>
        </div>

        {/* ชื่อการ์ดและรายละเอียด — ใช้อ้างอิงในรายการ ไม่แสดงบนการ์ด */}
        <div className="mb-6 rounded-xl border-2 border-gray-200 bg-gray-50 p-4 transition-colors hover:border-[#c9a962]/50 md:p-5">
          <h3 className={sectionTitleClass}>
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#c9a962] text-sm font-bold text-[#0c1222]">1.1</span>
            ชื่อการ์ดและรายละเอียด (ใช้อ้างอิงในรายการ)
          </h3>
          <p className="mb-3 text-sm text-gray-500">
            ตั้งชื่อและใส่รายละเอียดเพื่อให้คุณจำได้ว่าการ์ดนี้คือการ์ดอะไร — ไม่แสดงบนการ์ด แค่ใช้ดูในหน้ารายการการ์ดของฉัน
          </p>
          <div className="mb-4">
            <label className={labelClass}>ชื่อการ์ด (ใส่ก็ได้ ไม่ใส่ก็ได้)</label>
            <input
              type="text"
              className={inputClass}
              placeholder="เช่น การ์ดร้านกาแฟ, การ์ดงานแต่ง"
              value={cardName}
              onChange={(e) => setCardName(e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>รายละเอียดของการ์ด (ใส่ก็ได้ ไม่ใส่ก็ได้)</label>
            <textarea
              className={`${inputClass} min-h-[80px]`}
              placeholder="เช่น การ์ดโปรโมทร้านเปิดใหม่, ใช้แจกในงานอีเวนต์"
              value={cardDescription}
              onChange={(e) => setCardDescription(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        {/* ฟิลด์วางโค้ด JSON */}
        <div className="mb-6 rounded-xl border-2 border-gray-200 bg-gray-50 p-4 transition-colors hover:border-[#c9a962]/50 md:p-5">
          <h3 className={sectionTitleClass}>
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#c9a962] text-sm font-bold text-[#0c1222]">2</span>
            วางโค้ด JSON <span className="text-red-600" aria-hidden="true">*</span>
          </h3>
          <p className="mb-3 text-sm text-gray-500">
            Copy โค้ด JSON จาก Flex Simulator หลังออกแบบเสร็จ แล้ววางด้านล่าง
          </p>
          <textarea
            className={`${inputClass} min-h-[280px] font-mono text-sm`}
            placeholder='{"type": "bubble", ...}'
            value={jsonCode}
            onChange={(e) => { setJsonCode(e.target.value); setFieldErrors((p) => ({ ...p, json: '' })); }}
            spellCheck={false}
          />
          {fieldErrors.json && <p className="mt-1 text-sm text-red-600">{fieldErrors.json}</p>}
        </div>

        {/* ปุ่มในการ์ดเป็น: ไม่มี / แชร์ / แชร์+โทร / โทร+เมล / แชร์+เมล / ครบ 3 ปุ่ม */}
        <div className="mb-6 rounded-xl border-2 border-gray-200 bg-gray-50 p-4 md:p-5">
          <h3 className={sectionTitleClass}>
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#c9a962] text-sm font-bold text-[#0c1222]">3</span>
            ปุ่มในการ์ดเป็น (ถ้ามีปุ่มโทร/เมล/แชร์)
          </h3>
          <p className="mb-3 text-sm text-gray-500">
            เลือกให้ตรงกับการ์ดที่ออกแบบ — ระบบจะใส่เบอร์/อีเมล/ลิงก์แชร์จากโปรไฟล์และระบบให้
          </p>
          <div className="flex flex-wrap gap-3">
            <label className="flex cursor-pointer items-center gap-2">
              <input type="radio" name="buttonType" value="none" checked={buttonType === 'none'} onChange={() => setButtonType('none')} className="h-4 w-4 accent-[#c9a962]" />
              <span>ไม่มี / ไม่ใช้</span>
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <input type="radio" name="buttonType" value="share" checked={buttonType === 'share'} onChange={() => setButtonType('share')} className="h-4 w-4 accent-[#c9a962]" />
              <span>ปุ่มแชร์</span>
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <input type="radio" name="buttonType" value="tel" checked={buttonType === 'tel'} onChange={() => setButtonType('tel')} className="h-4 w-4 accent-[#c9a962]" />
              <span>ปุ่มโทร</span>
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <input type="radio" name="buttonType" value="mail" checked={buttonType === 'mail'} onChange={() => setButtonType('mail')} className="h-4 w-4 accent-[#c9a962]" />
              <span>ปุ่มเมล</span>
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <input type="radio" name="buttonType" value="share_tel" checked={buttonType === 'share_tel'} onChange={() => setButtonType('share_tel')} className="h-4 w-4 accent-[#c9a962]" />
              <span>ปุ่มแชร์ + โทร</span>
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <input type="radio" name="buttonType" value="tel_mail" checked={buttonType === 'tel_mail'} onChange={() => setButtonType('tel_mail')} className="h-4 w-4 accent-[#c9a962]" />
              <span>ปุ่มโทร + เมล</span>
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <input type="radio" name="buttonType" value="share_mail" checked={buttonType === 'share_mail'} onChange={() => setButtonType('share_mail')} className="h-4 w-4 accent-[#c9a962]" />
              <span>ปุ่มแชร์ + เมล</span>
            </label>
            <label className="flex cursor-pointer items-center gap-2">
              <input type="radio" name="buttonType" value="all" checked={buttonType === 'all'} onChange={() => setButtonType('all')} className="h-4 w-4 accent-[#c9a962]" />
              <span>ครบ 3 ปุ่ม (แชร์ + โทร + เมล)</span>
            </label>
          </div>
        </div>

        <AlertBanner
          show={alert.show}
          msg={alert.msg}
          type={alert.type}
          onClose={() => setAlert((a) => ({ ...a, show: false }))}
          autoCloseMs={alert.type === 'success' ? 5000 : 0}
        />

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/create"
            className="inline-flex min-h-[44px] items-center justify-center rounded-lg border-2 border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 hover:border-[#c9a962] hover:text-[#c9a962]"
          >
            ← กลับไปสร้างการ์ด
          </Link>
          <button
            type="button"
            disabled={saving || !jsonCode.trim()}
            className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-[#c9a962] px-5 py-2.5 text-sm font-semibold text-[#0c1222] hover:bg-[#b8960c] disabled:opacity-60 disabled:cursor-not-allowed"
            onClick={async () => {
              if (!jsonCode.trim()) {
                setFieldErrors({ json: 'กรุณาวางโค้ด JSON' });
                setAlert({ show: true, msg: 'กรุณาวางโค้ด JSON', type: 'error' });
                return;
              }
              const placeholderError = validatePlaceholders(jsonCode, buttonType);
              if (placeholderError) {
                setFieldErrors({ json: placeholderError });
                setAlert({ show: true, msg: placeholderError, type: 'error' });
                return;
              }
              setFieldErrors({});
              setSaving(true);
              setAlert({ show: false, msg: '', type: 'error' });
              try {
                const res = await fetch('/api/create-custom-card', {
                  method: 'POST',
                  headers: { ...getHeaders(), 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    card_title: cardTitle,
                    flex_json: jsonCode,
                    button_type: buttonType,
                    card_name: cardName.trim() || undefined,
                    card_description: cardDescription.trim() || undefined,
                  }),
                });
                if (handleAuthResponse(res)) {
                  setSaving(false);
                  return;
                }
                const data = await res.json();
                if (data.success && data.data) {
                  setAlert({ show: true, msg: data.message || 'สร้างสำเร็จ', type: 'success' });
                  router.push('/my-cards?created=1');
                } else {
                  setAlert({ show: true, msg: data.message || 'สร้างไม่สำเร็จ', type: 'error' });
                }
              } catch (e) {
                setAlert({ show: true, msg: e.message || 'เกิดข้อผิดพลาด', type: 'error' });
              }
              setSaving(false);
            }}
          >
            {saving ? 'กำลังบันทึก...' : 'บันทึก'}
          </button>
        </div>
      </div>
    </div>
  );
}
