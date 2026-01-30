/**
 * เพิ่ม Template "TII Card" ลงฐานข้อมูล
 * - ตรวจสอบว่า placeholder ใน template ตรงกับฟอร์ม (name, phone, email, description, รูปภาพ, liff_url)
 * - ถ้าตรงกัน จึงเพิ่ม template ลง DB และจะแสดงในหน้าเลือก
 * วิธีใช้: node scripts/add-tii-card-template.js
 */

require('dotenv').config();
const pool = require('../config/database');

// Placeholders ที่ฟอร์ม create.html รองรับ (ที่ controller ส่งเข้า templateEngine)
const ALLOWED_PLACEHOLDERS = [
    'name', 'phone', 'email', 'Tel', 'Email',
    'description', 'description2',
    'image_url', 'image_url1', 'image_url2',
    'user_image', 'user_image1', 'user_image2',
    'liff_url'
];

function extractPlaceholders(jsonString) {
    const set = new Set();
    const re = /\{(\w+)\}/g;
    let m;
    while ((m = re.exec(jsonString)) !== null) set.add(m[1]);
    return [...set];
}

function validateTemplatePlaceholders(templateObj) {
    const jsonStr = JSON.stringify(templateObj);
    const found = extractPlaceholders(jsonStr);
    const invalid = found.filter(p => !ALLOWED_PLACEHOLDERS.includes(p));
    if (invalid.length > 0) {
        throw new Error(
            'Placeholder ใน template ไม่ตรงกับฟอร์ม (ฟอร์มมี: name, phone, email, description, รูปภาพ). ไม่รู้จัก: ' + invalid.join(', ')
        );
    }
    return found;
}

const TII_CARD_TEMPLATE = {
    tectony1: [
        { linemsg: 'การ์ดของ {name}' },
        {
            type: 'carousel',
            contents: [
                {
                    type: 'bubble',
                    hero: {
                        type: 'image',
                        url: '{image_url1}',
                        aspectMode: 'cover',
                        size: 'full'
                    },
                    body: {
                        type: 'box',
                        layout: 'vertical',
                        contents: [
                            {
                                type: 'box',
                                layout: 'vertical',
                                contents: [
                                    { type: 'text', text: '{name}', align: 'center', wrap: true, size: 'lg' }
                                ]
                            },
                            { type: 'separator', margin: 'md' },
                            {
                                type: 'box',
                                layout: 'horizontal',
                                contents: [
                                    { type: 'text', text: '📞', flex: 0 },
                                    { type: 'text', text: '{phone}', margin: 'xs', wrap: true }
                                ],
                                spacing: 'none',
                                margin: 'md'
                            },
                            {
                                type: 'box',
                                layout: 'horizontal',
                                contents: [
                                    { type: 'text', text: '📧', flex: 0 },
                                    { type: 'text', text: '{email}', margin: 'xs', wrap: true }
                                ],
                                margin: 'sm'
                            },
                            { type: 'separator', margin: 'md' },
                            {
                                type: 'box',
                                layout: 'horizontal',
                                contents: [
                                    { type: 'text', text: '💬', flex: 0 },
                                    { type: 'text', text: '{description}', wrap: true, margin: 'sm' }
                                ],
                                margin: 'md'
                            },
                            { type: 'separator', margin: 'md' }
                        ]
                    },
                    footer: {
                        type: 'box',
                        layout: 'vertical',
                        contents: [
                            {
                                type: 'box',
                                layout: 'horizontal',
                                contents: [
                                    {
                                        type: 'button',
                                        action: { type: 'uri', label: 'โทร.', uri: 'tel:{phone}' },
                                        style: 'primary',
                                        height: 'sm',
                                        color: '#2ECC71'
                                    },
                                    {
                                        type: 'button',
                                        action: { type: 'uri', label: 'ส่งเมล', uri: 'mailto:{email}' },
                                        style: 'primary',
                                        height: 'sm',
                                        color: '#F39C12'
                                    },
                                    {
                                        type: 'button',
                                        action: { type: 'uri', label: 'แชร์', uri: '{liff_url}' },
                                        style: 'primary',
                                        height: 'sm',
                                        color: '#3498DB'
                                    }
                                ],
                                spacing: 'sm'
                            }
                        ]
                    }
                },
                {
                    type: 'bubble',
                    hero: {
                        type: 'image',
                        url: 'https://www.innwhy.com/wp-content/uploads/2019/01/Tii-Ads-banner-01.png',
                        aspectMode: 'fit',
                        size: 'full'
                    },
                    body: {
                        type: 'box',
                        layout: 'vertical',
                        contents: []
                    },
                    styles: {
                        hero: { backgroundColor: '#14256B' },
                        body: { backgroundColor: '#14256B' },
                        footer: { backgroundColor: '#14256B' }
                    }
                }
            ]
        }
    ]
};

async function addTiiCardTemplate() {
    try {
        console.log('🔄 กำลังตรวจสอบและเพิ่ม Template "TII Card"...\n');

        const placeholdersUsed = validateTemplatePlaceholders(TII_CARD_TEMPLATE);
        console.log('✅ ตรวจสอบ Placeholder ตรงกับฟอร์มแล้ว: ' + placeholdersUsed.join(', '));

        const result = await pool.query(
            `INSERT INTO templates (name, description, template_json, preview_image)
             VALUES ($1, $2, $3, $4)
             RETURNING id, name, description`,
            [
                'TII Card',
                'Template TII Card (Carousel 2 การ์ด: ข้อมูลติดต่อ + แบนเนอร์)',
                JSON.stringify(TII_CARD_TEMPLATE),
                'https://www.innwhy.com/wp-content/uploads/2019/01/Tii-Ads-banner-01.png'
            ]
        );

        const row = result.rows[0];
        console.log('\n✅ เพิ่ม Template "TII Card" สำเร็จ!');
        console.log('   ID: ' + row.id);
        console.log('   Name: ' + row.name);
        console.log('   Description: ' + row.description);
        console.log('\n📋 Template จะแสดงในหน้าเลือก (create.html) ผ่าน API /api/templates');
    } catch (error) {
        if (error.code === '23505') {
            console.error('❌ Template name "TII Card" มีอยู่แล้ว ในฐานข้อมูล');
        } else {
            console.error('❌ เกิดข้อผิดพลาด:', error.message);
        }
        process.exit(1);
    } finally {
        await pool.end();
    }
}

addTiiCardTemplate();
