const axios = require('axios');
require('dotenv').config();

/**
 * LINE Service สำหรับจัดการ LINE Login, LIFF และ Messaging API (Push Message)
 */

const LINE_API_BASE = 'https://api.line.me';
const LINE_LOGIN_BASE = 'https://access.line.me';
const LINE_MESSAGING_API = 'https://api.line.me/v2/bot';

/**
 * สร้าง LINE Login URL
 * @param {string} state - State parameter สำหรับ CSRF protection
 * @returns {string} LINE Login URL
 */
function getLineLoginUrl(state) {
    const params = new URLSearchParams({
        response_type: 'code',
        client_id: process.env.LINE_CHANNEL_ID,
        redirect_uri: process.env.LINE_CALLBACK_URL,
        state: state,
        scope: 'profile openid',
        nonce: require('crypto').randomBytes(16).toString('hex')
    });

    return `${LINE_LOGIN_BASE}/oauth2/v2.1/authorize?${params.toString()}`;
}

/**
 * แลก authorization code เป็น access token
 * @param {string} code - Authorization code จาก LINE
 * @returns {Promise<Object>} Access token และ ID token
 */
async function exchangeCodeForToken(code) {
    try {
        const response = await axios.post(
            `${LINE_API_BASE}/oauth2/v2.1/token`,
            new URLSearchParams({
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: process.env.LINE_CALLBACK_URL,
                client_id: process.env.LINE_CHANNEL_ID,
                client_secret: process.env.LINE_CHANNEL_SECRET
            }),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        );

        return response.data;
    } catch (error) {
        const apiData = error.response?.data;
        console.error('Error exchanging code for token:', apiData || error.message);
        const err = new Error(apiData?.error_description || apiData?.error || 'ไม่สามารถแลก authorization code ได้');
        err.response = error.response;
        throw err;
    }
}

/**
 * ดึงข้อมูล user profile จาก LINE
 * @param {string} accessToken - Access token
 * @returns {Promise<Object>} User profile
 */
async function getUserProfile(accessToken) {
    try {
        const response = await axios.get(
            `${LINE_API_BASE}/v2/profile`,
            {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            }
        );

        return response.data;
    } catch (error) {
        console.error('Error getting user profile:', error.response?.data || error.message);
        throw new Error('ไม่สามารถดึงข้อมูล user profile ได้');
    }
}

/**
 * ตรวจสอบและดึงข้อมูลจาก ID token
 * @param {string} idToken - ID token จาก LINE
 * @returns {Promise<Object>} Decoded ID token data
 */
async function verifyIdToken(idToken) {
    try {
        const response = await axios.post(
            `${LINE_API_BASE}/oauth2/v2.1/verify`,
            new URLSearchParams({
                id_token: idToken,
                client_id: process.env.LINE_CHANNEL_ID
            }),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        );

        return response.data;
    } catch (error) {
        const apiData = error.response?.data;
        console.error('Error verifying ID token:', apiData || error.message);
        const err = new Error(apiData?.error_description || apiData?.error || 'ไม่สามารถตรวจสอบ ID token ได้');
        err.response = error.response;
        throw err;
    }
}

/**
 * ส่ง Flex Message ไปให้ผู้ใช้ใน LINE (Push Message) — ใช้ Messaging API Channel
 * ใช้หลังสร้างการ์ดเสร็จ — ต้องใช้ userId ของ Messaging API Channel (messaging_api_user_id)
 * ไม่ใช่ line_user_id จาก LINE Login (คนละ Channel)
 */
async function pushFlexMessage(toUserId, flexContents, altText = 'การ์ดของคุณ') {
    const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
    if (!token || !toUserId) {
        if (!token) console.warn('LINE_CHANNEL_ACCESS_TOKEN ไม่ได้ตั้งค่า — ข้ามการส่งการ์ดให้ลูกค้าใน LINE');
        return false;
    }
    try {
        const r = await axios.post(
            `${LINE_MESSAGING_API}/message/push`,
            {
                to: toUserId,
                messages: [{ type: 'flex', altText, contents: flexContents }]
            },
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        return r.status === 200;
    } catch (e) {
        console.error('Push Flex Message error:', e.response?.data || e.message);
        return false;
    }
}

module.exports = {
    getLineLoginUrl,
    exchangeCodeForToken,
    getUserProfile,
    verifyIdToken,
    pushFlexMessage
};
