/**
 * Google Drive API — อัปโหลด/ดึง/ลบ รูปและ JSON การ์ด
 * โครงสร้าง: โฟลเดอร์หลัก (รูป | json) / user_id / ไฟล์
 *
 * หมายเหตุ: ทุก API call ใช้ supportsAllDrives: true เพื่อให้ Service Account
 * อัปโหลดไปยังโฟลเดอร์ที่แชร์มาได้ (Service Account ไม่มี storage quota ของตัวเอง)
 */
const path = require('path');
const { Readable } = require('stream');
const { google } = require('googleapis');

let driveClient = null;

function getCredentialsPath() {
    const raw = process.env.GOOGLE_DRIVE_CREDENTIALS_PATH || 'Credentials.json';
    return path.isAbsolute(raw) ? raw : path.join(process.cwd(), raw);
}

/**
 * สร้าง Drive API client (ใช้ credentials จาก env)
 */
function getDrive() {
    if (driveClient) return driveClient;
    const keyFile = getCredentialsPath();
    const auth = new google.auth.GoogleAuth({
        keyFile,
        scopes: ['https://www.googleapis.com/auth/drive']
    });
    driveClient = google.drive({ version: 'v3', auth });
    return driveClient;
}

/**
 * แปลง Buffer เป็น Readable stream ที่ googleapis-common รับได้ (ต้องมี .pipe, _read, _readableState)
 */
function bufferToStream(buffer) {
    const r = new Readable();
    r._read = () => {};
    r.push(buffer);
    r.push(null);
    return r;
}

/**
 * หาโฟลเดอร์ย่อยตามชื่อ (เช่น user_id) ใต้ parentId — ถ้าไม่มีจะสร้าง
 * @param {string} parentFolderId - ID โฟลเดอร์หลัก (รูป หรือ json)
 * @param {string|number} userId - ชื่อโฟลเดอร์ย่อย (user_id)
 * @returns {Promise<string>} folder ID
 */
