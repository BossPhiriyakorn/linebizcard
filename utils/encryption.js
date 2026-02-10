/**
 * ยูทิลิตี้เข้ารหัส/แฮช สำหรับ PII และ OTP
 * - SHA-256: ใช้แฮช OTP (หนึ่งทาง ไม่ถอดกลับ)
 * - AES-256-GCM: ใช้เข้ารหัสข้อมูลที่ต้องอ่านกลับได้ (เบอร์โทร อีเมล บัญชีธนาคาร ฯลฯ)
 */
require('dotenv').config();
const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 16;

/**
 * แฮชด้วย SHA-256 (ใช้กับ OTP — เก็บแฮชใน DB แทน plaintext)
 * @param {string} text - ข้อความที่จะแฮช (เช่น รหัส OTP)
 * @param {string} [pepper] - ค่า pepper จาก env (OTP_PEPPER) เพื่อให้แฮชต่างกันในแต่ละระบบ
 * @returns {string} hex string ความยาว 64 ตัวอักษร
 */
function hashSha256(text, pepper) {
    const p = pepper || process.env.OTP_PEPPER || '';
    return crypto.createHash('sha256').update(String(text) + p, 'utf8').digest('hex');
}

/**
 * เข้ารหัสข้อความด้วย AES-256-GCM
 * @param {string} text - ข้อความต้นฉบับ (ถ้า null/undefined คืนค่า null)
 * @returns {string|null} base64 ของ iv + ciphertext + authTag หรือ null
 */
function encrypt(text) {
    if (text === null || text === undefined || text === '') return text;
    const key = getEncryptionKey();
    if (!key) return text; // ไม่มี key ให้เก็บแบบเดิม (backward compat)
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
    const enc = Buffer.concat([cipher.update(String(text), 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, enc, tag]).toString('base64');
}

/**
 * ถอดรหัสข้อความที่เข้ารหัสด้วย encrypt()
 * @param {string} encrypted - base64 จาก encrypt()
 * @returns {string|null} ข้อความต้นฉบับ หรือ null ถ้าถอดไม่ได้
 */
function decrypt(encrypted) {
    if (encrypted === null || encrypted === undefined || encrypted === '') return encrypted;
    const key = getEncryptionKey();
    if (!key) return encrypted;
    try {
        const buf = Buffer.from(encrypted, 'base64');
        if (buf.length < IV_LENGTH + AUTH_TAG_LENGTH) return encrypted;
        const iv = buf.subarray(0, IV_LENGTH);
        const tag = buf.subarray(buf.length - AUTH_TAG_LENGTH);
        const ciphertext = buf.subarray(IV_LENGTH, buf.length - AUTH_TAG_LENGTH);
        const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
        decipher.setAuthTag(tag);
        return decipher.update(ciphertext, undefined, 'utf8') + decipher.final('utf8');
    } catch (e) {
        // ค่าที่เก็บอาจเป็น plaintext เก่า (ก่อนเปิดใช้ encryption)
        return encrypted;
    }
}

function getEncryptionKey() {
    const raw = process.env.ENCRYPTION_KEY;
    if (!raw || typeof raw !== 'string') return null;
    const trimmed = raw.trim();
    if (trimmed.length >= 64 && /^[0-9a-fA-F]+$/.test(trimmed)) {
        return Buffer.from(trimmed.slice(0, 64), 'hex');
    }
    return crypto.createHash('sha256').update(trimmed, 'utf8').digest();
}

/**
 * ถอดรหัสถ้าเป็นค่าที่เข้ารหัสไว้ ไม่ใช่ก็คืนค่าตามเดิม (รองรับข้อมูลเก่า plaintext)
 */
function decryptIfEncrypted(value) {
    if (value === null || value === undefined || value === '') return value;
    const key = getEncryptionKey();
    if (!key) return value;
    try {
        const buf = Buffer.from(value, 'base64');
        if (buf.length >= IV_LENGTH + AUTH_TAG_LENGTH && Buffer.isBuffer(buf)) {
            const dec = decrypt(value);
            if (dec !== value) return dec;
        }
    } catch (_) {}
    return value;
}

module.exports = {
    hashSha256,
    encrypt,
    decrypt,
    decryptIfEncrypted
};
