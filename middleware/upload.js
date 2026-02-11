const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');
require('dotenv').config();

// สร้างโฟลเดอร์ uploads/images ถ้ายังไม่มี
const uploadDir = process.env.UPLOAD_DIR || 'uploads/images';
const uploadDirAbs = path.isAbsolute(uploadDir) ? uploadDir : path.join(process.cwd(), uploadDir);
fs.ensureDirSync(uploadDirAbs);

/**
 * โฟลเดอร์อัปโหลดของลูกค้า: uploads/images/{user_id}/ — ต้องรันหลัง auth เพื่อให้มี req.user.id
 */
function getCustomerUploadDir(req) {
    const uid = req.user && req.user.id != null ? String(req.user.id) : '0';
    const dir = path.join(uploadDirAbs, uid);
    fs.ensureDirSync(dir);
    return dir;
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, getCustomerUploadDir(req));
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        let ext = (path.extname(file.originalname) || '').toLowerCase().replace(/[^a-z0-9.]/g, '');
        // iPhone/แอปบางตัวส่ง MIME เป็น image/heic หรือ image/x-heic แต่ชื่อไฟล์ไม่มี .heic — บังคับนามสกุลให้ตรงกับเนื้อหา
        const mimeHeic = file.mimetype === 'image/heic' || file.mimetype === 'image/heif' || file.mimetype === 'image/x-heic';
        if (mimeHeic && ext !== '.heic' && ext !== '.heif') ext = '.heic';
        if (!ext) ext = '.jpg';
        const safeExt = ext.startsWith('.') ? ext : '.' + ext;
        cb(null, `img-${uniqueSuffix}${safeExt}`);
    }
});

// File filter (การ์ด + สลิป): รองรับทุกรูปแบบรูปภาพ — ตรวจจากนามสกุลหรือ MIME (กรณีไม่มีนามสกุล/แพลตฟอร์มต่างกัน)
const DEFAULT_IMAGE_EXT = 'jpg,jpeg,png,gif,webp,heic,heif,bmp,tiff,tif,ico,avif,dng';
const MIME_TO_EXT = {
    'image/jpeg': 'jpeg', 'image/png': 'png', 'image/gif': 'gif', 'image/webp': 'webp',
    'image/heic': 'heic', 'image/heif': 'heif', 'image/x-heic': 'heic', 'image/avif': 'avif',
    'image/tiff': 'tiff', 'image/bmp': 'bmp', 'image/x-icon': 'ico', 'image/vnd.microsoft.icon': 'ico',
    'image/x-adobe-dng': 'dng', 'image/dng': 'dng'
};
const fileFilter = (req, file, cb) => {
    const envTypes = (process.env.ALLOWED_FILE_TYPES || '').trim();
    const allowedTypes = (envTypes || DEFAULT_IMAGE_EXT).split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    const ext = (path.extname(file.originalname) || '').toLowerCase().replace('.', '');
    const mimeExt = file.mimetype && MIME_TO_EXT[file.mimetype];
    const allowedByExt = allowedTypes.length === 0 || (ext && allowedTypes.includes(ext));
    const allowedByMime = mimeExt && allowedTypes.includes(mimeExt);
    const anyImageMime = typeof file.mimetype === 'string' && file.mimetype.toLowerCase().startsWith('image/');
    if (allowedByExt || allowedByMime || anyImageMime) {
        cb(null, true);
    } else {
        cb(new Error(`ประเภทไฟล์ไม่รองรับ อนุญาตเฉพาะ: ${allowedTypes.join(', ')} หรือรูปภาพ (image/*)`), false);
    }
};

// ขนาดไฟล์สูงสุด default 1GB
const MAX_FILE_SIZE_DEFAULT = 1073741824; // 1GB

// Configure multer
const upload = multer({
    storage: storage,
    limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE, 10) || MAX_FILE_SIZE_DEFAULT
    },
    fileFilter: fileFilter
});

// Middleware สำหรับอัพโหลดรูปภาพเดียว
const uploadSingle = upload.single('image');

// Middleware สำหรับอัพโหลดรูปภาพหลายไฟล์ (2 ไฟล์: image1 และ image2)
const uploadMultiple = upload.fields([
    { name: 'image1', maxCount: 1 },
    { name: 'image2', maxCount: 1 }
]);

