const rateLimit = require('express-rate-limit');

/**
 * Rate limiter สำหรับ login (ป้องกัน brute force)
 * จำกัด 10 ครั้ง / 15 นาที ต่อ IP
 */
const rateLimitLogin = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { success: false, message: 'พยายามเข้าสู่ระบบบ่อยเกินไป กรุณารอ 15 นาทีแล้วลองใหม่' },
    standardHeaders: true,
    legacyHeaders: false
});

/**
 * Rate limiter สำหรับสร้างการ์ด (ป้องกัน spam)
 * จำกัด 20 ครั้ง / 1 นาที ต่อ IP
 */
const rateLimitCreateCard = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 20,
    message: { success: false, message: 'สร้างการ์ดบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่' },
    standardHeaders: true,
    legacyHeaders: false
});

/**
 * Rate limiter สำหรับขอ OTP (ป้องกัน spam)
 * จำกัด 3 ครั้ง / 1 ชั่วโมง ต่อ IP
 * Note: Cooldown 5 นาทีจะถูกตรวจสอบใน controller
 */
const rateLimitOTPRequest = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 ชั่วโมง
    max: 3,
    message: { success: false, message: 'ขอรหัส OTP บ่อยเกินไป กรุณารอ 1 ชั่วโมงแล้วลองใหม่' },
    standardHeaders: true,
    legacyHeaders: false
});

/**
 * Rate limiter สำหรับกรอก OTP (ป้องกัน brute force)
 * จำกัด 5 ครั้ง / 15 นาที ต่อ IP
 */
const rateLimitOTPVerify = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 นาที
    max: 5,
    message: { success: false, message: 'กรอกรหัส OTP ผิดบ่อยเกินไป กรุณารอ 15 นาทีแล้วลองใหม่' },
    standardHeaders: true,
    legacyHeaders: false
});

module.exports = {
    rateLimitLogin,
    rateLimitCreateCard,
    rateLimitOTPRequest,
    rateLimitOTPVerify
};
