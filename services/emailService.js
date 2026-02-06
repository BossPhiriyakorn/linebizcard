const nodemailer = require('nodemailer');
require('dotenv').config();

/**
 * สร้าง nodemailer transporter สำหรับ Gmail SMTP
 */
function createEmailTransporter() {
    return nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    });
}

/**
 * สร้างรหัส OTP 6 หลัก
 */
function generateOTP() {
    const length = parseInt(process.env.OTP_CODE_LENGTH || '6');
    const min = Math.pow(10, length - 1);
    const max = Math.pow(10, length) - 1;
    return Math.floor(Math.random() * (max - min + 1) + min).toString();
}

/**
 * ส่งอีเมล OTP ไปยังผู้ใช้
 * @param {string} email - อีเมลผู้รับ
 * @param {string} otpCode - รหัส OTP 6 หลัก
 * @returns {Promise<Object>} ผลลัพธ์การส่งอีเมล
 */
async function sendOTPEmail(email, otpCode) {
    const transporter = createEmailTransporter();
    
    const mailOptions = {
        from: `"${process.env.EMAIL_FROM_NAME || 'MagicBiz Card'}" <${process.env.EMAIL_FROM || process.env.SMTP_USER}>`,
        to: email,
        subject: 'รหัสยืนยันอีเมล - MagicBiz Card',
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                    body {
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                        line-height: 1.6;
                        color: #333;
                        max-width: 600px;
                        margin: 0 auto;
                        padding: 20px;
                        background-color: #f4f4f4;
                    }
                    .container {
                        background-color: #ffffff;
                        border-radius: 10px;
                        padding: 30px;
                        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                    }
                    .header {
                        text-align: center;
                        margin-bottom: 30px;
                    }
                    .header h1 {
                        color: #5b21b6;
                        margin: 0;
                        font-size: 28px;
                    }
                    .otp-box {
                        background-color: #f8f9fa;
                        border: 2px dashed #5b21b6;
                        border-radius: 8px;
                        padding: 20px;
                        text-align: center;
                        margin: 30px 0;
                    }
                    .otp-code {
                        font-size: 36px;
                        font-weight: bold;
                        color: #5b21b6;
                        letter-spacing: 8px;
                        font-family: 'Courier New', monospace;
                    }
                    .info {
                        background-color: #fff3cd;
                        border-left: 4px solid #ffc107;
                        padding: 15px;
                        margin: 20px 0;
                        border-radius: 4px;
                    }
                    .footer {
                        margin-top: 30px;
                        padding-top: 20px;
                        border-top: 1px solid #e0e0e0;
                        text-align: center;
                        color: #666;
                        font-size: 12px;
                    }
                    .warning {
                        color: #dc3545;
                        font-weight: bold;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🔐 ยืนยันอีเมลของคุณ</h1>
                    </div>
                    
                    <p>สวัสดีครับ/ค่ะ</p>
                    
                    <p>คุณได้ขอรหัสยืนยันอีเมลสำหรับบัญชี MagicBiz Card ของคุณ</p>
                    
                    <div class="otp-box">
                        <p style="margin-top: 0; color: #666;">รหัสยืนยันของคุณคือ:</p>
                        <div class="otp-code">${otpCode}</div>
                        <p style="margin-bottom: 0; color: #666; font-size: 14px;">กรุณาคัดลอกรหัสนี้ไปกรอกในหน้าเว็บ</p>
                    </div>
                    
                    <div class="info">
                        <p style="margin: 0;"><strong>⚠️ ข้อควรระวัง:</strong></p>
                        <ul style="margin: 10px 0 0 20px; padding: 0;">
                            <li>รหัสนี้จะหมดอายุใน <strong>5 นาที</strong></li>
                            <li>อย่าแชร์รหัสนี้กับผู้อื่น</li>
                            <li>หากคุณไม่ได้ขอรหัสนี้ กรุณาเพิกเฉยอีเมลนี้</li>
                        </ul>
                    </div>
                    
                    <p>หากคุณมีคำถามหรือต้องการความช่วยเหลือ กรุณาติดต่อทีมสนับสนุนของเรา</p>
                    
                    <div class="footer">
                        <p>อีเมลนี้ถูกส่งโดยอัตโนมัติ กรุณาอย่าตอบกลับ</p>
                        <p>&copy; ${new Date().getFullYear()} MagicBiz Card. สงวนลิขสิทธิ์</p>
                    </div>
                </div>
            </body>
            </html>
        `,
        text: `
ยืนยันอีเมลของคุณ - MagicBiz Card

รหัสยืนยันของคุณคือ: ${otpCode}

รหัสนี้จะหมดอายุใน 5 นาที

⚠️ ข้อควรระวัง:
- อย่าแชร์รหัสนี้กับผู้อื่น
- หากคุณไม่ได้ขอรหัสนี้ กรุณาเพิกเฉยอีเมลนี้

อีเมลนี้ถูกส่งโดยอัตโนมัติ กรุณาอย่าตอบกลับ
        `.trim()
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent successfully:', info.messageId);
        return {
            success: true,
            messageId: info.messageId
        };
    } catch (error) {
        console.error('Error sending email:', error);
        throw new Error(`ไม่สามารถส่งอีเมลได้: ${error.message}`);
    }
}

module.exports = {
    createEmailTransporter,
    generateOTP,
    sendOTPEmail
};
