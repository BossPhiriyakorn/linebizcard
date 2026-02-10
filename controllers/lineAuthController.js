const pool = require('../config/database');
const { exchangeCodeForToken, verifyIdToken, getUserProfile } = require('../services/lineService');
const { generateToken } = require('../middleware/auth');
const { addCmsNotification } = require('../utils/cmsNotification');
const { encrypt, decryptIfEncrypted } = require('../utils/encryption');
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
        // รูปโปรไฟล์จาก LINE: ID token อาจมี picture หรือดึงจาก Profile API
        let profileImageUrl = idTokenData.picture || null;
        if (!profileImageUrl && access_token) {
            try {
                const lineProfile = await getUserProfile(access_token);
                profileImageUrl = lineProfile.pictureUrl || lineProfile.picture || null;
            } catch (e) {
                // ข้ามถ้าดึง profile ไม่ได้
            }
        }

        // ค้นหาหรือสร้าง user ใน database
        let user;
        const existingUser = await pool.query(
            'SELECT * FROM users WHERE line_user_id = $1',
            [lineUserId]
        );

        if (existingUser.rows.length > 0) {
            // User มีอยู่แล้ว - อัปเดตข้อมูล (รวมรูปโปรไฟล์จาก LINE)
            user = existingUser.rows[0];
            // ถ้าบัญชีถูกระงับ → ห้ามเข้าสู่ระบบ
            if (user.is_active === false) {
                const baseUrl = process.env.BASE_URL || (req.protocol + '://' + req.get('host'));
                return res.redirect(baseUrl + '/liff/login?error=' + encodeURIComponent('บัญชีถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ'));
            }
            await pool.query(
                'UPDATE users SET username = $1, email = $2, login_type = $3, profile_image_url = $4 WHERE line_user_id = $5',
                [displayName, email || user.email, 'line', profileImageUrl || user.profile_image_url, lineUserId]
            );
        } else {
            // สร้าง user ใหม่ (ยังไม่กรอกข้อมูล profile)
            const result = await pool.query(
                `INSERT INTO users (username, email, password, line_user_id, login_type, is_profile_complete, profile_image_url) 
                VALUES ($1, $2, $3, $4, $5, $6, $7) 
                RETURNING id, username, email, line_user_id, login_type, is_profile_complete`,
                [
                    displayName,
                    email || `line_${lineUserId}@line.local`,
                    crypto.randomBytes(32).toString('hex'), // Random password (ไม่ใช้สำหรับ LINE login)
                    lineUserId,
                    'line',
                    false, // ยังไม่กรอกข้อมูล profile
                    profileImageUrl
                ]
            );
            user = result.rows[0];
            addCmsNotification(pool, {
                notification_type: 'new_signup',
                title: 'ลูกค้าสมัครใหม่ (LINE)',
                message: `${user.username}`,
                link_url: '/cms/users',
                related_user_id: user.id
            }).catch(() => {});
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
            console.log('Share flow detected from state, redirecting (token omitted from log)');
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
                    console.log('Share flow detected from referer, redirecting');
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
        
        // ถ้าเป็น LIFF share flow → redirect กลับไปที่หน้า /share พร้อม token
        // หน้า share จะอ่านการ์ดจาก localStorage (share_card_name, share_card_id) ที่ตั้งก่อนไป LIFF
        if (isLiffShareFlow && !isShareFlowFromState && !isShareFlowFromReferer) {
            console.log('LIFF share flow detected - redirecting to /share');
            const shareUrl = `${baseUrl}/share?token=${token}`;
            res.redirect(shareUrl);
            return;
        }

        // Logic ปกติ: redirect ตามสถานะ user — หลังล็อกอินมาหน้าแรกเสมอ (ยกเว้นลูกค้าใหม่ที่ยังไม่กรอกโปรไฟล์)
        if (!isProfileComplete) {
            // ลูกค้าใหม่ → หน้าลงทะเบียน
            const redirectUrl = `${baseUrl}/register-line?token=${token}&line_user_id=${lineUserId}`;
            res.redirect(redirectUrl);
        } else {
            // ลูกค้าที่กรอกโปรไฟล์แล้ว → หน้าแรกเสมอ
            const redirectUrl = `${baseUrl}/home?token=${token}`;
            res.redirect(redirectUrl);
        }

    } catch (error) {
        const msg = error.message || String(error);
        const detail = error.response?.data ? JSON.stringify(error.response.data) : '';
        console.error('LINE callback error:', msg || '');
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
        console.error('LINE login error:', error && error.message ? error.message : '');
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
        console.error('Get LINE user error:', error && error.message ? error.message : '');
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
        const { first_name, last_name, nickname, phone, email, accepted_privacy_policy, accepted_terms } = req.body;

        // Validation
        if (!first_name || !last_name || !phone || !email) {
            return res.status(400).json({
                success: false,
                message: 'กรุณากรอกข้อมูลให้ครบถ้วน (ชื่อ, นามสกุล, เบอร์โทร, อีเมล)'
            });
        }

        // ดึงสถานะปัจจุบัน (ลงทะเบียนครั้งแรกหรือแก้ไขโปรไฟล์)
        const current = await pool.query(
            'SELECT email, email_verified, email_verified_at, is_profile_complete FROM users WHERE id = $1',
            [userId]
        );
        const isFirstCompletion = !current.rows[0]?.is_profile_complete;
        if (isFirstCompletion && (!accepted_privacy_policy || !accepted_terms)) {
            return res.status(400).json({
                success: false,
                message: 'กรุณาอ่านและยอมรับนโยบายความเป็นส่วนตัวและข้อกำหนดการใช้บริการ'
            });
        }

        const currentEmail = current.rows[0]?.email;
        const emailChanged = currentEmail != null && currentEmail.trim().toLowerCase() !== String(email).trim().toLowerCase();
        const newEmailVerified = emailChanged ? false : (current.rows[0]?.email_verified ?? false);
        const newEmailVerifiedAt = emailChanged ? null : (current.rows[0]?.email_verified_at ?? null);

        const ef = encrypt(first_name);
        const el = encrypt(last_name);
        const en = nickname != null && nickname !== '' ? encrypt(nickname) : null;
        const ep = encrypt(phone);
        const now = new Date();
        // ลงทะเบียนครั้งแรก = บันทึกเวลายอมรับ; แก้ไขโปรไฟล์ = ไม่เปลี่ยน accepted_*_at
        const result = await pool.query(
            isFirstCompletion
                ? `UPDATE users 
                    SET first_name = $1, last_name = $2, nickname = $3, phone = $4, email = $5, is_profile_complete = $6, email_verified = $8, email_verified_at = $9, accepted_privacy_policy_at = $10, accepted_terms_at = $11
                    WHERE id = $7
                    RETURNING id, username, email, first_name, last_name, nickname, phone, line_user_id, login_type, is_profile_complete`
                : `UPDATE users 
                    SET first_name = $1, last_name = $2, nickname = $3, phone = $4, email = $5, is_profile_complete = $6, email_verified = $8, email_verified_at = $9
                    WHERE id = $7
                    RETURNING id, username, email, first_name, last_name, nickname, phone, line_user_id, login_type, is_profile_complete`,
            isFirstCompletion ? [ef, el, en, ep, email, true, userId, newEmailVerified, newEmailVerifiedAt, now, now] : [ef, el, en, ep, email, true, userId, newEmailVerified, newEmailVerifiedAt]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'ไม่พบ user'
            });
        }

        const user = result.rows[0];

        // ลูกค้าใหม่ที่กรอกข้อมูลครบ → สร้างสมาชิกภาพแพ็กเกจฟรี 3 วันอัตโนมัติ (ถ้ายังไม่มี)
        try {
            const hasActive = await pool.query(
                'SELECT id FROM memberships WHERE user_id = $1 AND status = $2 LIMIT 1',
                [userId, 'active']
            );
            if (hasActive.rows.length === 0) {
                const freePkg = await pool.query(
                    "SELECT id, name, duration_days FROM packages WHERE (name = 'ฟรี' OR id = 1) AND COALESCE(is_active, true) = true LIMIT 1"
                );
                if (freePkg.rows.length > 0) {
                    const pkg = freePkg.rows[0];
                    const startDate = new Date();
                    const endDate = new Date(startDate);
                    endDate.setDate(endDate.getDate() + (parseInt(pkg.duration_days, 10) || 3));
                    await pool.query(
                        `INSERT INTO memberships (user_id, membership_type, start_date, end_date, status, package_id) 
                         VALUES ($1, $2, $3, $4, 'active', $5)`,
                        [userId, pkg.name, startDate, endDate, pkg.id]
                    );
                }
            }
        } catch (e) {
            console.error('Create free membership on complete-profile:', e && e.message ? e.message : '');
        }

        res.json({
            success: true,
            message: 'ลงทะเบียนสำเร็จ!',
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                first_name: decryptIfEncrypted(user.first_name),
                last_name: decryptIfEncrypted(user.last_name),
                nickname: decryptIfEncrypted(user.nickname),
                phone: decryptIfEncrypted(user.phone),
                line_user_id: user.line_user_id,
                login_type: user.login_type
            }
        });
    } catch (error) {
        console.error('Complete profile error:', error && error.message ? error.message : '');
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
