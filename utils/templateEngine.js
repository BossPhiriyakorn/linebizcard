/**
 * Template Engine สำหรับแทนที่ placeholders ใน Flex Message Template
 */

/**
 * Escape string สำหรับใช้ใน JSON
 * @param {string} str - String ที่ต้องการ escape
 * @returns {string} Escaped string
 */
function escapeJsonString(str) {
    if (!str) return '';
    return String(str)
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')
        .replace(/\t/g, '\\t');
}

/**
 * แทนที่ placeholders ใน template JSON
 * @param {Object} template - Template object
 * @param {Object} data - Data object { name, phone, email, image_url, description, description2 }
 * @returns {Object} Template ที่แทนที่ข้อมูลแล้ว
 */
function replaceTemplatePlaceholders(template, data) {
    try {
        if (!data || typeof data !== 'object') data = {};
        
        // กำหนดค่า image URLs อย่างปลอดภัย (ป้องกัน undefined)
        const imageUrl1 = (data && data.image_url1) || (data && data.image_url) || '';
        const imageUrl2 = (data && data.image_url2) || (data && data.image_url1) || (data && data.image_url) || '';
        
        // ตรวจสอบว่า template เป็น object
        if (!template || typeof template !== 'object') {
            throw new Error('Template ต้องเป็น object');
        }

        // Convert template to JSON string
        let jsonString = JSON.stringify(template);
        
        // ตรวจสอบว่า jsonString เป็น string
        if (typeof jsonString !== 'string') {
            throw new Error('ไม่สามารถแปลง template เป็น JSON string ได้');
        }

        // รายละเอียดว่างให้ใส่ non-breaking space หนึ่งตัว — Flex ไม่ว่าง LINE รับได้ แชร์ได้ แต่การ์ดไม่แสดงตัวอักษร
        const descRaw = (data && data.description != null) ? String(data.description) : '';
        const desc2Raw = (data && data.description2 != null) ? String(data.description2) : (data && data.description != null) ? String(data.description) : '';
        const EMPTY_PLACEHOLDER = '\u00A0';
        const descVal = descRaw.trim() !== '' ? descRaw.trim() : EMPTY_PLACEHOLDER;
        const desc2Val = desc2Raw.trim() !== '' ? desc2Raw.trim() : EMPTY_PLACEHOLDER;

        // Replace placeholders (ต้อง replace description2 และ user_image2 ก่อน เพื่อไม่ให้ถูก replace ด้วย description และ user_image)
        // และ replace imageUrl ในรูปแบบต่างๆ ที่อาจมีใน template
        jsonString = jsonString.replace(/{name}/g, escapeJsonString((data && data.name) || ''));
        jsonString = jsonString.replace(/{phone}/g, escapeJsonString((data && data.phone) || ''));
        jsonString = jsonString.replace(/{email}/g, escapeJsonString((data && data.email) || ''));
        jsonString = jsonString.replace(/{Tel}/g, escapeJsonString((data && data.phone) || ''));
        jsonString = jsonString.replace(/{Email}/g, escapeJsonString((data && data.email) || ''));
        jsonString = jsonString.replace(/{user_image2}/g, escapeJsonString(imageUrl2));
        jsonString = jsonString.replace(/{user_image1}/g, escapeJsonString(imageUrl1));
        jsonString = jsonString.replace(/{user_image}/g, escapeJsonString(imageUrl1));
        jsonString = jsonString.replace(/{imageUrl}/g, escapeJsonString(imageUrl1));
        jsonString = jsonString.replace(/{image_url}/g, escapeJsonString(imageUrl1));
        jsonString = jsonString.replace(/{image_url1}/g, escapeJsonString(imageUrl1));
        jsonString = jsonString.replace(/{image_url2}/g, escapeJsonString(imageUrl2));
        jsonString = jsonString.replace(/{description2}/g, escapeJsonString(desc2Val));
        jsonString = jsonString.replace(/{description}/g, escapeJsonString(descVal));
        jsonString = jsonString.replace(/{liff_url}/g, escapeJsonString((data && data.liff_url) || ''));
        
        // Parse back to object
        let parsed;
        try {
            parsed = JSON.parse(jsonString);
        } catch (parseError) {
            console.error('JSON parse error after replacement:', parseError.message);
            console.error('JSON string (first 500 chars):', jsonString.substring(0, 500));
            throw new Error('ไม่สามารถ parse JSON หลัง replace placeholders ได้: ' + parseError.message);
        }
        
        return parsed;
    } catch (error) {
        console.error('Error replacing template placeholders:', error);
        console.error('Error stack:', error.stack);
        throw new Error('ไม่สามารถประมวลผล template ได้: ' + error.message);
    }
}

/**
 * สร้าง JSON structure สำหรับ Flex Message
 * @param {Object} flexMessage - Flex Message object
 * @param {string} altText - Alt text สำหรับ Flex Message
 * @returns {Object} JSON structure { tectony1: [{ linemsg: "..." }, { flex_message }] }
 */
function createFlexMessageJson(flexMessage, altText = 'Flex Message') {
    return {
        tectony1: [
            {
                linemsg: altText
            },
            flexMessage
        ]
    };
}

module.exports = {
    replaceTemplatePlaceholders,
    createFlexMessageJson,
    escapeJsonString
};
