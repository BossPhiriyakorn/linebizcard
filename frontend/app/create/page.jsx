'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useState } from 'react';
import Cropper from 'react-easy-crop';
import CustomerAppBar from '../components/CustomerAppBar';
import AlertBanner from '../components/AlertBanner';
import { getToken, getHeaders, handleAuthResponse, isMembershipExpired } from '../utils/auth';

const inputClass =
  'w-full rounded-xl border-2 border-gray-200 bg-gray-50 px-4 py-3 text-base transition-all focus:border-[#c9a962] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#c9a962]/15';
const labelClass = 'mb-2 block text-sm font-medium text-gray-800';
const sectionTitleClass =
  'mb-3 flex items-center gap-2.5 border-b-2 border-[#c9a962] pb-2.5 text-lg font-bold text-[#c9a962]';
const numberBadge = 'inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#c9a962] text-sm font-bold text-[#0c1222]';

// ตรวจสอบว่ามีแพ็กเกจหรือไม่จาก profile — ใช้ package_name เป็นตัวบ่งชี้
function checkMembershipExpiredFromProfile(profile) {
  if (!profile?.membership) return true; // ไม่มี membership = ยังไม่ได้สมัคร
  // ถ้า package_name = null/empty → ยังไม่ได้สมัครแพ็กเกจ (หรือหมดอายุแล้ว)
  return !profile.membership.package_name;
}

function CreateContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState(1);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [form, setForm] = useState({ name: '', phone: '', email: '', description: '' });
  const [image1, setImage1] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);
  const [alert, setAlert] = useState({ show: false, msg: '', type: 'error' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState(''); // ข้อความแสดงขั้นตอน
  const [createdSuccess, setCreatedSuccess] = useState(false);
  const [compressThresholdMB, setCompressThresholdMB] = useState(2); // ค่า default จนกว่าจะดึงจาก API
  const [contactDesignUrl, setContactDesignUrl] = useState(null); // ลิงค์ติดต่อออกแบบจาก CMS (ปุ่มติดต่อออกแบบ)
  const [checkingMembership, setCheckingMembership] = useState(true);

  // ครอปรูปก่อนอัปโหลด — มีไฟล์เดียว: เลือกครอปหรือใช้รูปเต็ม แล้ว compress แล้วส่งไปสร้างการ์ด
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState(null); // object URL
  const [originalFileForCrop, setOriginalFileForCrop] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [cropConfirming, setCropConfirming] = useState(false);
  const [cropAspect, setCropAspect] = useState(3 / 4); // 3/4 = แนวตั้ง (default), 4/3 = แนวนอน, undefined = อิสระ, 1 = จัตุรัส

  useEffect(() => {
    const urlToken = searchParams.get('token');
    if (urlToken) {
      localStorage.setItem('token', urlToken);
      window.history.replaceState({}, '', window.location.pathname);
    }
    if (!getToken()) {
      router.replace('/liff/login');
      return;
    }
    
    // ตรวจสอบ membership ก่อนอนุญาตให้สร้างการ์ด
    fetch('/api/user/profile', { headers: getHeaders() })
      .then((r) => {
        if (handleAuthResponse(r)) return null;
        return r.json();
      })
      .then((data) => {
        if (data === null) return;
        if (data?.success && data.data) {
          const expired = checkMembershipExpiredFromProfile(data.data);
          if (expired) {
            // หมดอายุ — redirect กลับ home
            router.replace('/home?membership_expired=1');
            return;
          }
        } else {
          // ไม่สามารถดึง profile ได้
          router.replace('/home');
          return;
        }
        setCheckingMembership(false);
        
        // โหลด config และ templates หลังจากตรวจสอบ membership ผ่านแล้ว
        fetch('/api/config')
          .then((r) => r.json())
          .then((configData) => {
            if (configData.success && configData.data) {
              if (configData.data.compressThresholdMB) setCompressThresholdMB(configData.data.compressThresholdMB);
              if (configData.data.contactDesignUrl) setContactDesignUrl(configData.data.contactDesignUrl);
            }
          })
          .catch(() => {});
        
        fetch('/api/templates', { headers: getHeaders() })
          .then((r) => (handleAuthResponse(r) ? null : r.json()))
          .then((templatesData) => {
            if (templatesData == null) return;
            if (templatesData.success && Array.isArray(templatesData.data)) {
              setTemplates((templatesData.data || []).filter((t) => t.is_active !== false));
            }
          })
          .catch(() => setAlert({ show: true, msg: 'โหลดแทมเพลตไม่สำเร็จ', type: 'error' }));
      })
      .catch(() => {
        router.replace('/home');
      });
  }, [router, searchParams]);

  useEffect(() => {
    if (!getToken() || step !== 2) return;
    fetch('/api/user/profile', { headers: getHeaders() })
      .then((r) => (handleAuthResponse(r) ? null : r.json()))
      .then((data) => {
        if (data == null) return;
        if (data.success && data.data) {
          const p = data.data;
          const fullName = `${p.first_name || ''} ${p.last_name || ''}`.trim();
          setForm((prev) => ({
            name: prev.name || fullName,
            phone: prev.phone || p.phone || '',
            email: prev.email || p.email || '',
            description: prev.description || '',
          }));
        }
      })
      .catch(() => {});
  }, [step]);

  const showAlertMsg = (msg, type) => {
    setAlert({ show: true, msg, type });
  };

  // ส่ง log จาก frontend ไปแสดงใน pm2 logs บนเซิร์ฟเวอร์
  const sendLogToServer = async (level, message) => {
    try {
      await fetch('/api/debug-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ level, message, timestamp: new Date().toISOString() })
      });
    } catch (e) {
      // Silent fail - ไม่ให้ log เอง error
    }
  };

  /**
   * ลดขนาดไฟล์รูป (compress) ทุกรูป ไม่มีขั้นต่ำ — โดยไม่เปลี่ยนความละเอียด (dimensions)
   * ยกเว้น HEIC/HEIF ที่ browser อ่านไม่ได้ ให้ server จัดการ
   * @param {File} file - ไฟล์รูปต้นฉบับ
   * @param {number} quality - คุณภาพ 0.0-1.0 (0.75 = 75%)
   * @returns {Promise<File>} - ไฟล์ที่ compress แล้ว (หรือไฟล์เดิมถ้า HEIC)
   */
  const compressImage = async (file, quality = 0.75) => {
    // ถ้าเป็น HEIF/HEIC ไม่ต้อง compress (Browser ไม่รองรับ - ให้ server จัดการ)
    const isHeic = file.type === 'image/heic' || file.type === 'image/heif' || 
                   file.name.toLowerCase().endsWith('.heic') || 
                   file.name.toLowerCase().endsWith('.heif');
    if (isHeic) {
      const msg = `[Compress] ข้าม HEIF/HEIC (${file.name}) - ให้ server จัดการ`;
      console.log(msg);
      sendLogToServer('info', msg);
      return file;
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const img = new Image();
        
        img.onload = () => {
          const canvas = document.createElement('canvas');
          
          // ใช้ขนาดเดิม (ไม่ resize dimensions)
          canvas.width = img.width;
          canvas.height = img.height;
          
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, img.width, img.height);
          
          // แปลงเป็น JPEG พร้อมลด quality
          canvas.toBlob(
            (blob) => {
              if (blob) {
                // สร้าง File object ใหม่จาก blob
                const compressedFile = new File(
                  [blob], 
                  file.name.replace(/\.\w+$/, '.jpg'), // เปลี่ยนนามสกุลเป็น .jpg
                  { type: 'image/jpeg' }
                );
                
                const originalSizeMB = (file.size / 1024 / 1024).toFixed(2);
                const compressedSizeMB = (compressedFile.size / 1024 / 1024).toFixed(2);
                const reduction = ((1 - compressedFile.size / file.size) * 100).toFixed(0);
                
                const msg = `[Compress] สำเร็จ: ${originalSizeMB}MB → ${compressedSizeMB}MB (ลด ${reduction}%) | ขนาด: ${img.width}x${img.height}px | คุณภาพ: ${quality * 100}%`;
                console.log(msg);
                sendLogToServer('info', msg);
                
                resolve(compressedFile);
              } else {
                reject(new Error('ไม่สามารถลดขนาดรูปได้'));
              }
            },
            'image/jpeg',
            quality  // คุณภาพ 0.75 = 75%
          );
        };
        
        img.onerror = () => reject(new Error('ไม่สามารถโหลดรูปได้'));
        img.src = e.target.result;
      };
      
      reader.onerror = () => reject(new Error('ไม่สามารถอ่านไฟล์ได้'));
      reader.readAsDataURL(file);
    });
  };

  const createImage = (url) =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.addEventListener('load', () => resolve(img));
      img.addEventListener('error', (e) => reject(e));
      img.src = url;
    });

  /**
   * ตัดรูปตามพื้นที่ที่เลือก (croppedAreaPixels) — ได้ไฟล์เดียวสำหรับใช้สร้างการ์ด
   * ถ้า pixelCrop เป็น null ใช้รูปเต็ม
   */
  const getCroppedImage = useCallback(async (imageSrc, pixelCrop) => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    let crop = pixelCrop;
    if (!crop || crop.width <= 0 || crop.height <= 0) {
      crop = { x: 0, y: 0, width: image.naturalWidth, height: image.naturalHeight };
    }

    canvas.width = crop.width;
    canvas.height = crop.height;
    ctx.drawImage(
      image,
      crop.x,
      crop.y,
      crop.width,
      crop.height,
      0,
      0,
      crop.width,
      crop.height
    );

    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const file = new File([blob], 'cropped-image.jpg', { type: 'image/jpeg' });
            resolve(file);
          } else reject(new Error('ไม่สามารถตัดรูปได้'));
        },
        'image/jpeg',
        0.95
      );
    });
  }, []);

  const closeCropModal = useCallback(() => {
    setCropModalOpen(false);
    setCropConfirming(false);
    if (imageToCrop) URL.revokeObjectURL(imageToCrop);
    setImageToCrop(null);
    setOriginalFileForCrop(null);
    setCroppedAreaPixels(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
  }, [imageToCrop]);

  const onCropComplete = useCallback((_, areaPixels) => {
    setCroppedAreaPixels(areaPixels);
  }, []);

  const handleUseFullImage = useCallback(() => {
    if (!originalFileForCrop) return;
    setImage1(originalFileForCrop);
    setFieldErrors((p) => ({ ...p, image: '' }));
    setImagePreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(originalFileForCrop);
    });
    closeCropModal();
  }, [originalFileForCrop, closeCropModal]);

  const handleConfirmCrop = useCallback(async () => {
    if (!imageToCrop) return;
    setCropConfirming(true);
    try {
      const croppedFile = await getCroppedImage(imageToCrop, croppedAreaPixels);
      setImage1(croppedFile);
      setFieldErrors((p) => ({ ...p, image: '' }));
      setImagePreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(croppedFile);
      });
      closeCropModal();
    } catch (err) {
      showAlertMsg(err?.message || 'ครอปรูปไม่สำเร็จ', 'error');
    } finally {
      setCropConfirming(false);
    }
  }, [imageToCrop, croppedAreaPixels, getCroppedImage, closeCropModal]);

  const handleSelectTemplate = (t) => {
    setSelectedTemplate(t);
    setStep(2);
  };

  const handleBackToTemplates = () => {
    setSelectedTemplate(null);
    setStep(1);
    setAlert({ show: false, msg: '', type: 'error' });
  };

  const handlePhoneChange = (e) => {
    const v = e.target.value.replace(/\D/g, '').slice(0, 10);
    setForm((f) => ({ ...f, phone: v }));
  };

  /**
   * ตรวจสอบว่ารูปน่าจะมาจากกล้องมือถือหรือไม่
   * รูปจากกล้องมักมีชื่อไฟล์ที่ขึ้นต้นด้วย IMG_, DSC_, หรือมี pattern พิเศษ
   */
  const isLikelyCameraPhoto = (file) => {
    if (!file || !file.name) return false;
    const name = file.name.toUpperCase();
    // รูปจากกล้องมักมีชื่อไฟล์ที่ขึ้นต้นด้วย IMG_, DSC_, PXL_, หรือมี pattern พิเศษ
    return /^(IMG_|DSC_|PXL_|PHOTO_|CAMERA_|Screenshot|Photo)/.test(name) || 
           /^\d{8}_\d{6}/.test(name) || // Pattern: YYYYMMDD_HHMMSS
           /^[A-Z]{3,4}-\d{4}/.test(name); // Pattern: ABC-1234
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0] || null;
    e.target.value = '';
    if (!file) return;
    if (file.size === 0) {
      showAlertMsg('ไฟล์รูปว่างหรือไม่รองรับ (ลองเลือกจากอัลบั้มหรือบันทึกรูปก่อนอัปโหลด)', 'error');
      return;
    }

    const isHeic = file.type === 'image/heic' || file.type === 'image/heif' ||
      file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif');

    if (file) {
      const isCamera = isLikelyCameraPhoto(file);
      const fileInfo = `[File-Info] name: ${file.name}, size: ${(file.size / 1024 / 1024).toFixed(2)}MB, type: ${file.type}, likelyCamera: ${isCamera}`;
      console.log(fileInfo);
      sendLogToServer('info', fileInfo);
    }

    // HEIC บrowser วาดไม่ได้ — ไม่เปิดครอป ใช้รูปเต็มเลย
    if (isHeic) {
      setImage1(file);
      setFieldErrors((p) => ({ ...p, image: '' }));
      setImagePreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(file);
      });
      return;
    }

    // เปิดโมดัลครอป — เริ่มต้นเป็นแนวตั้ง (3:4) เลือกเปลี่ยนเป็นแนวนอนหรืออิสระได้
    setOriginalFileForCrop(file);
    setImageToCrop(URL.createObjectURL(file));
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setCropAspect(3 / 4); // default แนวตั้ง (สูงกว่า wide)
    setCropModalOpen(true);
  };

  useEffect(() => {
    return () => {
      if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    };
  }, [imagePreviewUrl]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = {};
    if (!form.name?.trim()) err.name = 'กรุณากรอกชื่อ';
    if (!form.phone?.trim()) err.phone = 'กรุณากรอกเบอร์โทรศัพท์';
    else if (form.phone.length !== 10) err.phone = 'เบอร์โทรศัพท์ต้อง 10 หลัก';
    if (!form.email?.trim()) err.email = 'กรุณากรอกอีเมล';
    if (!image1) err.image = 'กรุณาอัปโหลดรูปภาพ';
    setFieldErrors(err);
    if (Object.keys(err).length > 0) {
      showAlertMsg('กรุณากรอกข้อมูลให้ครบถ้วน', 'error');
      return;
    }
    setLoading(true);
    setAlert({ show: false, msg: '', type: 'error' });
    setFieldErrors({});
    
    // ขั้นตอนที่ 1: ลดขนาดรูปทุกรูป ไม่มีขั้นต่ำ (ทุกแบบ ทุกแพลตฟอร์ม) — ยกเว้น HEIC ให้ server จัดการ
    let processedImage = image1;
    const originalSizeMB = (image1.size / 1024 / 1024).toFixed(2);
    const startMsg = `[Create-Frontend] เริ่มต้น: ${image1.name} (${originalSizeMB}MB) — ลดขนาดทุกรูป (ไม่มีขั้นต่ำ)`;
    console.log(startMsg);
    sendLogToServer('info', startMsg);

    try {
      setLoadingMsg(`กำลังลดขนาดรูป (${originalSizeMB}MB)...`);
      sendLogToServer('info', `[Create-Frontend] เริ่มลดขนาดรูปทุกรูป: ${image1.name} (${originalSizeMB}MB)`);
      processedImage = await compressImage(image1, 0.75);
      const compressedSizeMB = (processedImage.size / 1024 / 1024).toFixed(2);
      const reduction = processedImage.size < image1.size
        ? ((1 - processedImage.size / image1.size) * 100).toFixed(0)
        : '0';
      const compressDoneMsg = `[Create-Frontend] ลดขนาดเสร็จ: ${originalSizeMB}MB → ${compressedSizeMB}MB (ลด ${reduction}%)`;
      console.log(compressDoneMsg);
      sendLogToServer('info', compressDoneMsg);
      setLoadingMsg(`ลดขนาดรูปเสร็จ (${originalSizeMB}MB → ${compressedSizeMB}MB)`);
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (err) {
      const errorMsg = `[Create-Frontend] ลดขนาดไม่สำเร็จ: ${err.message} - ใช้ไฟล์เดิม`;
      console.error(errorMsg);
      sendLogToServer('error', errorMsg);
      processedImage = image1;
      setLoadingMsg('ลดขนาดรูปไม่สำเร็จ ใช้ไฟล์เดิม');
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // ขั้นตอนที่ 2: อัปโหลดและสร้างการ์ด
    setLoadingMsg('กำลังอัปโหลดและสร้างการ์ด...');
    const uploadMsg = `[Create-Frontend] เริ่มอัปโหลด: ${processedImage.name} (${(processedImage.size / 1024 / 1024).toFixed(2)}MB)`;
    console.log(uploadMsg);
    sendLogToServer('info', uploadMsg);
    
    const fd = new FormData();
    fd.append('template_id', selectedTemplate.id);
    fd.append('name', form.name.trim());
    if (form.phone) fd.append('phone', form.phone);
    if (form.email) fd.append('email', form.email);
    if (form.description) fd.append('description', form.description);
    fd.append('image1', processedImage);
    
    try {
      const res = await fetch('/api/create-card', {
        method: 'POST',
        headers: getHeaders(),
        body: fd,
      });
      
      const responseMsg = `[Create-Frontend] ได้รับ response: ${res.status} ${res.statusText}`;
      console.log(responseMsg);
      sendLogToServer('info', responseMsg);
      
      if (handleAuthResponse(res)) {
        setLoading(false);
        setLoadingMsg('');
        return;
      }
      const text = await res.text();
      let data;
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        const status = res.status;
        const fileSizeMB = (processedImage.size / 1024 / 1024).toFixed(2);
        let msg = res.ok ? 'ตอบกลับไม่ถูกต้อง' : 'เกิดข้อผิดพลาดจากเซิร์ฟเวอร์';
        if (status === 408 || status === 504) {
          msg = 'ใช้เวลานานเกินไป กรุณาลองใหม่ (ถ้าเลือกรูปจากกล้อง ลองใช้รูปจากอัลบั้ม)';
        } else if (status === 413) {
          // 413 Request Entity Too Large - ไฟล์ใหญ่เกิน limit ของ server/reverse proxy
          msg = `ไฟล์ใหญ่เกินไป (${fileSizeMB}MB) — ระบบกำลังลดขนาดอัตโนมัติ กรุณาลองใหม่อีกครั้ง หรือเลือกรูปที่เล็กกว่า`;
          const error413Msg = `[Create-Frontend] ❌ 413 Request Entity Too Large: ไฟล์ ${fileSizeMB}MB เกิน limit (isCamera: ${isLikelyCameraPhoto(image1)}, originalSize: ${originalSizeMB}MB)`;
          console.error(error413Msg);
          sendLogToServer('error', error413Msg);
        } else if (!res.ok) {
          msg = 'เกิดข้อผิดพลาดจากเซิร์ฟเวอร์ — ถ้าเลือกรูปจากกล้อง ลองใช้รูปจากอัลบั้มหรือถ่ายใหม่แล้วเลือกจากอัลบั้ม';
        }
        const parseErrorMsg = `[Create-Frontend] ❌ Parse error: ${status} ${text?.substring(0, 100)}`;
        console.error(parseErrorMsg);
        sendLogToServer('error', parseErrorMsg);
        showAlertMsg(msg, 'error');
        setLoading(false);
        setLoadingMsg('');
        return;
      }
      
      if (data.success) {
        const cardId = data.data?.unique_id || data.data?.id || 'unknown';
        const successMsg = `[Create-Frontend] ✅ สร้างการ์ดสำเร็จ: ${cardId}`;
        console.log(successMsg);
        sendLogToServer('info', successMsg);
        setLoadingMsg('สร้างการ์ดสำเร็จ! กำลังไปหน้าการ์ดของฉัน...');
        
        // รอ 800ms ให้เห็นข้อความ
        await new Promise(resolve => setTimeout(resolve, 800));
        
        setLoading(false);
        setLoadingMsg('');
        // ไปหน้าการ์ดของฉันพร้อม query ให้ SWR revalidate — ทุกยูสจะเห็นการ์ดใหม่ทันที
        router.push('/my-cards?created=1');
        return;
      } else if (isMembershipExpired(data)) {
        // สมาชิกหมดอายุ — แสดงข้อความแจ้ง
        sendLogToServer('error', '[Create-Frontend] ❌ สมาชิกหมดอายุ ไม่สามารถสร้างการ์ดได้');
        showAlertMsg('สมาชิกหมดอายุ ไม่สามารถสร้างการ์ดได้ กรุณาต่ออายุสมาชิกก่อน', 'error');
        setLoading(false);
        setLoadingMsg('');
      } else {
        const failMsg = `[Create-Frontend] ❌ สร้างไม่สำเร็จ: ${data.message}`;
        console.error(failMsg);
        sendLogToServer('error', failMsg);
        showAlertMsg(data.message || 'สร้างไม่สำเร็จ', 'error');
        setLoading(false);
        setLoadingMsg('');
      }
    } catch (err) {
      const exceptionMsg = `[Create-Frontend] ❌ Exception: ${err.message}`;
      console.error(exceptionMsg);
      sendLogToServer('error', exceptionMsg);
      const msg = err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ — ถ้าเลือกรูปจากกล้อง ลองใช้รูปจากอัลบั้ม';
      showAlertMsg(msg, 'error');
      setLoading(false);
      setLoadingMsg('');
    }
  };

  // แสดง loading ขณะตรวจสอบ membership
  if (checkingMembership) {
    return (
      <div className="mx-auto w-full max-w-[1200px]">
        <CustomerAppBar />
        <div className="rounded-xl bg-white p-6 shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
          <div className="flex flex-col items-center justify-center py-16">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#c9a962]/30 border-t-[#c9a962]" />
            <p className="mt-3 text-gray-500">กำลังตรวจสอบสิทธิ์...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1200px]">
      <CustomerAppBar />

      {/* โมดัลครอปรูป — สี่เหลี่ยมปรับเข้าออกได้อิสระ หรือเลือกใช้รูปเต็ม (ไฟล์เดียว ครอปหรือเต็ม → แปลง → เก็บใช้สร้างการ์ด) */}
      {cropModalOpen && imageToCrop && (
        <div className="fixed inset-0 z-[100] flex flex-col bg-black/90">
          {/* ความสูงคงที่เพื่อหลีกเลี่ยงปัญหา cropper ใน modal (react-easy-crop known issue) — aspect = width/height, 3/4 = แนวตั้ง */}
          <div className="relative w-full flex-1 min-h-[50vh]">
            <Cropper
              key={`crop-${imageToCrop}-${cropAspect ?? 'free'}`}
              image={imageToCrop}
              crop={crop}
              zoom={zoom}
              aspect={cropAspect}
              cropShape="rect"
              showGrid={true}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
              style={{ containerStyle: { background: '#000' }, cropAreaStyle: { border: '2px solid #c9a962' } }}
            />
          </div>
          <div className="flex flex-col gap-3 border-t border-gray-700 bg-gray-900/95 px-4 py-4 safe-area-pb">
            <div className="flex flex-wrap items-center justify-center gap-2">
              <span className="w-full text-center text-sm text-gray-400 mb-0.5">เลือกกรอบตั้ง หรือ นอน:</span>
              {[
                { label: 'แนวตั้ง 3:4', value: 3 / 4 },
                { label: 'แนวนอน 4:3', value: 4 / 3 },
                { label: 'อิสระ', value: undefined },
                { label: 'จัตุรัส 1:1', value: 1 },
              ].map(({ label, value }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setCropAspect(value)}
                  className={`min-h-[36px] rounded-lg px-3 py-1.5 text-sm font-medium ${
                    cropAspect === value
                      ? 'bg-[#c9a962] text-[#0c1222]'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3">
            <span className="text-sm text-gray-400">ซูม:</span>
            <input
              type="range"
              min={1}
              max={3}
              step={0.1}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-24 accent-[#c9a962]"
            />
            <button
              type="button"
              onClick={closeCropModal}
              className="min-h-[44px] rounded-lg border border-gray-500 px-4 py-2.5 font-semibold text-gray-300 hover:bg-gray-700"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={handleUseFullImage}
              className="min-h-[44px] rounded-lg border-2 border-gray-400 bg-transparent px-5 py-2.5 font-semibold text-white hover:bg-gray-700"
            >
              ใช้รูปเต็ม
            </button>
            <button
              type="button"
              onClick={handleConfirmCrop}
              disabled={cropConfirming}
              className="min-h-[44px] rounded-lg bg-[#c9a962] px-5 py-2.5 font-semibold text-[#0c1222] hover:bg-[#b8960c] disabled:opacity-50"
            >
              {cropConfirming ? 'กำลังตัดรูป...' : 'ยืนยันครอป'}
            </button>
            </div>
          </div>
        </div>
      )}

      {/* ก้อนเดียว: หัวข้อ + แจ้งเตือน + เนื้อหาขั้นตอน */}
      <div className="rounded-xl bg-white p-4 shadow-[0_8px_30px_rgba(0,0,0,0.12)] md:p-8">
        <div className="mb-4 border-b-2 border-gray-100 pb-4">
          <h2 className="flex items-center gap-2 text-lg font-bold text-gray-800 md:text-xl">
            <img src="/assets/icons/new.png" alt="" className="h-7 w-7 object-contain" />
            สร้างการ์ด
          </h2>
        </div>
        <AlertBanner
          show={alert.show}
          msg={alert.msg}
          type={alert.type}
          onClose={() => setAlert((p) => ({ ...p, show: false }))}
          autoCloseMs={alert.type === 'success' ? 5000 : 0}
        />

        {createdSuccess && (
          <div className="rounded-xl border-2 border-green-200 bg-green-50 p-6 text-center md:p-8">
            <div className="mb-4 text-5xl">✅</div>
            <h2 className="mb-2 text-xl font-bold text-green-800">สร้างการ์ดสำเร็จ</h2>
            <p className="mb-6 text-gray-600">การ์ดของคุณถูกสร้างแล้ว สามารถไปดูที่การ์ดของฉันหรือสร้างการ์ดเพิ่มได้</p>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <a
                href="/my-cards"
                className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-[#c9a962] px-6 py-3 font-semibold text-[#0c1222] no-underline hover:bg-[#b8960c]"
              >
                ไปการ์ดของฉัน
              </a>
              <button
                type="button"
                onClick={() => {
                  setCreatedSuccess(false);
                  setSelectedTemplate(null);
                  setStep(1);
                  setForm({ name: '', phone: '', email: '', description: '' });
                  setImage1(null);
                  if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
                  setImagePreviewUrl(null);
                }}
                className="inline-flex min-h-[44px] items-center justify-center rounded-lg border-2 border-[#c9a962] bg-white px-6 py-3 font-semibold text-[#c9a962] hover:bg-[#c9a962] hover:text-[#0c1222]"
              >
                สร้างการ์ดอีก
              </button>
            </div>
          </div>
        )}

        {!createdSuccess && step === 1 && (
        <div>
          <div className="mb-6 grid grid-cols-2 gap-3">
            <Link
              href="/create-custom"
              className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border-2 border-[#c9a962] bg-[#c9a962] px-3 py-3 text-sm font-semibold text-[#0c1222] shadow-sm transition-all hover:bg-[#b8960c] hover:shadow-md whitespace-nowrap"
            >
              <span>🎨</span> ออกแบบการ์ดเอง
            </Link>
            {contactDesignUrl ? (
              <a
                href={contactDesignUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border-2 border-gray-300 bg-white px-3 py-3 text-sm font-semibold text-gray-700 transition-all hover:border-[#c9a962] hover:bg-gray-50 hover:text-[#c9a962] whitespace-nowrap"
              >
                <span>📩</span> ติดต่อออกแบบ
              </a>
            ) : (
              <span className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border-2 border-gray-200 bg-gray-50 px-3 py-3 text-sm font-semibold text-gray-400 whitespace-nowrap cursor-not-allowed" title="แอดมินยังไม่ได้ตั้งค่าลิงค์ติดต่อใน CMS">
                <span>📩</span> ติดต่อออกแบบ
              </span>
            )}
          </div>
          <h2 className={`${sectionTitleClass} mb-2`}>
            <span className={numberBadge}>1</span> เลือก Template
          </h2>
          <p className="mb-5 text-gray-500 text-[0.95rem]">
            กดเลือก Template ที่ต้องการ แล้วไปหน้าถัดไปเพื่อกรอกข้อมูล
          </p>
          {templates.length === 0 && !alert.show && <p className="text-gray-500">กำลังโหลด Templates...</p>}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fill,minmax(260px,1fr))]">
            {templates.map((t) => {
              let displayImage = null;
              if (t.sample_image_urls) {
                try {
                  const urls = typeof t.sample_image_urls === 'string' ? JSON.parse(t.sample_image_urls) : t.sample_image_urls;
                  if (Array.isArray(urls) && urls.length > 0 && typeof urls[0] === 'string' && urls[0].trim()) displayImage = urls[0].trim();
                } catch (_) {}
              }
              if (!displayImage) displayImage = t.preview_image || null;
              return (
                <div
                  key={t.id}
                  className="relative cursor-pointer overflow-hidden rounded-2xl border-2 border-gray-200 bg-white p-5 transition-all hover:-translate-y-2 hover:border-[#c9a962] hover:shadow-lg hover:shadow-[#c9a962]/20 before:absolute before:left-0 before:top-0 before:h-1 before:w-full before:scale-x-100 before:bg-gradient-to-r before:from-[#c9a962] before:to-[#b8960c]"
                  onClick={() => handleSelectTemplate(t)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && handleSelectTemplate(t)}
                >
                  {displayImage && <img src={displayImage} alt={t.name} className="mb-2.5 h-[150px] w-full rounded-lg object-cover" />}
                  <h3 className="mb-1 text-gray-800 text-lg font-medium">{t.name}</h3>
                  <p className="mb-3 text-sm text-gray-500">{t.description || '-'}</p>
                  <div className="flex justify-center">
                    <span className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-[#c9a962] px-4 py-2.5 text-sm font-semibold text-[#0c1222]">
                      เลือกและกรอกข้อมูล
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        )}

        {!createdSuccess && step === 2 && selectedTemplate && (
        <div>
          <h2 className="mb-2 text-xl font-bold text-gray-800">2. กรอกข้อมูล</h2>
          <p className="mb-4 text-[0.95rem] text-gray-500">กรอกข้อมูลด้านล่างเพื่อสร้างการ์ด</p>
          <button
            type="button"
            className="mb-6 inline-flex min-h-[44px] items-center justify-center rounded-lg border-2 border-[#c9a962] bg-white px-4 py-2.5 text-sm font-semibold text-[#c9a962] hover:bg-[#c9a962] hover:text-[#0c1222]"
            onClick={handleBackToTemplates}
          >
            ← เปลี่ยน template
          </button>

          {(() => {
            const raw = selectedTemplate.sample_image_urls;
            let urls = [];
            if (raw != null && raw !== '') {
              try {
                urls = typeof raw === 'string' ? JSON.parse(raw) : raw;
                if (!Array.isArray(urls)) urls = [];
              } catch (_) { urls = []; }
            }
            urls = urls.filter((u) => typeof u === 'string' && u.trim() !== '');
            if (urls.length === 0) return null;
            return (
              <div className="mb-6 rounded-xl border-2 border-gray-200 bg-gray-50 p-4 md:p-5">
                <h3 className={sectionTitleClass}>
                  <span className={numberBadge}>🖼</span> รูปตัวอย่างการ์ด (การ์ดจริงที่สร้างแล้ว)
                </h3>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-[repeat(auto-fill,minmax(200px,1fr))]">
                  {urls.map((src, idx) => (
                    <div key={idx} className="aspect-square overflow-hidden rounded-lg border border-gray-200 bg-slate-100">
                      <img src={src} alt={`ตัวอย่างการ์ด ${idx + 1}`} className="h-full w-full object-cover" onError={(e) => { e.target.style.display = 'none'; e.target.parentElement.style.background = '#eee'; }} />
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          <div className="w-full">
            <form onSubmit={handleSubmit}>
              <div className="mb-6 rounded-xl border-2 border-gray-200 bg-gray-50 p-4 transition-colors hover:border-[#c9a962] md:p-5">
                <h3 className={sectionTitleClass}>
                  <span className={numberBadge}>1</span> การ์ดข้อมูลติดต่อ
                </h3>
                <div className="mb-5">
                  <label htmlFor="create-name" className={labelClass}>ชื่อ <span className="text-red-600" aria-hidden="true">*</span></label>
                  <input
                    id="create-name"
                    type="text"
                    required
                    placeholder="กรอกชื่อ-นามสกุล"
                    value={form.name}
                    onChange={(e) => { setForm((f) => ({ ...f, name: e.target.value })); setFieldErrors((p) => ({ ...p, name: '' })); }}
                    className={inputClass}
                  />
                  {fieldErrors.name && <p className="mt-1 text-sm text-red-600">{fieldErrors.name}</p>}
                </div>
                <div className="mb-5">
                  <label htmlFor="create-phone" className={labelClass}>Tel. <span className="text-red-600" aria-hidden="true">*</span></label>
                  <input
                    id="create-phone"
                    type="tel"
                    required
                    placeholder="เบอร์โทรศัพท์ 10 หลัก"
                    maxLength={10}
                    inputMode="numeric"
                    value={form.phone}
                    onChange={(e) => { handlePhoneChange(e); setFieldErrors((p) => ({ ...p, phone: '' })); }}
                    className={inputClass}
                  />
                  <small className="mt-1 block text-sm italic text-gray-500">ต้องกรอก 10 หลัก</small>
                  {fieldErrors.phone && <p className="mt-1 text-sm text-red-600">{fieldErrors.phone}</p>}
                </div>
                <div className="mb-5">
                  <label htmlFor="create-email" className={labelClass}>Email <span className="text-red-600" aria-hidden="true">*</span></label>
                  <input
                    id="create-email"
                    type="email"
                    required
                    placeholder="อีเมล"
                    value={form.email}
                    onChange={(e) => { setForm((f) => ({ ...f, email: e.target.value })); setFieldErrors((p) => ({ ...p, email: '' })); }}
                    className={inputClass}
                  />
                  {fieldErrors.email && <p className="mt-1 text-sm text-red-600">{fieldErrors.email}</p>}
                </div>
                <div className="mb-5">
                  <label htmlFor="create-desc" className={labelClass}>รายละเอียด</label>
                  <textarea
                    id="create-desc"
                    rows={3}
                    placeholder="กรอกรายละเอียดสำหรับการ์ด..."
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="mb-6 rounded-xl border-2 border-gray-200 bg-gray-50 p-4 md:p-5">
                <h3 className={sectionTitleClass}>
                  <span className={numberBadge}>📷</span> รูปภาพ
                </h3>
                <div className="mb-5">
                  <label htmlFor="create-image1" className={labelClass}>อัพโหลดรูปภาพ <span className="text-red-600" aria-hidden="true">*</span></label>
                  <input
                    id="create-image1"
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp,image/avif,image/heic,image/heif"
                    onChange={handleImageChange}
                    className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-lg file:border-0 file:bg-[#c9a962] file:px-4 file:py-2 file:font-semibold file:text-[#0c1222]"
                  />
                  <small className="mt-1 block text-sm italic text-gray-500">เลือกรูปแล้วจะเปิดหน้าครอป — ปรับกรอบสี่เหลี่ยมได้อิสระ หรือกด &quot;ใช้รูปเต็ม&quot; แล้วยืนยัน ระบบจะใช้ไฟล์เดียว (ครอปหรือเต็ม) แปลงและเก็บเพื่อสร้างการ์ด</small>
                  {imagePreviewUrl && (
                    <div className="mt-3 text-center">
                      <img src={imagePreviewUrl} alt="Preview" className="mx-auto max-h-[200px] max-w-full rounded-lg object-cover shadow" />
                    </div>
                  )}
                  {fieldErrors.image && <p className="mt-1 text-sm text-red-600">{fieldErrors.image}</p>}
                </div>
              </div>

              {loading ? (
                <div className="flex flex-col items-center justify-center gap-3 rounded-xl bg-gray-50 border-2 border-gray-200 py-8 px-4">
                  <svg className="animate-spin h-8 w-8 text-[#c9a962]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <p className="text-sm font-medium text-gray-700">{loadingMsg || 'กำลังสร้างการ์ด...'}</p>
                </div>
              ) : (
                <div className="flex gap-2.5">
                  <button
                    type="button"
                    className="inline-flex min-h-[44px] items-center justify-center rounded-lg border-2 border-[#c9a962] bg-white px-5 py-3 font-semibold text-[#c9a962] hover:bg-[#c9a962] hover:text-[#0c1222]"
                    onClick={handleBackToTemplates}
                  >
                    ย้อนกลับ
                  </button>
                  <button
                    type="submit"
                    className="flex-1 min-h-[44px] rounded-lg bg-[#c9a962] px-5 py-3 font-semibold text-[#0c1222] hover:bg-[#b8960c] disabled:bg-gray-400 disabled:cursor-not-allowed"
                    disabled={!form.name?.trim() || form.phone.length !== 10 || !form.email?.trim() || !image1}
                  >
                    สร้างการ์ด
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
        )}
      </div>
    </div>
  );
}

export default function CreatePage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-[1200px]">
          <CustomerAppBar />
          <div className="mb-4 rounded-xl bg-white px-4 py-3 shadow-[0_2px_10px_rgba(0,0,0,0.1)] md:px-8">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-800 md:text-xl">
              <img src="/assets/icons/new.png" alt="" className="h-7 w-7 object-contain" />
              สร้างการ์ด
            </h2>
          </div>
          <div className="rounded-xl bg-white p-6 shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
            <p className="text-gray-500">กำลังโหลด...</p>
          </div>
        </div>
      }
    >
      <CreateContent />
    </Suspense>
  );
}
