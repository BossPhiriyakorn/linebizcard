const pool = require('../config/database');
const fs = require('fs-extra');
const path = require('path');
require('dotenv').config();
const { generateUniqueId, getJsonFileName } = require('../utils/uniqueId');
const { replaceTemplatePlaceholders, createFlexMessageJson } = require('../utils/templateEngine');
const { convertUploadedToWebp } = require('../utils/imageToWebp');

// สร้างโฟลเดอร์ json ถ้ายังไม่มี
const jsonDir = path.join(__dirname, '../json');
fs.ensureDirSync(jsonDir);

/**
 * สร้าง Card ใหม่
 */
async function createCard(req, res) {
    let jsonWrittenPath = null; // ใช้ลบไฟล์ถ้า INSERT ล้มเหลว
    try {
        if (req.timedout) return; // connect-timeout ส่ง 408 ไปแล้ว ไม่ส่งซ้ำ
        const userId = parseInt(req.user.id, 10);
        if (isNaN(userId)) {
            return res.status(401).json({
                success: false,
                message: 'ไม่พบข้อมูลผู้ใช้ กรุณาเข้าสู่ระบบใหม่'
            });
        }
        const { template_id, name, phone, email, description, description2 } = req.body;

        // Parse template_id เป็น integer (จาก FormData มักเป็น string)
        const templateId = template_id != null ? parseInt(String(template_id), 10) : NaN;
        if (!template_id || isNaN(templateId) || !name) {
            return res.status(400).json({
                success: false,
                message: 'กรุณาเลือก template และกรอกชื่อ'
            });
        }

        // ดึง Template
        const templateResult = await pool.query(
            'SELECT * FROM templates WHERE id = $1',
            [templateId]
        );

        if (templateResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'ไม่พบ template'
            });
        }

        const template = templateResult.rows[0];
        let templateJson;
        try {
            templateJson = JSON.parse(template.template_json);
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: 'Template JSON ไม่ถูกต้อง'
            });
        }

        // คำนวณ expires_at: ถ้ามีสมาชิก active ใช้ end_date ของสมาชิก ไม่เช่นนั้นใช้ +30 วัน
        let expiresAt = null;
        try {
            const membershipResult = await pool.query(
                `SELECT end_date FROM memberships 
                 WHERE user_id = $1 AND status = 'active' AND end_date > CURRENT_TIMESTAMP 
                 ORDER BY end_date DESC LIMIT 1`,
                [userId]
            );
            if (membershipResult.rows.length > 0 && membershipResult.rows[0].end_date) {
                expiresAt = membershipResult.rows[0].end_date;
            } else {
                const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                expiresAt = thirtyDaysFromNow;
            }
        } catch (membershipErr) {
            // ถ้าตาราง memberships ยังไม่มี ใช้ +30 วัน
            const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
            expiresAt = thirtyDaysFromNow;
        }

        const cardType = (template.card_type && ['normal', 'special', 'event'].includes(String(template.card_type).toLowerCase()))
            ? String(template.card_type).toLowerCase()
            : 'normal';

        // การ์ดพิเศษ/เทศกาล: ถ้าแทมเพลตกำหนด default_expires_at ใช้ค่านั้น
        if ((cardType === 'special' || cardType === 'event') && template.default_expires_at) {
            const templateExpiry = new Date(template.default_expires_at);
            if (!isNaN(templateExpiry.getTime())) expiresAt = templateExpiry;
        }

        // ดึงข้อมูล user profile เพื่อใช้เป็นค่าเริ่มต้น (รองรับทั้งตารางที่มีและไม่มีคอลัมน์โปรไฟล์)
        let profile = {};
        try {
            const userProfile = await pool.query(
                'SELECT first_name, last_name, nickname, phone, email FROM users WHERE id = $1',
                [userId]
            );
            profile = userProfile.rows[0] || {};
        } catch (profileErr) {
            // ถ้าตาราง users ยังไม่มีคอลัมน์ first_name, last_name, phone (ยังไม่ได้รัน migration)
            // ใช้เฉพาะ id, username, email
            const basicProfile = await pool.query(
                'SELECT id, username, email FROM users WHERE id = $1',
                [userId]
            );
            const row = basicProfile.rows[0];
            if (row) profile = { email: row.email };
        }

        // แปลงรูปที่อัปโหลดเป็น WebP (ไม่ปรับขนาด) เพื่อลดขนาดไฟล์
        if (req.file || req.files) {
            try {
                await convertUploadedToWebp(req);
            } catch (err) {
                console.error('Convert to WebP error:', err);
                return res.status(500).json({
                    success: false,
                    message: 'ไม่สามารถประมวลผลรูปภาพได้: ' + (err.message || 'เกิดข้อผิดพลาด')
                });
            }
        }

        // สร้าง image URLs (รองรับ 2 รูปภาพ: image1 และ image2)
        let imageUrl1 = '';
        let imageUrl2 = '';
        
        if (req.files) {
            if (req.files.image1 && req.files.image1[0]) {
                imageUrl1 = `${process.env.BASE_URL}/${process.env.UPLOAD_DIR}/${req.files.image1[0].filename}`;
            }
            if (req.files.image2 && req.files.image2[0]) {
                imageUrl2 = `${process.env.BASE_URL}/${process.env.UPLOAD_DIR}/${req.files.image2[0].filename}`;
            }
        } else if (req.file) {
            imageUrl1 = `${process.env.BASE_URL}/${process.env.UPLOAD_DIR}/${req.file.filename}`;
            imageUrl2 = imageUrl1;
        }
        // การ์ดที่ 2–4 ใช้ดีไซน์ใน template — ถ้าไม่มีรูปการ์ด 2 ให้ใช้รูปการ์ดแรก
        if (!imageUrl2 && imageUrl1) {
            imageUrl2 = imageUrl1;
        }

        // ใช้ข้อมูลจาก form หรือจาก profile (ถ้า form ไม่มีข้อมูล)
        const fullName = name || `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || '';
        
        // สร้าง unique ID และ LIFF URL ก่อน (ใช้ใน template ปุ่มแชร์)
        // หมายเหตุ: LIFF_ID ต้องเป็น LIFF app ที่ตั้ง Endpoint URL = BASE_URL/share และเปิด shareTargetPicker
        // ถ้ากดปุ่มแชร์บนการ์ดแล้วไปแอปแทนที่จะเด้ง share picker ให้ดู docs/LIFF_SHARE_TROUBLESHOOTING.md
        const uniqueId = generateUniqueId();
        const liffUrl = `https://liff.line.me/${process.env.LIFF_ID || ''}?name=${uniqueId}&id=1`;
        
        // แทนที่ข้อมูลใน template
        const data = {
            name: fullName || '',
            phone: phone || profile.phone || '',
            email: email || profile.email || '',
            image_url1: imageUrl1,  // รูปภาพสำหรับ Card 1
            image_url2: imageUrl2,  // รูปภาพสำหรับ Card 2
            image_url: imageUrl1,   // Fallback สำหรับ backward compatibility
            description: description || '',
            description2: description2 || description || '', // การ์ดที่ 2–4: ไม่กรอกได้ ใช้ description หรือค่าว่าง
            liff_url: liffUrl       // ลิงค์แชร์การ์ดใน LINE (ปุ่มแชร์)
        };

        // แทนที่ข้อมูลใน template (พร้อม error handling)
        let processedTemplate;
        try {
            processedTemplate = replaceTemplatePlaceholders(templateJson, data);
        } catch (templateError) {
            console.error('Template processing error:', templateError.message);
            console.error('Template error stack:', templateError.stack);
            return res.status(500).json({
                success: false,
                message: 'เกิดข้อผิดพลาดในการประมวลผล template: ' + templateError.message
            });
        }

        // สร้าง Flex Message JSON structure (รองรับ template รูปแบบ tectony1)
        const tectony1 = processedTemplate && processedTemplate.tectony1;
        if (!tectony1 || !Array.isArray(tectony1) || !tectony1[1]) {
            return res.status(500).json({
                success: false,
                message: 'โครงสร้าง Template ไม่ถูกต้อง (ต้องมี tectony1[0], tectony1[1])'
            });
        }
        const flexMessage = tectony1[1];
        const altText = (tectony1[0] && tectony1[0].linemsg) || `การ์ดของ ${fullName || name}`;
        const flexMessageJson = createFlexMessageJson(flexMessage, altText);

        // ใช้ uniqueId และ liffUrl ที่สร้างไว้แล้ว
        const jsonFileName = getJsonFileName(uniqueId);
        const jsonFilePath = path.join(jsonDir, jsonFileName);

        // บันทึก JSON file
        await fs.writeJson(jsonFilePath, flexMessageJson, { spaces: 2 });
        jsonWrittenPath = jsonFilePath;

        // บันทึกลง Database (expires_at ตามสมาชิกหรือ +30 วัน, card_type ตาม template)
        const insertResult = await pool.query(
            `INSERT INTO user_cards 
            (unique_id, user_id, template_id, json_file_name, user_name, user_phone, user_email, user_image, user_description, flex_message_json, liff_url, expires_at, card_type)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            RETURNING *`,
            [
                uniqueId,
                userId,
                templateId,
                jsonFileName,
                fullName || name,
                phone || null,
                email || null,
                imageUrl1 || null,
                description || null,
                JSON.stringify(flexMessageJson),
                liffUrl,
                expiresAt,
                cardType
            ]
        );

        const card = insertResult.rows[0];
        if (process.env.NODE_ENV !== 'production') {
            console.log('Card created: id=%s user_id=%s unique_id=%s', card.id, userId, card.unique_id);
        }

        if (res.headersSent) return; // ถ้า timeout ส่ง 408 ไปแล้ว ไม่ส่งซ้ำ
        res.status(201).json({
            success: true,
            message: 'สร้างการ์ดสำเร็จ',
            data: {
                id: card.id,
                unique_id: card.unique_id,
                liff_url: card.liff_url,
                json_file_name: card.json_file_name,
                created_at: card.created_at,
                expires_at: card.expires_at
            }
        });
    } catch (error) {
        const dbDetail = error.detail || error.message;
        console.error('Create card error:', error.message, 'code:', error.code, 'detail:', error.detail);
        // ถ้าเขียน JSON ไปแล้วแต่ INSERT ล้มเหลว ลบไฟล์ที่เขียนไว้เพื่อไม่ให้มีไฟล์ค้าง
        if (jsonWrittenPath) {
            fs.remove(jsonWrittenPath).catch((err) => console.error('Error removing orphan JSON:', err));
        }
        const msg = process.env.NODE_ENV !== 'production' && dbDetail
            ? `เกิดข้อผิดพลาดในการสร้างการ์ด: ${error.message} (${dbDetail})`
            : `เกิดข้อผิดพลาดในการสร้างการ์ด: ${error.message}`;
        if (res.headersSent) return; // ถ้า timeout ส่ง 408 ไปแล้ว ไม่ส่งซ้ำ
        res.status(500).json({
            success: false,
            message: msg
        });
    }
}

