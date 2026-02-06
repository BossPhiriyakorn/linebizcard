const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');
require('dotenv').config();

// สร้างโฟลเดอร์ uploads/images ถ้ายังไม่มี
const uploadDir = process.env.UPLOAD_DIR || 'uploads/images';
fs.ensureDirSync(uploadDir);

// Configure storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // ใช้ชื่อไฟล์เฉพาะ ASCII เพื่อให้ URL ใน Flex Message ใช้ได้กับ LINE (ป้องกัน 404 / การแชร์ไม่เห็นการ์ด)
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = (path.extname(file.originalname) || '').toLowerCase().replace(/[^a-z0-9.]/g, '') || '.jpg';
        const safeExt = ext.startsWith('.') ? ext : '.' + ext;
        cb(null, `img-${uniqueSuffix}${safeExt}`);
    }
});

// File filter (การ์ด + สลิป): รองรับ jpg, png, gif, webp, heic, heif รวมรูปจาก iPhone
const fileFilter = (req, file, cb) => {
    const allowedTypes = (process.env.ALLOWED_FILE_TYPES || 'jpg,jpeg,png,gif,webp,heic,heif').split(',').map(s => s.trim());
    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
    
    if (allowedTypes.includes(ext)) {
        cb(null, true);
    } else {
        cb(new Error(`ประเภทไฟล์ไม่รองรับ อนุญาตเฉพาะ: ${allowedTypes.join(', ')}`), false);
    }
};

// Configure multer
const upload = multer({
    storage: storage,
    limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5242880 // 5MB default
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

const cmsAllowedExt = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif'];
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
        const ext = (path.extname(file.originalname) || '').toLowerCase().replace(/[^a-z0-9.]/g, '') || '.jpg';
        const safeExt = ext.startsWith('.') ? ext : '.' + ext;
        cb(null, `cms-${Date.now()}-${Math.round(Math.random() * 1E9)}${safeExt}`);
    }
});

const cmsQrStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, cmsQrDir),
    filename: (req, file, cb) => {
        const ext = (path.extname(file.originalname) || '').toLowerCase().replace(/[^a-z0-9.]/g, '') || '.jpg';
        const safeExt = ext.startsWith('.') ? ext : '.' + ext;
        cb(null, `qr-${Date.now()}-${Math.round(Math.random() * 1E9)}${safeExt}`);
    }
});

const uploadCmsSettings = multer({
    storage: cmsSettingsStorage,
    limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5242880 },
    fileFilter: cmsFileFilter
}).single('file');

const uploadCmsQr = multer({
    storage: cmsQrStorage,
    limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 5242880 },
    fileFilter: cmsFileFilter
}).single('file');

// Error handler middleware
const handleUploadError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                message: `ไฟล์ใหญ่เกินไป อนุญาตสูงสุด ${process.env.MAX_FILE_SIZE / 1024 / 1024}MB`
            });
        }
        return res.status(400).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการอัพโหลดไฟล์: ' + err.message
        });
    }
    if (err) {
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
    handleUploadError
};
