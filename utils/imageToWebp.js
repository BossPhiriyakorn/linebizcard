const path = require('path');
const fs = require('fs-extra');
const sharp = require('sharp');
const { getCustomerUploadDir } = require('../middleware/upload');

const uploadDir = process.env.UPLOAD_DIR || 'uploads/images';

// ขนาดสูงสุดของรูป (กว้าง x สูง) — รีไซส์ให้อยู่ภายในถ้าเกิน (เช่น จำกัดของ LINE Flex)
const MAX_IMAGE_WIDTH = parseInt(process.env.MAX_IMAGE_WIDTH, 10) || 2047;
const MAX_IMAGE_HEIGHT = parseInt(process.env.MAX_IMAGE_HEIGHT, 10) || 2048;

/** ตรวจจาก magic bytes ว่าไฟล์เป็น HEIC/HEIF หรือไม่ (รองรับรูปจาก iPhone ที่ส่งเป็น .jpg แต่เนื้อหาเป็น HEIC) */
async function isHeicByMagicBytes(absolutePath) {
    try {
        const buf = await fs.readFile(absolutePath, { start: 0, end: 15 });
        if (buf.length < 12) return false;
        const ftyp = buf.toString('ascii', 4, 8);
        if (ftyp !== 'ftyp') return false;
        const brand = buf.toString('ascii', 8, 12);
        return ['heic', 'heix', 'hevc', 'mif1', 'msf1'].includes(brand);
    } catch {
        return false;
    }
}

/**
 * แปลง input (path หรือ buffer) เป็น WebP และเขียนไฟล์ — ถ้าขนาดเกิน MAX_IMAGE_WIDTH/MAX_IMAGE_HEIGHT จะรีไซส์ให้อยู่ภายใน (รักษาอัตราส่วน)
 */
async function toWebpWithResize(input, outputPath) {
    let pipeline = sharp(input);
    const meta = await pipeline.metadata();
    const w = meta.width || 0;
    const h = meta.height || 0;
    if (w > MAX_IMAGE_WIDTH || h > MAX_IMAGE_HEIGHT) {
        pipeline = pipeline.resize(MAX_IMAGE_WIDTH, MAX_IMAGE_HEIGHT, { fit: 'inside' });
    }
    await pipeline.webp({ quality: 85 }).toFile(outputPath);
}

/**
 * แปลง HEIC/HEIF เป็น buffer JPEG (สำหรับ iPhone) — ใช้ heic-convert ถ้ามี
 */
async function heicToJpegBuffer(absolutePath) {
    let heicConvert;
    try {
        heicConvert = require('heic-convert');
    } catch (e) {
        throw new Error('ระบบยังไม่รองรับรูปจาก iPhone (HEIC) บนเซิร์ฟเวอร์นี้ กรุณาบันทึกรูปเป็นรูปแบบ Most Compatible (JPEG) ใน iPhone: ตั้งค่า > กล้อง > รูปแบบ > Most Compatible');
    }
    try {
        const inputBuffer = await fs.readFile(absolutePath);
        const outputBuffer = await heicConvert({ buffer: inputBuffer, format: 'JPEG' });
        return outputBuffer;
    } catch (e) {
        const msg = (e && e.message) ? e.message : String(e);
        throw new Error('ไม่สามารถแปลงรูปจาก iPhone (HEIC) ได้: ' + msg + ' — ลองบันทึกรูปเป็นรูปแบบ Most Compatible (JPEG) ใน iPhone');
    }
}

// รองรับทุกรูปแบบด้านล่าง (อัปโหลด + แปลง): Sharp โดยตรง = jpeg, png, gif, webp, avif, tiff. HEIC/HEIF = ใช้ heic-convert (รวม .jpg ที่เนื้อหาเป็น HEIC จาก iPhone). BMP/ICO รับอัปโหลดได้แต่ไม่แปลง
const SUPPORTED_CONVERT_EXT = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif', '.tiff', '.tif', '.heic', '.heif'];
const UNSUPPORTED_CONVERT_EXT = ['.bmp', '.ico'];

