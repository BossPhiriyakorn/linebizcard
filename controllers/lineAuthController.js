const pool = require('../config/database');
const { exchangeCodeForToken, verifyIdToken } = require('../services/lineService');
const { generateToken } = require('../middleware/auth');
const crypto = require('crypto');

/**
 * LINE Login Callback
 * รับ authorization code จาก LINE และแลกเป็น access token
 */
async function lineCallback(req, res) {
    try {
        const { code, state, error } = req.query;

        // ตรวจสอบ error
        if (error) {
            return res.redirect(`/liff/login?error=${encodeURIComponent(error)}`);
        }

        if (!code) {
            return res.redirect('/liff/login?error=missing_code');
        }

        // แลก code เป็น token
        const tokenData = await exchangeCodeForToken(code);
        const { access_token, id_token } = tokenData;

        // ตรวจสอบ ID token
        const idTokenData = await verifyIdToken(id_token);
        const lineUserId = idTokenData.sub; // LINE User ID
        const displayName = idTokenData.name || 'LINE User';
        const email = idTokenData.email || null;

        // ค้นหาหรือสร้าง user ใน database
        let user;
        const existingUser = await pool.query(
            'SELECT * FROM users WHERE line_user_id = $1',
            [lineUserId]
        );

        if (existingUser.rows.length > 0) {
            // User มีอยู่แล้ว - อัปเดตข้อมูล
            user = existingUser.rows[0];
            await pool.query(
                'UPDATE users SET username = $1, email = $2, login_type = $3 WHERE line_user_id = $4',
                [displayName, email || user.email, 'line', lineUserId]
            );
        } else {
            // สร้าง user ใหม่ (ยังไม่กรอกข้อมูล profile)
            const result = await pool.query(
                `INSERT INTO users (username, email, password, line_user_id, login_type, is_profile_complete) 
                VALUES ($1, $2, $3, $4, $5, $6) 
                RETURNING id, username, email, line_user_id, login_type, is_profile_complete`,
                [
                    displayName,
                    email || `line_${lineUserId}@line.local`,
                    crypto.randomBytes(32).toString('hex'), // Random password (ไม่ใช้สำหรับ LINE login)
                    lineUserId,
                    'line',
                    false // ยังไม่กรอกข้อมูล profile
                ]
            );
            user = result.rows[0];
        }

        // สร้าง JWT token
        const token = generateToken(user);

        // ตรวจสอบว่า user กรอกข้อมูล profile ครบหรือยัง และมีการ์ดหรือไม่
        const userProfile = await pool.query(
            'SELECT is_profile_complete FROM users WHERE line_user_id = $1',
            [lineUserId]
        );
        const isProfileComplete = userProfile.rows[0]?.is_profile_complete || false;

        const cardCheck = await pool.query(
            'SELECT id FROM user_cards WHERE user_id = $1 LIMIT 1',
            [user.id]
        );
        const hasCard = cardCheck.rows.length > 0;

        const baseUrl = process.env.BASE_URL || (req.protocol + '://' + req.get('host'));

        // ตรวจสอบ share flow จากหลายแหล่ง:
        // 1. state parameter (ถ้ามี)
        // 2. referer header (ถ้ามี query parameters name)
        // 3. ตรวจสอบว่า callback URL มาจาก LIFF share flow
        
        const stateParam = state || '';
        const referer = req.headers.referer || '';
        const callbackUrl = req.originalUrl || req.url;
        
        // ตรวจสอบ share flow จาก state parameter
        const isShareFlowFromState = stateParam && (stateParam.includes('name=') || stateParam.includes('/share') || stateParam.includes('?name='));
        
        // ตรวจสอบ share flow จาก referer
        const isShareFlowFromReferer = referer && (referer.includes('name=') || referer.includes('?name='));
        
        // ถ้าเป็น share flow → redirect กลับไปที่ URL เดิมพร้อม query parameters
        if (isShareFlowFromState) {
            // Decode state ถ้าเป็น URL ที่ encode แล้ว
            let redirectUrl = stateParam;
            try {
                redirectUrl = decodeURIComponent(stateParam);
            } catch (e) {
                // ถ้า decode ไม่ได้ ใช้ state เดิม
            }
            // เพิ่ม token ใน query parameters
            const separator = redirectUrl.includes('?') ? '&' : '?';
            console.log('Share flow detected from state, redirecting to:', `${redirectUrl}${separator}token=${token}`);
            res.redirect(`${redirectUrl}${separator}token=${token}`);
            return;
        }
        
        if (isShareFlowFromReferer) {
            // พยายามดึง URL จาก referer และเพิ่ม token
            try {
                const refererUrl = new URL(referer);
                // ตรวจสอบว่ามี query parameters name หรือไม่
                if (refererUrl.searchParams.has('name') || refererUrl.search.includes('name=')) {
                    refererUrl.searchParams.set('token', token);
                    console.log('Share flow detected from referer, redirecting to:', refererUrl.toString());
                    res.redirect(refererUrl.toString());
                    return;
                }
            } catch (e) {
                // ถ้า parse referer ไม่ได้ ใช้ logic ปกติ
                console.log('Could not parse referer URL:', e.message);
            }
        }
        
        // ⚠️ สำคัญ: ถ้า callback มาจาก LIFF share flow แต่ไม่มี state/referer ที่มี name parameter
        // ให้ redirect กลับไปที่ BASE_URL (หน้า share จะจัดการ query parameters จาก localStorage)
        // ตรวจสอบว่า callback มาจาก LIFF share flow หรือไม่
        // ⚠️ สำคัญ: ตรวจสอบ share flow ก่อน redirect ไปหน้าอื่น
        // ถ้า callback มาจาก LIFF share flow → redirect กลับไปที่ BASE_URL
        // เพื่อให้ share.html จัดการ query parameters จาก localStorage
        
        // ตรวจสอบว่า callback มาจาก LIFF share flow หรือไม่
        // 1. referer มี liff.line.me (LIFF URL)
        // 2. referer เป็น BASE_URL (โดเมนหลัก) แต่ไม่ใช่ /my-cards, /create, /register-line, /liff/login
        const isLiffShareFlow = referer.includes('liff.line.me') || 
                                 (referer && referer.includes(baseUrl) && 
                                  !referer.includes('/my-cards') && 
                                  !referer.includes('/create') && 
                                  !referer.includes('/register-line') &&
                                  !referer.includes('/liff/login') &&
                                  referer !== baseUrl + '/' && // ไม่ใช่ BASE_URL ที่ไม่มี path
                                  referer !== baseUrl); // ไม่ใช่ BASE_URL ที่ไม่มี trailing slash
        
        // ถ้าเป็น LIFF share flow → redirect กลับไปที่ BASE_URL
        // share.html จะจัดการ query parameters จาก localStorage
        if (isLiffShareFlow && !isShareFlowFromState && !isShareFlowFromReferer) {
            console.log('⚠️ LIFF share flow detected - redirecting to BASE_URL');
            console.log('Referer:', referer);
            console.log('State:', stateParam);
            console.log('Callback URL:', callbackUrl);
            const shareUrl = `${baseUrl}/?token=${token}`;
            res.redirect(shareUrl);
            return;
        }

        // Logic ปกติ: redirect ตามสถานะ user
        if (!isProfileComplete) {
            // ลูกค้าใหม่ → หน้าลงทะเบียน
            const redirectUrl = `${baseUrl}/register-line?token=${token}&line_user_id=${lineUserId}`;
            res.redirect(redirectUrl);
        } else if (hasCard) {
            // ลูกค้าเก่าที่มีการ์ดแล้ว → หน้าดูการ์ดของตัวเอง
            const redirectUrl = `${baseUrl}/my-cards?token=${token}`;
            res.redirect(redirectUrl);
        } else {
            // ลูกค้าเก่าที่ยังไม่มีการ์ด → หน้าสร้างการ์ด
            const redirectUrl = `${baseUrl}/create?token=${token}`;
            res.redirect(redirectUrl);
        }

    } catch (error) {
        const msg = error.message || String(error);
        const detail = error.response?.data ? JSON.stringify(error.response.data) : '';
        console.error('LINE callback error:', msg, detail || '');
        const fullMsg = detail ? `${msg} (API: ${detail})` : msg;
        res.redirect(`/liff/login?error=${encodeURIComponent(fullMsg)}`);
    }
}

