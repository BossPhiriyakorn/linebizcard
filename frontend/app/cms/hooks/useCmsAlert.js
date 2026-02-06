import { useState, useCallback, useRef, useEffect } from 'react';

const DEFAULT_DURATION_MS = 4000;

/**
 * Hook สำหรับแจ้งเตือนใน CMS (success/error) หายเองหลัง duration
 * @param {number} [durationMs]
 * @returns {[ { show: boolean, msg: string, type: 'error'|'success' }, (msg: string, type: 'error'|'success') => void ]}
 */
export function useCmsAlert(durationMs = DEFAULT_DURATION_MS) {
  const [alert, setAlert] = useState({ show: false, msg: '', type: 'error' });
  const timeoutRef = useRef(null);

  useEffect(() => () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  const showAlert = useCallback((msg, type = 'error') => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setAlert({ show: true, msg, type });
    timeoutRef.current = setTimeout(() => {
      setAlert((prev) => ({ ...prev, show: false }));
      timeoutRef.current = null;
    }, durationMs);
  }, [durationMs]);

  const clearAlert = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
    setAlert((prev) => ({ ...prev, show: false }));
  }, []);

  return [alert, showAlert, clearAlert];
}