/**
 * แปลงไฟล์รูปที่อัปโหลดเป็น WebP (ถ้าขนาดเกินกว้าง 2047 หรือสูง 2048 จะรีไซส์ให้อยู่ภายใน) แล้วลบไฟล์เดิม
 * รองรับ: JPEG, PNG, GIF, WebP, AVIF, TIFF, HEIC/HEIF (iPhone). BMP/ICO รับอัปโหลดได้แต่ไม่รองรับการแปลงเป็น WebP
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

    console.log('[imageToWebp] convert start ext=' + ext + ' file=' + path.basename(absolutePath));

    if (ext === '.webp') {
        return path.basename(absolutePath);
    }

    if (UNSUPPORTED_CONVERT_EXT.includes(ext)) {
        throw new Error(
            `รูปแบบไฟล์ ${ext} ไม่รองรับการแปลงเป็น WebP กรุณาแปลงเป็น JPEG หรือ PNG ก่อนอัปโหลด (รองรับการแปลง: ${SUPPORTED_CONVERT_EXT.join(', ')})`
        );
    }

    const isHeicExt = ext === '.heic' || ext === '.heif';
    if (isHeicExt) {
        console.log('[imageToWebp] HEIC/HEIF path, using heic-convert');
        const jpegBuffer = await heicToJpegBuffer(absolutePath);
        await toWebpWithResize(jpegBuffer, outputPath);
    } else if (ext === '.jpg' || ext === '.jpeg') {
        // รูปจาก iPhone/แอปบางตัวส่งเป็น .jpg แต่เนื้อหาเป็น HEIC — ตรวจจาก magic bytes ก่อน แล้ว fallback ทุกครั้งที่ Sharp ล้มเหลว
        const maybeHeic = await isHeicByMagicBytes(absolutePath);
        if (maybeHeic) {
            console.log('[imageToWebp] .jpg detected as HEIC by magic bytes, using heic-convert');
            try {
                const jpegBuffer = await heicToJpegBuffer(absolutePath);
                await toWebpWithResize(jpegBuffer, outputPath);
            } catch (heicErr) {
                const msg = (heicErr && heicErr.message) ? heicErr.message : '';
                throw new Error('รูปภาพเป็นรูปแบบ HEIC (iPhone) แต่ระบบแปลงไม่ได้: ' + msg + ' — ลองตั้งค่า iPhone: กล้อง > รูปแบบ > Most Compatible');
            }
        } else {
            try {
                await toWebpWithResize(absolutePath, outputPath);
            } catch (sharpErr) {
                try {
                    const jpegBuffer = await heicToJpegBuffer(absolutePath);
                    await toWebpWithResize(jpegBuffer, outputPath);
                } catch (heicErr) {
                    const supportedList = 'JPEG, PNG, GIF, WebP, AVIF, TIFF, HEIC/HEIF (iPhone)';
                    throw new Error(
                        ((sharpErr && sharpErr.message) ? sharpErr.message : 'รูปแบบรูปไม่รองรับ') +
                        ' — รองรับ: ' + supportedList + '. ถ้าเป็นรูปจาก iPhone ลองตั้งค่า กล้อง > รูปแบบ > Most Compatible'
                    );
                }
            }
        }
    } else {
        try {
            await toWebpWithResize(absolutePath, outputPath);
        } catch (sharpErr) {
            // นามสกุลอื่น (png, webp, ...) — ถ้า Sharp ล้มเหลว อาจเป็นไฟล์เสียหรือรูปแบบพิเศษ ลอง HEIC เป็นทางเลือกสุดท้าย
            try {
                const jpegBuffer = await heicToJpegBuffer(absolutePath);
                await toWebpWithResize(jpegBuffer, outputPath);
            } catch (heicErr) {
                const supportedList = 'JPEG, PNG, GIF, WebP, AVIF, TIFF, HEIC/HEIF (iPhone)';
                throw new Error(
                    ((sharpErr && sharpErr.message) ? sharpErr.message : 'รูปแบบรูปไม่รองรับ') +
                    ' — รองรับการแปลงเป็น WebP: ' + supportedList
                );
            }
        }
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
    console.log('[imageToWebp] convertUploadedToWebp start user_id=' + (req.user && req.user.id));

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