async function ensureUserFolder(parentFolderId, userId) {
    const drive = getDrive();
    const folderName = String(userId);

    const listRes = await drive.files.list({
        q: `'${parentFolderId}' in parents and name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        fields: 'files(id,name)',
        pageSize: 1,
        supportsAllDrives: true,
        includeItemsFromAllDrives: true
    });

    if (listRes.data.files && listRes.data.files.length > 0) {
        return listRes.data.files[0].id;
    }

    const createRes = await drive.files.create({
        requestBody: {
            name: folderName,
            parents: [parentFolderId],
            mimeType: 'application/vnd.google-apps.folder'
        },
        fields: 'id',
        supportsAllDrives: true
    });
    return createRes.data.id;
}

/**
 * อัปโหลดไฟล์ไป Drive
 * @param {string} parentFolderId - ID โฟลเดอร์ปลายทาง (ควรเป็น user_id subfolder)
 * @param {string} fileName - ชื่อไฟล์
 * @param {string} mimeType - MIME type
 * @param {Buffer|Readable} body - เนื้อหาไฟล์
 * @returns {Promise<{ fileId: string }>}
 */
async function uploadFile(parentFolderId, fileName, mimeType, body) {
    const drive = getDrive();
    // googleapis multipart ใช้ part.body.pipe() และ isReadableStream ตรวจ _read, _readableState
    const mediaBody = Buffer.isBuffer(body) ? bufferToStream(body) : body;
    const createRes = await drive.files.create({
        requestBody: {
            name: fileName,
            parents: [parentFolderId]
        },
        media: {
            mimeType,
            body: mediaBody
        },
        fields: 'id',
        supportsAllDrives: true
    });
    return { fileId: createRes.data.id };
}

/**
 * ตั้งสิทธิ์ "Anyone with the link can view" สำหรับไฟล์ (ใช้กับรูปเพื่อให้ LINE โหลดได้)
 */
async function setFilePublic(fileId) {
    const drive = getDrive();
    await drive.permissions.create({
        fileId,
        requestBody: {
            type: 'anyone',
            role: 'reader'
        },
        supportsAllDrives: true
    });
}

/**
 * ได้ URL สำหรับแสดงรูป (ใช้ proxy ผ่านเซิร์ฟเวอร์ของเราเพื่อให้ LINE และ browser โหลดได้)
 * Google Drive uc?export=view redirect หลายครั้งทำให้ LINE/browser ไม่แสดง
 */
function getPublicViewUrl(fileId) {
    const base = (process.env.BASE_URL || '').replace(/\/+$/, '');
    return `${base}/api/drive-image/${fileId}`;
}

/**
 * ดึงรูปจาก Drive เป็น Buffer (ใช้กับ proxy endpoint)
 */
async function getImageBuffer(fileId) {
    const drive = getDrive();
    // ดึง metadata ก่อนเพื่อรับ mimeType
    const meta = await drive.files.get({
        fileId,
        fields: 'mimeType,size',
        supportsAllDrives: true
    });
    const mimeType = meta.data.mimeType || 'image/webp';

    // ดึงเนื้อหาไฟล์
    const res = await drive.files.get(
        { fileId, alt: 'media', supportsAllDrives: true },
        { responseType: 'arraybuffer' }
    );
    return { buffer: Buffer.from(res.data), mimeType };
}

/**
 * แปลง URL รูป Drive เก่า (uc?export=view) เป็น proxy URL ใหม่
 * ใช้สำหรับการ์ดที่สร้างก่อนเปลี่ยนระบบ
 */
function transformDriveUrl(url) {
    if (!url) return url;
    const match = url.match(/drive\.google\.com\/uc\?export=view&id=([^&"]+)/);
    if (match) {
        const base = (process.env.BASE_URL || '').replace(/\/+$/, '');
        return `${base}/api/drive-image/${match[1]}`;
    }
    return url;
}

/**
 * แปลง URL Drive เก่าทั้งหมดในข้อความ JSON (สำหรับ Flex Message JSON ที่เก็บไว้ใน Drive)
 */
function transformDriveUrlsInString(str) {
    if (!str) return str;
    const base = (process.env.BASE_URL || '').replace(/\/+$/, '');
    return str.replace(
        /https?:\/\/drive\.google\.com\/uc\?export=view&id=([^"&\s]+)/g,
        `${base}/api/drive-image/$1`
    );
}

/**
 * อัปโหลดรูปไป Drive: Upload/{user_id}/{fileName}, ตั้ง public, คืน URL
 */
async function uploadImage(userId, buffer, mimeType, fileName) {
    const imagesFolderId = process.env.GOOGLE_DRIVE_IMAGES_FOLDER_ID;
    if (!imagesFolderId) throw new Error('GOOGLE_DRIVE_IMAGES_FOLDER_ID ไม่ได้ตั้งค่า');

    const userFolderId = await ensureUserFolder(imagesFolderId, userId);
    const { fileId } = await uploadFile(userFolderId, fileName, mimeType || 'image/webp', buffer);
    await setFilePublic(fileId);
    const url = getPublicViewUrl(fileId);
    return { fileId, url };
}

/**
 * อัปโหลด JSON ไป Drive: json/{user_id}/{fileName}
 */
async function uploadJson(userId, jsonContent, fileName) {
    const jsonFolderId = process.env.GOOGLE_DRIVE_JSON_FOLDER_ID;
    if (!jsonFolderId) throw new Error('GOOGLE_DRIVE_JSON_FOLDER_ID ไม่ได้ตั้งค่า');

    const userFolderId = await ensureUserFolder(jsonFolderId, userId);
    const body = typeof jsonContent === 'string' ? Buffer.from(jsonContent, 'utf8') : Buffer.from(JSON.stringify(jsonContent), 'utf8');
    const { fileId } = await uploadFile(userFolderId, fileName, 'application/json', body);
    return { fileId };
}

/**
 * ดึงเนื้อหาไฟล์จาก Drive (สำหรับ JSON)
 */
async function getFileContent(fileId) {
    const drive = getDrive();
    const res = await drive.files.get(
        { fileId, alt: 'media', supportsAllDrives: true },
        { responseType: 'arraybuffer' }
    );
    return Buffer.from(res.data).toString('utf8');
}

/**
 * ลบไฟล์จาก Drive
 */
async function deleteFile(fileId) {
    if (!fileId) return;
    const drive = getDrive();
    await drive.files.delete({ fileId, supportsAllDrives: true });
}

function isDriveEnabled() {
    return process.env.USE_GOOGLE_DRIVE === 'true' || process.env.USE_GOOGLE_DRIVE === '1';
}

module.exports = {
    getDrive,
    ensureUserFolder,
    uploadFile,
    setFilePublic,
    getPublicViewUrl,
    uploadImage,
    uploadJson,
    getFileContent,
    getImageBuffer,
    deleteFile,
    isDriveEnabled,
    transformDriveUrl,
    transformDriveUrlsInString
};