// อัพโหลดสลิปการโอน (ช่องทาง QR)
const uploadSlip = upload.single('slip');

// -----------------------------------------------------------------------------
// CMS: อัปโหลดรูปตั้งค่า (โลโก้, พื้นหลัง) และรูป QR แยกโฟลเดอร์
// uploads/cms/settings = โลโก้ + พื้นหลังหน้า Login
// uploads/cms/qr = รูป QR การชำระเงิน
// รองรับ: jpg, jpeg, png, gif, webp, heic, heif (iPhone)
// -----------------------------------------------------------------------------
const cmsSettingsDir = path.join(process.cwd(), 'uploads/cms/settings');
const cmsQrDir = path.join(process.cwd(), 'uploads/cms/qr');
fs.ensureDirSync(cmsSettingsDir);
fs.ensureDirSync(cmsQrDir);

const cmsAllowedExt = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif', 'bmp', 'tiff', 'tif', 'ico', 'avif', 'dng'];
const cmsFileFilter = (req, file, cb) => {
    const ext = (path.extname(file.originalname) || '').toLowerCase().replace(/^\./, '');
    if (cmsAllowedExt.includes(ext)) {
        cb(null, true);
    } else {
        cb(new Error(`ประเภทไฟล์ไม่รองรับ อนุญาต: ${cmsAllowedExt.join(', ')}`), false);
    }
};

const cmsSettingsStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, cmsSettingsDir),
    filename: (req, file, cb) => {
        let ext = (path.extname(file.originalname) || '').toLowerCase().replace(/[^a-z0-9.]/g, '');
        if ((file.mimetype === 'image/heic' || file.mimetype === 'image/heif') && ext !== '.heic' && ext !== '.heif') ext = '.heic';
        if (!ext) ext = '.jpg';
        const safeExt = ext.startsWith('.') ? ext : '.' + ext;
        cb(null, `cms-${Date.now()}-${Math.round(Math.random() * 1E9)}${safeExt}`);
    }
});

const cmsQrStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, cmsQrDir),
    filename: (req, file, cb) => {
        let ext = (path.extname(file.originalname) || '').toLowerCase().replace(/[^a-z0-9.]/g, '');
        if ((file.mimetype === 'image/heic' || file.mimetype === 'image/heif') && ext !== '.heic' && ext !== '.heif') ext = '.heic';
        if (!ext) ext = '.jpg';
        const safeExt = ext.startsWith('.') ? ext : '.' + ext;
        cb(null, `qr-${Date.now()}-${Math.round(Math.random() * 1E9)}${safeExt}`);
    }
});

const uploadCmsSettings = multer({
    storage: cmsSettingsStorage,
    limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE, 10) || MAX_FILE_SIZE_DEFAULT },
    fileFilter: cmsFileFilter
}).single('file');

const uploadCmsQr = multer({
    storage: cmsQrStorage,
    limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE, 10) || MAX_FILE_SIZE_DEFAULT },
    fileFilter: cmsFileFilter
}).single('file');

// Error handler middleware
const handleUploadError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        console.error('[upload] MulterError:', err.code, err.message, req.path || req.url);
        if (err.code === 'LIMIT_FILE_SIZE') {
            const maxBytes = parseInt(process.env.MAX_FILE_SIZE, 10) || MAX_FILE_SIZE_DEFAULT;
            const maxMB = Math.round(maxBytes / 1024 / 1024);
            const maxLabel = maxMB >= 1024 ? `${(maxMB / 1024).toFixed(1)}GB` : `${maxMB}MB`;
            return res.status(400).json({
                success: false,
                message: `ไฟล์ใหญ่เกินไป อนุญาตสูงสุด ${maxLabel}`
            });
        }
        return res.status(400).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการอัพโหลดไฟล์: ' + err.message
        });
    }
    if (err) {
        console.error('[upload] Error:', err.message || err, req.path || req.url);
        return res.status(400).json({
            success: false,
            message: err.message
        });
    }
    next();
};

module.exports = {
    uploadSingle,
    uploadMultiple,
    uploadSlip,
    uploadCmsSettings,
    uploadCmsQr,
    handleUploadError,
    getCustomerUploadDir
};
