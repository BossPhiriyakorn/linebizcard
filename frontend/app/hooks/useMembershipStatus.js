'use client';

import { useState, useEffect } from 'react';
import { getToken, getHeaders, handleAuthResponse } from '../utils/auth';

/**
 * Hook สำหรับตรวจสอบสถานะ membership
 * @returns {Object} { isExpired: boolean, loading: boolean, profile: object|null }
 */
export function useMembershipStatus() {
  const [isExpired, setIsExpired] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }

    fetch('/api/user/profile', { headers: getHeaders() })
      .then((r) => {
        if (handleAuthResponse(r)) return null;
        return r.json();
      })
      .then((data) => {
        setLoading(false);
        if (data?.success && data.data) {
          setProfile(data.data);
          // ตรวจสอบว่ามีแพ็กเกจหรือไม่ — ใช้ package_name เป็นตัวบ่งชี้
          // ถ้า package_name = null/empty → ยังไม่ได้สมัครแพ็กเกจ (หรือหมดอายุแล้ว)
          const membership = data.data.membership;
          if (!membership || !membership.package_name) {
            setIsExpired(true);
          } else {
            setIsExpired(false);
          }
        } else {
          setIsExpired(true);
        }
      })
      .catch(() => {
        setLoading(false);
        setIsExpired(true);
      });
  }, []);

  return { isExpired, loading, profile };
}
