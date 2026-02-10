/**
 * Auth Controller — ลูกค้าเข้าใช้งานผ่าน LINE เท่านั้น
 * เหลือเฉพาะ logout (ตอบรับการออกจากระบบ; JWT เป็น stateless จึงลบ token ฝั่ง client)
 */

/**
 * ออกจากระบบ
 */
async function logout(req, res) {
    res.json({
        success: true,
        message: 'ออกจากระบบสำเร็จ'
    });
}

module.exports = {
    logout
};
