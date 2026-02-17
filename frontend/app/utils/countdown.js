/**
 * คำนวณข้อความเวลานับถอยหลังจนถึง end_date (ใช้เมื่อ remaining_days === 0 แต่เวลายังไม่หมด)
 * @param {string|Date} endDate - วันที่หมดอายุ (ISO string หรือ Date)
 * @returns {string|null} ข้อความเช่น "เหลืออีก 5 ชม. 23 นาที" หรือ null ถ้าหมดอายุแล้ว
 */
export function getMembershipCountdown(endDate) {
  if (!endDate) return null;
  const end = new Date(endDate);
  if (Number.isNaN(end.getTime())) return null;
  const now = new Date();
  const diffMs = end - now;
  if (diffMs <= 0) return null;
  const totalSeconds = Math.floor(diffMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `เหลืออีก ${hours} ชม. ${minutes} นาที`;
  }
  if (minutes > 0) {
    return `เหลืออีก ${minutes} นาที ${seconds} วินาที`;
  }
  return `เหลืออีก ${seconds} วินาที`;
}
