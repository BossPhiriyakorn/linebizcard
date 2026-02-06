const pool = require('../config/database');

/**
 * ดึง Templates ทั้งหมด
 * แหล่งที่มา: ตาราง templates ใน DB (name, description, preview_image แสดงในรายการ)
 * โครงสร้างการ์ดจริงมาจาก template_json ของแต่ละแถว = JSON จาก Flex Simulator ที่ใส่ผ่าน add-custom-template หรือ setup-database
 */
async function getAllTemplates(req, res) {
    try {
        const result = await pool.query(
            `SELECT id, name, description, preview_image, sample_image_urls, created_at FROM templates 
             WHERE COALESCE(is_active, true) = true ORDER BY id ASC`
        );

        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        console.error('Get templates error:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการดึงข้อมูล templates'
        });
    }
}

/**
 * ดึง Template เดียว
 */
async function getTemplateById(req, res) {
    try {
        const { id } = req.params;

        const result = await pool.query(
            'SELECT * FROM templates WHERE id = $1 AND COALESCE(is_active, true) = true',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'ไม่พบ template'
            });
        }

        res.json({
            success: true,
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Get template error:', error);
        res.status(500).json({
            success: false,
            message: 'เกิดข้อผิดพลาดในการดึงข้อมูล template'
        });
    }
}

module.exports = {
    getAllTemplates,
    getTemplateById
};
