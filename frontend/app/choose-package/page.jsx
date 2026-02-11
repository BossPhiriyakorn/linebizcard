'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import CustomerAppBar from '../components/CustomerAppBar';
import { getToken, getHeaders as getAuthHeaders, handleAuthResponse } from '../utils/auth';

export default function ChoosePackagePage() {
  const router = useRouter();
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState({ show: false, msg: '', type: 'error' });
  const [submittingId, setSubmittingId] = useState(null);
  const [paymentChannels, setPaymentChannels] = useState([]);
  const [loadingChannels, setLoadingChannels] = useState(true);

  useEffect(() => {
    if (!getToken()) {
      router.replace('/liff/login');
      return;
    }
    fetch('/api/packages')
      .then((r) => (handleAuthResponse(r) ? null : r.json()))
      .then((res) => {
        setLoading(false);
        if (res == null) return;
        if (res.success && Array.isArray(res.data)) setPackages(res.data);
        else setAlert({ show: true, msg: res?.message || 'โหลดแพ็กเกจไม่สำเร็จ', type: 'error' });
      })
      .catch(() => setLoading(false));

    fetch('/api/payment-channels', { headers: getAuthHeaders() })
      .then((r) => (handleAuthResponse(r) ? null : r.json()))
      .then((res) => {
        setLoadingChannels(false);
        if (res != null && res.success && Array.isArray(res.data)) setPaymentChannels(res.data);
      })
      .catch(() => setLoadingChannels(false));
  }, [router]);

  const goToSummary = (pkg) => {
    // แพ็กเกจถือว่า "ฟรี" เมื่อ requires_payment === false หรือ price เป็น 0 (ป้องกัน DB ตั้ง requires_payment ผิด)
    const isFreePackage = pkg.requires_payment === false || (pkg.price != null && Number(pkg.price) === 0);
    if (!isFreePackage) {
      // ตรวจสอบว่ามีช่องทางการชำระเงินหรือไม่
      if (loadingChannels) {
        setAlert({ show: true, msg: 'กำลังตรวจสอบช่องทางการชำระเงิน...', type: 'error' });
        return;
      }
      if (!paymentChannels || paymentChannels.length === 0) {
        // ยังไม่มีช่องทางการชำระเงิน ให้ไปที่หน้าโปรไฟล์เพื่อลงทะเบียน
        setAlert({ 
          show: true, 
          msg: 'กรุณาลงทะเบียนช่องทางการชำระเงินก่อนเลือกแพ็กเกจที่ต้องชำระเงิน', 
          type: 'error' 
        });
        setTimeout(() => {
          router.push('/profile?register_payment=true&package_id=' + pkg.id);
        }, 2000);
        return;
      }
    }
    router.push('/payment-summary?package_id=' + pkg.id);
  };

  const usePackageDirect = (pkg) => {
    setSubmittingId(pkg.id);
    setAlert({ show: false, msg: '', type: 'success' });
    fetch('/api/choose-package', {
      method: 'POST',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ package_id: pkg.id }),
    })
      .then((r) => (handleAuthResponse(r) ? null : r.json()))
      .then((data) => {
        if (data == null) return;
        setSubmittingId(null);
        if (data.success) {
          setAlert({ show: true, msg: data.message || 'เลือกแพ็กเกจสำเร็จ', type: 'success' });
          setTimeout(() => router.push('/package'), 1200);
        } else {
          setAlert({ show: true, msg: data.message || 'ดำเนินการไม่สำเร็จ', type: 'error' });
        }
      })
      .catch(() => {
        setSubmittingId(null);
        setAlert({ show: true, msg: 'เกิดข้อผิดพลาด', type: 'error' });
      });
  };

  return (
    <div className="w-full box-border" style={{ width: '100%', minWidth: 0 }}>
      <CustomerAppBar />
      <div className="my-6 rounded-xl bg-white p-4 shadow-[0_8px_30px_rgba(0,0,0,0.12)] md:p-8" style={{ maxWidth: 600, marginLeft: 'auto', marginRight: 'auto', width: '100%' }}>
        <div className="mb-6 text-center">
          <h1 className="mb-2.5 text-2xl font-bold text-[#1DB446]">เลือกแพ็กเกจ</h1>
          <p className="text-gray-500">เลือกแพ็กเกจที่ต้องการเพื่อเริ่มใช้งาน</p>
        </div>
        {alert.show && (
          <div
            className={`mb-5 rounded-lg px-5 py-3.5 ${
              alert.type === 'error' ? 'border border-red-200 bg-red-50 text-red-800' : 'border border-green-200 bg-green-50 text-green-800'
            }`}
          >
            {alert.msg}
          </div>
        )}
        {loading ? (
          <div className="py-12 text-center text-slate-500">กำลังโหลดแพ็กเกจ...</div>
        ) : packages.length === 0 ? (
          <div className="py-12 text-center text-slate-500">ไม่มีแพ็กเกจให้เลือกในขณะนี้</div>
        ) : (
          <div className="space-y-4">
            {packages.map((pkg) => (
              <div
                key={pkg.id}
                className="flex flex-col rounded-xl border-2 border-gray-200 p-5 transition-all hover:border-[#1DB446] hover:shadow-md"
              >
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-800">{pkg.name}</h3>
                  <p className="mt-1 text-sm text-gray-500">{pkg.duration_days} วันใช้งาน</p>
                  {pkg.period_type === 'annual' && <p className="mt-1 text-xs text-violet-600">ใช้คูปองส่วนลด (ซื้อแบบรายปี) ได้</p>}
                  {pkg.period_type === '3months' && <p className="mt-1 text-xs text-violet-600">ใช้คูปองส่วนลด (ซื้อแบบ 3 เดือน) ได้</p>}
                  {pkg.description && <p className="mt-2 text-sm text-gray-600">{pkg.description}</p>}
                  <p className="mt-2 text-base font-semibold text-[#1DB446]">
                    {pkg.price != null && Number(pkg.price) > 0 ? `${Number(pkg.price)} บาท` : 'ฟรี'}
                  </p>
                  {(pkg.requires_payment === false || (pkg.price != null && Number(pkg.price) === 0)) && (
                    <p className="mt-1 text-xs text-slate-500">ไม่ต้องชำระเงิน — กดใช้ได้เลย</p>
                  )}
                </div>
                {pkg.requires_payment === false || (pkg.price != null && Number(pkg.price) === 0) ? (
                  <button
                    type="button"
                    disabled={submittingId === pkg.id}
                    onClick={() => usePackageDirect(pkg)}
                    className="mt-4 w-full rounded-lg bg-[#1DB446] py-3 font-semibold text-white hover:bg-[#0FA03A] disabled:opacity-60"
                  >
                    {submittingId === pkg.id ? 'กำลังดำเนินการ...' : 'ใช้เลย'}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => goToSummary(pkg)}
                    className="mt-4 w-full rounded-lg bg-[#1DB446] py-3 font-semibold text-white hover:bg-[#0FA03A]"
                  >
                    เลือก
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
