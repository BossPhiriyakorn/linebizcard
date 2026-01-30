const { v4: uuidv4 } = require('uuid');

/**
 * สร้าง Unique ID สำหรับ Card
 * @returns {string} Unique ID (format: card_xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
 */
function generateUniqueId() {
    const uuid = uuidv4();
    return `card_${uuid}`;
}

/**
 * สร้าง JSON file name จาก unique ID
 * @param {string} uniqueId - Unique ID
 * @returns {string} JSON file name
 */
function getJsonFileName(uniqueId) {
    return `${uniqueId}.json`;
}

module.exports = {
    generateUniqueId,
    getJsonFileName
};
