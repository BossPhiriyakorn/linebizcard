const path = require('path');
const fs = require('fs-extra');
const sharp = require('sharp');
const { getCustomerUploadDir } = require('../middleware/upload');

const uploadDir = process.env.UPLOAD_DIR || 'uploads/images';

/**
 * แปลง HEIC/HEIF เป็น buffer JPEG (สำหรับ iPhone) — ใช้ heic-convert ถ้ามี
 */
async function heicToJpegBuffer(absolutePath) {
    try {
        const heicConvert = require('heic-convert');
        const inputBuffer = await fs.readFile(absolutePath);
        const outputBuffer = await heicConvert({ buffer: inputBuffer, format: 'JPEG' });
        return outputBuffer;
    } catch (e) {
        throw new Error('ไม่สามารถแปลงไฟล์ HEIC/HEIF ได้: ' + (e.message || 'กรุณาบันทึกรูปเป็นรูปแบบ Most Compatible (JPEG)'));
    }
}

/**
 * แปลงไฟล์รูปที่อัปโหลดเป็น WebP (ไม่ปรับขนาด) แล้วลบไฟล์เดิม
 * รองรับ: jpg, jpeg, png, gif, webp, heic, heif (iPhone)
 * @param {string} inputPath - path เต็มไปยังไฟล์รูป (หรือ path สัมพันธ์จาก project root)
 * @returns {Promise<string>} ชื่อไฟล์ผลลัพธ์ (เช่น img-123.webp) สำหรับใช้ใน URL
 */
async function convertToWebp(inputPath) {
    const absolutePath = path.isAbsolute(inputPath) ? inputPath : path.join(process.cwd(), inputPath);
    const exists = await fs.pathExists(absolutePath);
    if (!exists) {
        throw new Error('ไม่พบไฟล์รูป: ' + absolutePath);
    }
    const ext = path.extname(absolutePath).toLowerCase();
    const dir = path.dirname(absolutePath);
    const base = path.basename(absolutePath, ext);
    const outputFilename = `${base}.webp`;
    const outputPath = path.join(dir, outputFilename);

    if (ext === '.webp') {
        return path.basename(absolutePath);
    }

    const isHeic = ext === '.heic' || ext === '.heif';
    if (isHeic) {
        const jpegBuffer = await heicToJpegBuffer(absolutePath);
        await sharp(jpegBuffer)
            .webp({ quality: 85 })
            .toFile(outputPath);
    } else {
        await sharp(absolutePath)
            .webp({ quality: 85 })
            .toFile(outputPath);
    }

    await fs.remove(absolutePath);
    return outputFilename;
}

/**
 * แปลงรูปที่อยู่ใน req.file หรือ req.files เป็น WebP แล้วอัปเดต filename ใน req
 * รองรับโฟลเดอร์แยกตาม user id (uploads/images/{user_id}/)
 * @param {object} req - Express request (ต้องมี req.file หรือ req.files หลัง multer, และ req.user ถ้าเป็นลูกค้า)
 */
async function convertUploadedToWebp(req) {
    const baseDir = req.user && req.user.id != null ? getCustomerUploadDir(req) : (path.isAbsolute(uploadDir) ? uploadDir : path.join(process.cwd(), uploadDir));

    if (req.file) {
        const inputPath = path.join(baseDir, req.file.filename);
        req.file.filename = await convertToWebp(inputPath);
        return;
    }

    if (req.files) {
        const fields = ['image1', 'image2', 'image'];
        for (const field of fields) {
            const files = req.files[field];
            if (Array.isArray(files) && files.length > 0 && files[0].filename) {
                const inputPath = path.join(baseDir, files[0].filename);
                files[0].filename = await convertToWebp(inputPath);
            }
        }
    }
}

module.exports = {
    convertToWebp,
    convertUploadedToWebp
};
