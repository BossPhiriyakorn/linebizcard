/**
 * Helper สำหรับเรียก API CMS
 * - ส่ง Authorization: Bearer cms_token
 * - ถ้าได้ 401/403 จะลบ token และ redirect ไป /cms/login
 * - คืนค่า response object เพื่อให้ caller ใช้ .json() ต่อ หรือ null ถ้า redirect แล้ว
 */
export function getCmsHeaders() {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('cms_token');
  return {
    Authorization: 'Bearer ' + (token || ''),
    'Content-Type': 'application/json',
  };
}

export function cmsRedirectLogin() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('cms_token');
    window.location.href = '/cms/login';
  }
}

/**
 * ตรวจสอบ response: ถ้า 401/403 ให้ redirect และ return true (caller ไม่ต้องทำอะไรต่อ)
 * ถ้าไม่ใช่ return false และ caller ใช้ r.json() ต่อได้
 */
export function handleCmsResponse(r) {
  if (r.status === 401 || r.status === 403) {
    cmsRedirectLogin();
    return true;
  }
  return false;
}
