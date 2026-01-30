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
        // สร้าง unique filename: timestamp-random-originalname
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        const name = path.basename(file.originalname, ext);
        cb(null, `${name}-${uniqueSuffix}${ext}`);
    }
});

// File filter
const fileFilter = (req, file, cb) => {
    const allowedTypes = (process.env.ALLOWED_FILE_TYPES || 'jpg,jpeg,png,gif').split(',');
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
    handleUploadError
};