/**
 * เริ่มต้น LINE Login
 * Redirect ไป LINE Login page
 */
async function lineLogin(req, res) {
    try {
        const { getLineLoginUrl } = require('../services/lineService');
        
        // สร้าง state parameter สำหรับ CSRF protection
        const state = crypto.randomBytes(32).toString('hex');
        
        // เก็บ state ใน session หรือ cookie (ในที่นี้ใช้ query parameter)
        const loginUrl = getLineLoginUrl(state);
        
        res.redirect(loginUrl);
    } catch (error) {
        console.error('LINE login error:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการเริ่มต้น LINE Login'
        });
    }
}

/**
 * ดึงข้อมูล LINE User จาก LIFF
 * ใช้เมื่อ LIFF page ต้องการข้อมูล user
 */
async function getLineUser(req, res) {
    try {
        const lineUserId = req.user?.line_user_id || req.query.line_user_id;

        if (!lineUserId) {
            return res.status(400).json({
                success: false,
                message: 'ไม่พบ LINE User ID'
            });
        }

        const result = await pool.query(
            'SELECT id, username, email, line_user_id, login_type FROM users WHERE line_user_id = $1',
            [lineUserId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'ไม่พบ user'
            });
        }

        res.json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Get LINE user error:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการดึงข้อมูล user'
        });
    }
}

/**
 * บันทึกข้อมูล profile ของ LINE user
 * ใช้หลังจาก LINE login สำเร็จ
 */
async function completeProfile(req, res) {
    try {
        const userId = req.user.id;
        const { first_name, last_name, nickname, phone, email } = req.body;

        // Validation
        if (!first_name || !last_name || !phone || !email) {
            return res.status(400).json({
                success: false,
                message: 'กรุณากรอกข้อมูลให้ครบถ้วน (ชื่อ, นามสกุล, เบอร์โทร, อีเมล)'
            });
        }

        // อัปเดตข้อมูล user
        const result = await pool.query(
            `UPDATE users 
            SET first_name = $1, last_name = $2, nickname = $3, phone = $4, email = $5, is_profile_complete = $6
            WHERE id = $7
            RETURNING id, username, email, first_name, last_name, nickname, phone, line_user_id, login_type, is_profile_complete`,
            [first_name, last_name, nickname, phone, email, true, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'ไม่พบ user'
            });
        }

        const user = result.rows[0];

        res.json({
            success: true,
            message: 'ลงทะเบียนสำเร็จ!',
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                first_name: user.first_name,
                last_name: user.last_name,
                nickname: user.nickname,
                phone: user.phone,
                line_user_id: user.line_user_id,
                login_type: user.login_type
            }
        });
    } catch (error) {
        console.error('Complete profile error:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล: ' + error.message
        });
    }
}

module.exports = {
    lineLogin,
    lineCallback,
    getLineUser,
    completeProfile
};