/**
 * ดึง Cards ของ User
 */
async function getMyCards(req, res) {
    try {
        const userId = parseInt(req.user.id, 10);
        if (isNaN(userId)) {
            return res.status(401).json({
                success: false,
                message: 'ไม่พบข้อมูลผู้ใช้ กรุณาเข้าสู่ระบบใหม่'
            });
        }

        const result = await pool.query(
            `SELECT 
                id, unique_id, template_id, user_name, user_phone, user_email, 
                user_image, liff_url, created_at, updated_at, expires_at, card_type,
                (SELECT name FROM templates WHERE id = user_cards.template_id) as template_name
            FROM user_cards 
            WHERE user_id = $1 
            ORDER BY COALESCE(updated_at, created_at) DESC`,
            [userId]
        );

        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        console.error('Get my cards error:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการดึงข้อมูลการ์ด'
        });
    }
}

/**
 * ดึง Card เดียว
 */
async function getCardById(req, res) {
    try {
        const userId = parseInt(req.user.id, 10);
        if (isNaN(userId)) {
            return res.status(401).json({
                success: false,
                message: 'ไม่พบข้อมูลผู้ใช้ กรุณาเข้าสู่ระบบใหม่'
            });
        }
        const { id } = req.params;

        const result = await pool.query(
            'SELECT * FROM user_cards WHERE id = $1 AND user_id = $2',
            [id, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'ไม่พบการ์ด'
            });
        }

        res.json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Get card error:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการดึงข้อมูลการ์ด'
        });
    }
}

