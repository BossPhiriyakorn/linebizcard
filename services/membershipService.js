/**
 * อัปเดตสมาชิกที่หมดอายุ (end_date ผ่านแล้ว) เป็นสถานะไม่มีแพ็กเกจ
 * ตั้ง status = 'expired', package_id = NULL เพื่อให้ระบบอื่น (สร้าง/แชร์การ์ด) ใช้ requireActiveMembership ได้สอดคล้อง
 */
async function expireOverdueMemberships(pool) {
    if (!pool) return;
    try {
        const result = await pool.query(
            `UPDATE memberships 
             SET status = 'expired', package_id = NULL, updated_at = CURRENT_TIMESTAMP 
             WHERE status = 'active' AND end_date < CURRENT_TIMESTAMP 
             RETURNING id`
        );
        if (result.rowCount > 0) {
            console.log('[membershipService] Marked expired memberships:', result.rowCount);
        }
    } catch (err) {
        console.error('[membershipService] expireOverdueMemberships error:', err);
    }
}

module.exports = {
    expireOverdueMemberships
};
