require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

async function addCustomTemplate() {
    try {
        console.log('🔄 กำลังเพิ่ม Custom Template...\n');

        // Template JSON ที่แปลงแล้ว (จาก Flex Simulator)
        const templateJson = {
            "tectony1": [
                {
                    "linemsg": "การ์ดข้อมูลติดต่อของ {name}"
                },
                {
                    "type": "carousel",
                    "contents": [
                        {
                            "type": "bubble",
                            "hero": {
                                "type": "image",
                                "url": "{user_image1}",
                                "size": "full",
                                "aspectMode": "cover"
                            },
                            "body": {
                                "type": "box",
                                "layout": "vertical",
                                "contents": [
                                    {
                                        "type": "text",
                                        "text": "{name}",
                                        "weight": "bold",
                                        "size": "xl",
                                        "color": "#1DB446"
                                    },
                                    {
                                        "type": "separator",
                                        "margin": "md"
                                    },
                                    {
                                        "type": "box",
                                        "layout": "horizontal",
                                        "margin": "md",
                                        "contents": [
                                            {
                                                "type": "text",
                                                "text": "Tel.",
                                                "size": "sm",
                                                "color": "#aaaaaa",
                                                "flex": 0
                                            },
                                            {
                                                "type": "text",
                                                "text": "{phone}",
                                                "size": "sm",
                                                "color": "#666666",
                                                "flex": 1,
                                                "wrap": true,
                                                "margin": "md"
                                            }
                                        ]
                                    },
                                    {
                                        "type": "box",
                                        "layout": "horizontal",
                                        "margin": "md",
                                        "contents": [
                                            {
                                                "type": "text",
                                                "text": "Email",
                                                "size": "sm",
                                                "color": "#aaaaaa",
                                                "flex": 0
                                            },
                                            {
                                                "type": "text",
                                                "text": "{email}",
                                                "size": "sm",
                                                "color": "#666666",
                                                "flex": 1,
                                                "wrap": true,
                                                "margin": "md"
                                            }
                                        ]
                                    },
                                    {
                                        "type": "separator",
                                        "margin": "md"
                                    },
                                    {
                                        "type": "text",
                                        "text": "รายละเอียด",
                                        "size": "sm",
                                        "color": "#1DB446",
                                        "weight": "bold",
                                        "margin": "md"
                                    },
                                    {
                                        "type": "text",
                                        "text": "{description}",
                                        "size": "sm",
                                        "color": "#666666",
                                        "margin": "sm",
                                        "wrap": true
                                    }
                                ]
                            },
                            "footer": {
                                "type": "box",
                                "layout": "vertical",
                                "contents": [
                                    {
                                        "type": "box",
                                        "layout": "horizontal",
                                        "contents": [
                                            {
                                                "type": "button",
                                                "style": "primary",
                                                "action": {
                                                    "type": "uri",
                                                    "label": "โทร",
                                                    "uri": "tel:{phone}"
                                                }
                                            },
                                            {
                                                "type": "button",
                                                "style": "secondary",
                                                "action": {
                                                    "type": "uri",
                                                    "label": "ส่งอีเมล",
                                                    "uri": "mailto:{email}"
                                                }
                                            }
                                        ]
                                    },
                                    {
                                        "type": "box",
                                        "layout": "horizontal",
                                        "contents": [
                                            {
                                                "type": "button",
                                                "style": "link",
                                                "action": {
                                                    "type": "uri",
                                                    "label": "แชร์",
                                                    "uri": "{liff_url}"
                                                }
                                            }
                                        ]
                                    }
                                ]
                            }
                        },
                        {
                            "type": "bubble",
                            "hero": {
                                "type": "image",
                                "url": "{user_image1}",
                                "size": "full",
                                "aspectMode": "cover"
                            },
                            "body": {
                                "type": "box",
                                "layout": "vertical",
                                "contents": [
                                    {
                                        "type": "text",
                                        "text": "{description2}",
                                        "weight": "bold",
                                        "size": "lg",
                                        "align": "center",
                                        "wrap": true,
                                        "color": "#333333"
                                    }
                                ]
                            }
                        }
                    ]
                }
            ]
        };

        // เพิ่ม template ลง database
        const result = await pool.query(
            `INSERT INTO templates (name, description, template_json, preview_image) 
            VALUES ($1, $2, $3, $4) 
            RETURNING id, name`,
            [
                'Contact Card',
                'Template สำหรับการ์ดข้อมูลติดต่อ (Carousel - 2 cards: ข้อมูลติดต่อ และ รายละเอียด)',
                JSON.stringify(templateJson),
                '/images/template-preview.jpg'
            ]
        );

        console.log('✅ เพิ่ม Template สำเร็จ!');
        console.log(`   ID: ${result.rows[0].id}`);
        console.log(`   Name: ${result.rows[0].name}`);
        console.log(`   Type: Carousel (2 bubbles)`);
        console.log('\n📋 โครงสร้าง Template:');
        console.log('   Card 1:');
        console.log('     ✓ รูปภาพ (Hero)');
        console.log('     ✓ ชื่อสกุล');
        console.log('     ✓ เบอร์โทร');
        console.log('     ✓ อีเมล');
        console.log('     ✓ รายละเอียด');
        console.log('     ✓ ปุ่มโทร, ส่งอีเมล และแชร์');
        console.log('   Card 2:');
        console.log('     ✓ รูปภาพ (Hero)');
        console.log('     ✓ รายละเอียด (แสดงเด่น)');

    } catch (error) {
        if (error.code === '23505') {
            console.error('❌ Template name ซ้ำกัน กรุณาลบ template เก่าก่อน');
        } else {
            console.error('❌ เกิดข้อผิดพลาด:', error.message);
        }
        process.exit(1);
    } finally {
        await pool.end();
    }
}

addCustomTemplate();