/**
 * แก้ไข Card (อัปเดตข้อมูล — ไม่สร้างใหม่, ตั้ง updated_at)
 */
async function updateCard(req, res) {
    try {
        const userId = parseInt(req.user.id, 10);
        if (isNaN(userId)) {
            return res.status(401).json({
                success: false,
                message: 'ไม่พบข้อมูลผู้ใช้ กรุณาเข้าสู่ระบบใหม่'
            });
        }
        const { id } = req.params;
        const { name, phone, email, description } = req.body;

        const cardResult = await pool.query(
            'SELECT * FROM user_cards WHERE id = $1 AND user_id = $2',
            [id, userId]
        );

        if (cardResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'ไม่พบการ์ดหรือคุณไม่มีสิทธิ์แก้ไข'
            });
        }

        const card = cardResult.rows[0];
        const templateId = card.template_id;

        const templateResult = await pool.query(
            'SELECT * FROM templates WHERE id = $1',
            [templateId]
        );
        if (templateResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'ไม่พบ template ของการ์ดนี้'
            });
        }

        let templateJson;
        try {
            templateJson = JSON.parse(templateResult.rows[0].template_json);
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: 'Template JSON ไม่ถูกต้อง'
            });
        }

        // แปลงรูปที่อัปโหลดเป็น WebP (ไม่ปรับขนาด) เพื่อลดขนาดไฟล์
        if (req.files && (req.files.image1?.[0] || req.files.image2?.[0])) {
            try {
                await convertUploadedToWebp(req);
            } catch (err) {
                console.error('Convert to WebP error:', err);
                return res.status(500).json({
                    success: false,
                    message: 'ไม่สามารถประมวลผลรูปภาพได้: ' + (err.message || 'เกิดข้อผิดพลาด')
                });
            }
        }

        let imageUrl1 = card.user_image || '';
        if (req.files && req.files.image1 && req.files.image1[0]) {
            imageUrl1 = `${process.env.BASE_URL}/${process.env.UPLOAD_DIR}/${req.files.image1[0].filename}`;
            if (card.user_image) {
                const oldPath = path.join(__dirname, '..', card.user_image.replace(process.env.BASE_URL || '', '').replace(/^\//, ''));
                fs.remove(oldPath).catch(() => {});
            }
        }
        const imageUrl2 = imageUrl1;

        const fullName = (name !== undefined && name !== null) ? String(name).trim() : (card.user_name || '');
        const liffUrl = card.liff_url;

        const data = {
            name: fullName || '',
            phone: (phone !== undefined && phone !== null) ? String(phone) : (card.user_phone || ''),
            email: (email !== undefined && email !== null) ? String(email) : (card.user_email || ''),
            image_url1: imageUrl1,
            image_url2: imageUrl2,
            image_url: imageUrl1,
            description: (description !== undefined && description !== null) ? String(description) : '',
            description2: (description !== undefined && description !== null) ? String(description) : '',
            liff_url: liffUrl
        };

        let processedTemplate;
        try {
            processedTemplate = replaceTemplatePlaceholders(templateJson, data);
        } catch (templateError) {
            console.error('Template processing error:', templateError.message);
            return res.status(500).json({
                success: false,
                message: 'เกิดข้อผิดพลาดในการประมวลผล template: ' + templateError.message
            });
        }

        const tectony1 = processedTemplate && processedTemplate.tectony1;
        if (!tectony1 || !Array.isArray(tectony1) || !tectony1[1]) {
            return res.status(500).json({
                success: false,
                message: 'โครงสร้าง Template ไม่ถูกต้อง'
            });
        }
        const flexMessage = tectony1[1];
        const altText = (tectony1[0] && tectony1[0].linemsg) || `การ์ดของ ${fullName || 'ผู้ใช้'}`;
        const flexMessageJson = createFlexMessageJson(flexMessage, altText);

        const jsonFilePath = path.join(jsonDir, card.json_file_name);
        await fs.writeJson(jsonFilePath, flexMessageJson, { spaces: 2 });

        const descriptionVal = (description !== undefined && description !== null) ? String(description) : (card.user_description || '');
        await pool.query(
            `UPDATE user_cards SET 
                user_name = $1, user_phone = $2, user_email = $3, user_image = $4, 
                user_description = $5, flex_message_json = $6, updated_at = CURRENT_TIMESTAMP 
            WHERE id = $7 AND user_id = $8`,
            [
                fullName || null,
                data.phone || null,
                data.email || null,
                imageUrl1 || null,
                descriptionVal || null,
                JSON.stringify(flexMessageJson),
                id,
                userId
            ]
        );

        const updated = await pool.query(
            'SELECT * FROM user_cards WHERE id = $1 AND user_id = $2',
            [id, userId]
        );
        const updatedCard = updated.rows[0];

        res.json({
            success: true,
            message: 'แก้ไขการ์ดสำเร็จ',
            data: {
                id: updatedCard.id,
                unique_id: updatedCard.unique_id,
                liff_url: updatedCard.liff_url,
                updated_at: updatedCard.updated_at
            }
        });
    } catch (error) {
        console.error('Update card error:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการแก้ไขการ์ด: ' + error.message
        });
    }
}

