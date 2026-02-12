/**
 * Helper สำหรับ auth ลูกค้า (token จาก localStorage)
 * ใช้ใน create, my-cards, edit-card
 */
export function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

export function getHeaders() {
  return { Authorization: 'Bearer ' + (getToken() || '') };
}

/**
 * ลบ token ลูกค้าและ redirect ไปหน้าเข้าสู่ระบบ (LINE/LIFF)
 * ใช้เมื่อได้ 401/403 จาก API ลูกค้า — ลูกค้าเข้าใช้งานผ่าน LINE จึงพาไป /liff/login
 */
export function clearTokenAndRedirectToLogin() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('token');
  window.location.href = '/liff/login';
}

/**
 * ตรวจสอบ response จาก API ลูกค้า: ถ้า 401 ให้ลบ token และ redirect ไป /liff/login
 * หมายเหตุ: ไม่จัดการ 403 ทุกกรณีที่นี่ เพราะ 403 อาจเกิดจากสมาชิกหมดอายุ (MEMBERSHIP_EXPIRED)
 * ซึ่งยังควรให้ลูกค้าเข้าแอปได้ — แต่ละหน้าต้องจัดการ 403 เอง
 * @param {Response} r - response จาก fetch
 * @returns {boolean} true ถ้า redirect แล้ว (caller ไม่ต้องทำอะไรต่อ), false ถ้าไม่ใช่ 401
 */
export function handleAuthResponse(r) {
  if (r && r.status === 401) {
    clearTokenAndRedirectToLogin();
    return true;
  }
  return false;
}

/**
 * ตรวจสอบว่า response เป็น 403 ที่เกิดจากสมาชิกหมดอายุหรือไม่
 * ใช้กับ API ที่มี requireActiveMembership middleware
 * @param {Object} data - JSON response body ที่ parse แล้ว
 * @returns {boolean} true ถ้าสมาชิกหมดอายุ
 */
export function isMembershipExpired(data) {
  return data && data.success === false && data.code === 'MEMBERSHIP_EXPIRED';
}
