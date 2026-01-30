const express = require('express');
const router = express.Router();
const path = require('path');

/**
 * หน้า LIFF Share
 * รับ parameters: ?name={json_file_name}&id={index}
 */
router.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/share.html'));
});

module.exports = router;
