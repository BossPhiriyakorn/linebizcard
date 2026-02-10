'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import CustomerAppBar from '../components/CustomerAppBar';
import { getToken, getHeaders, handleAuthResponse } from '../utils/auth';

function PayByQrContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams?.get('id');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [slipFile, setSlipFile] = useState(null);
  const [uploaded, setUploaded] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      router.replace('/liff/login');
      return;
    }
    if (!id) {
      setLoading(false);
      setError('ไม่พบรายการชำระ');
      return;
    }
    fetch('/api/payment-requests/' + id, { headers: getHeaders() })
      .then((r) => (handleAuthResponse(r) ? null : r.json()))
      .then((res) => {
        setLoading(false);
        if (res == null) return;
        if (res?.success && res.data) setData(res.data);
        else setError(res?.message || 'โหลดไม่สำเร็จ');
      })
      .catch(() => {
        setLoading(false);
        setError('โหลดไม่สำเร็จ');
      });
  }, [id, router]);

  const handleUploadSlip = (e) => {
    e.preventDefault();
    if (!slipFile || !id) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('slip', slipFile);
    fetch('/api/payment-requests/' + id + '/upload-slip', {
      method: 'POST',
      headers: getHeaders(),
      body: formData,
    })
      .then((r) => (handleAuthResponse(r) ? null : r.json()))
      .then((res) => {
        setUploading(false);
        if (res == null) return;
        if (res?.success) {
          setUploaded(true);
          setData((d) => (d ? { ...d, status: 'slip_uploaded', slip_image_url: res.data?.slip_image_url } : d));
        } else setError(res?.message || 'อัพโหลดไม่สำเร็จ');
      })
      .catch(() => {
        setUploading(false);
        setError('อัพโหลดไม่สำเร็จ');
      });
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <CustomerAppBar />
        <div className="flex min-h-[40vh] items-center justify-center">
          <p className="text-gray-500">กำลังโหลด...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen">
        <CustomerAppBar />
        <div className="mx-auto max-w-md p-6">
          <p className="text-red-600">{error || 'ไม่พบรายการ'}</p>
          <Link href="/choose-package" className="mt-4 inline-block text-[#1DB446] hover:underline">← กลับไปเลือกแพ็กเกจ</Link>
        </div>
      </div>
    );
  }

  const qr = data.qr_payment || {};
  const alreadySlip = data.status === 'slip_uploaded' || uploaded;

  return (
    <div className="min-h-screen">
      <CustomerAppBar />
      <div className="mx-auto max-w-md p-6">
        <h1 className="mb-2 text-xl font-bold text-gray-800">ชำระผ่าน QR โค้ด</h1>
        <p className="mb-6 text-gray-500">แพ็กเกจ: {data.package_name} — จำนวน {data.amount != null ? Number(data.amount).toLocaleString() : '0'} บาท</p>

        <div className="mb-6 rounded-xl border-2 border-gray-200 bg-gray-50 p-5">
          <h2 className="mb-3 font-semibold text-gray-800">โอนเงินเข้าบัญชี</h2>
          {qr.bank_name && <p className="text-gray-700">ธนาคาร: {qr.bank_name}</p>}
          {qr.account_no && <p className="text-gray-700">เลขบัญชี: {qr.account_no}</p>}
          {qr.account_name && <p className="text-gray-700">ชื่อบัญชี: {qr.account_name}</p>}
          {qr.qr_image_url && (
            <div className="mt-4 flex justify-center">
              <img src={qr.qr_image_url} alt="QR Code" className="max-h-48 max-w-48" />
            </div>
          )}
          {!qr.bank_name && !qr.account_no && <p className="text-amber-600">ยังไม่ได้ตั้งค่าบัญชีรับโอน แอดมินจะติดต่อคุณภายหลัง</p>}
        </div>

        {alreadySlip ? (
          <div className="rounded-xl border-2 border-green-200 bg-green-50 p-5 text-center">
            <p className="font-medium text-green-800">แนบสลิปแล้ว</p>
            <p className="mt-2 text-sm text-green-700">รอแอดมินตรวจสอบการโอนเงิน ระบบจะเปิดใช้งานให้เมื่อยืนยันแล้ว</p>
            <Link href="/home" className="mt-4 inline-block rounded-lg bg-[#1DB446] px-5 py-2.5 font-medium text-white no-underline hover:bg-[#0FA03A]">ไปหน้าแรก</Link>
          </div>
        ) : (
          <form onSubmit={handleUploadSlip} className="rounded-xl border-2 border-gray-200 bg-white p-5">
            <h2 className="mb-3 font-semibold text-gray-800">แนบสลิปการโอน</h2>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setSlipFile(e.target.files?.[0] || null)}
              className="mb-4 w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-[#1DB446] file:px-4 file:py-2 file:text-white file:hover:bg-[#0FA03A]"
            />
            <div className="flex gap-2">
              <button type="submit" disabled={!slipFile || uploading} className="flex-1 rounded-lg bg-[#1DB446] py-2.5 font-medium text-white hover:bg-[#0FA03A] disabled:opacity-50">
                {uploading ? 'กำลังอัพโหลด...' : 'ส่งสลิป'}
              </button>
              <Link href="/choose-package" className="rounded-lg border border-gray-300 px-4 py-2.5 text-center font-medium text-gray-700 hover:bg-gray-50">ยกเลิก</Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default function PayByQrPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen">
        <CustomerAppBar />
        <div className="flex min-h-[40vh] items-center justify-center">
          <p className="text-gray-500">กำลังโหลด...</p>
        </div>
      </div>
    }>
      <PayByQrContent />
    </Suspense>
  );
}
