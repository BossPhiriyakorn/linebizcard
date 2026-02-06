const axios = require('axios');
require('dotenv').config();

/**
 * LINE Service สำหรับจัดการ LINE Login และ LIFF
 */

const LINE_API_BASE = 'https://api.line.me';
const LINE_LOGIN_BASE = 'https://access.line.me';

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

module.exports = {
    getLineLoginUrl,
    exchangeCodeForToken,
    getUserProfile,
    verifyIdToken
};