/**
 * ลบ Card
 */
async function deleteCard(req, res) {
    try {
        const userId = parseInt(req.user.id, 10);
        if (isNaN(userId)) {
            return res.status(401).json({
                success: false,
                message: 'ไม่พบข้อมูลผู้ใช้ กรุณาเข้าสู่ระบบใหม่'
            });
        }
        const { id } = req.params;

        // ดึงข้อมูล card
        const cardResult = await pool.query(
            'SELECT * FROM user_cards WHERE id = $1 AND user_id = $2',
            [id, userId]
        );

        if (cardResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'ไม่พบการ์ดหรือคุณไม่มีสิทธิ์ลบ'
            });
        }

        const card = cardResult.rows[0];

        // ลบ JSON file
        const jsonFilePath = path.join(jsonDir, card.json_file_name);
        try {
            await fs.remove(jsonFilePath);
        } catch (error) {
            console.error('Error deleting JSON file:', error);
        }

        // ลบรูปภาพ (ถ้ามี)
        if (card.user_image) {
            const imagePath = path.join(__dirname, '..', card.user_image.replace(process.env.BASE_URL, ''));
            try {
                await fs.remove(imagePath);
            } catch (error) {
                console.error('Error deleting image:', error);
            }
        }

        // ลบจาก Database
        await pool.query(
            'DELETE FROM user_cards WHERE id = $1',
            [id]
        );

        res.json({
            success: true,
            message: 'ลบการ์ดสำเร็จ'
        });
    } catch (error) {
        console.error('Delete card error:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการลบการ์ด'
        });
    }
}

module.exports = {
    createCard,
    getMyCards,
    getCardById,
    updateCard,
    deleteCard
};
