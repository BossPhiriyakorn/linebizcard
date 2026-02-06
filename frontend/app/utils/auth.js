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
