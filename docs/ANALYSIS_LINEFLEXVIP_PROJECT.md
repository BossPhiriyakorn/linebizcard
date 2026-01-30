# การวิเคราะห์โปรเจกต์ Line_Flex_UPdate (lineflexvip.tectony.co.th)

## 1. โครงสร้างโปรเจกต์

| รายการ | โปรเจกต์ Line_Flex_UPdate | โปรเจกต์ของเรา (line_flex_tem) |
|--------|---------------------------|----------------------------------|
| **Stack** | PHP + Static HTML | Node.js + Express |
| **LIFF Entry** | `index.html` (root) | `share.html` (route `/` เมื่อมี query `name`) |
| **Auth** | ไม่มี server-side LINE Login | มี `/api/auth/line/callback` |
| **JSON structure** | `tectony1` (array) | `tectony1` (array) – ตรงกัน |

---

## 2. Flow การแชร์การ์ด (โปรเจกต์ที่ทำงานได้)

### 2.1 ไฟล์หลัก: `index.html` (root)

```javascript
async function main() {
    await liff.init({
        liffId: "2006369394-v6aXnxVy"  // LIFF ID สำหรับ share
    });

    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    const name = params.get('name');

    if (liff.isLoggedIn()) {
        sendShare(name, id);
    } else {
        liff.login();   // ⚠️ ไม่มี redirectUri
        sendShare(name, id);  // หลัง redirect กลับมา หน้าโหลดใหม่ → isLoggedIn() = true → sendShare ทำงาน
    }
}
```

### 2.2 จุดสำคัญ

1. **ไม่ส่ง `redirectUri` ใน `liff.login()`**
   - ใช้ `liff.login()` แบบไม่มีพารามิเตอร์
   - ตาม LINE: ถ้าไม่ระบุ `redirectUri` ค่า default จะเป็น **URL ปัจจุบัน** (รวม query string)
   - หลัง login จึงกลับมาที่ URL เดิมพร้อม `?name=xxx&id=1` ไม่หาย

2. **ไม่มี LINE Login ฝั่ง server**
   - ไม่มี endpoint แบบ `/api/auth/line/callback`
   - การ login อยู่เฉพาะใน LIFF (client-side) จึงไม่มีการ redirect ไป server แล้วไป `/my-cards`

3. **Endpoint URL ของ LIFF**
   - น่าจะเป็นโดเมนหลัก (เช่น `https://lineflexvip.tectony.co.th/` หรือ `https://magiccardline.tectony.co.th/`)
   - หน้าเดียวกับที่รับ query `name`, `id` เลย

4. **โครงสร้าง JSON**
   - ใช้ `tectony1` เป็น array (เราใช้เหมือนกัน)

---

## 3. สาเหตุที่โปรเจกต์เราผิดพลาด

1. **ส่ง `redirectUri` เป็นแค่ origin**
   - เราใช้ `redirectUri: window.location.origin`
   - หลัง login จึงกลับมาแค่ `BASE_URL` ไม่มี `?name=...&id=...`
   - ต้องพึ่ง localStorage + logic ซับซ้อน

2. **มี LINE Login ฝั่ง server**
   - มี `/api/auth/line/callback` สำหรับ flow อื่น (เช่น เข้าหน้าเว็บจาก browser)
   - บางครั้ง LIFF อาจพาไป flow นี้ แล้วเราก็ redirect ไป `/my-cards` เพราะไม่รู้ว่าเป็น share flow

3. **การตรวจสอบ share flow ใน callback**
   - ใช้ referer / state ซึ่งไม่เสถียร (referer อาจถูกตัด, state อาจไม่ถูกส่ง)

---

## 4. แนวทางแก้ที่สอดคล้องกับโปรเจกต์ที่ทำงานได้

### 4.1 แก้ใน `share.html` (สำคัญที่สุด)

- **ไม่ส่ง `redirectUri` ใน `liff.login()`**
- ใช้แบบเดียวกับโปรเจกต์ Line_Flex_UPdate:

```javascript
if (!liff.isLoggedIn()) {
    // เก็บ name, id ใน localStorage เผื่อ edge case
    if (cardName) localStorage.setItem('share_card_name', cardName);
    if (cardId) localStorage.setItem('share_card_id', cardId);
    // ไม่ส่ง redirectUri → LIFF จะ redirect กลับมาที่ URL ปัจจุบัน (รวม query string)
    liff.login();
    return;
}
```

- ถ้า LIFF redirect กลับมาที่ URL เดิม (รวม `name`, `id`) แล้ว หน้าโหลดใหม่ครั้งเดียวก็จะได้ `liff.isLoggedIn() === true` และส่ง share ได้เลย ไม่ต้องพึ่ง callback ฝั่ง server สำหรับ share flow

### 4.2 โครงสร้าง JSON

- โปรเจกต์ที่ทำงานได้ใช้ `tectony1` และ `linemsg` เหมือนเรา ไม่ต้องเปลี่ยนโครงสร้าง

### 4.3 สรุปความต่าง

| รายการ | Line_Flex_UPdate | โปรเจกต์เรา (ก่อนแก้) |
|--------|-------------------|------------------------|
| `liff.login()` | `liff.login()` ไม่มีพารามิเตอร์ | `liff.login({ redirectUri: origin })` |
| URL หลัง login | กลับมา URL เดิม + query | กลับมาแค่ origin ไม่มี query |
| Server callback | ไม่ใช้ | ใช้ และบางทีไป `/my-cards` |

---

## 5. การจัดการเมื่อเปิดจากเบราว์เซอร์ภายนอก (ไม่ใช่แอป LINE)

### 5.1 โปรเจกต์ Line_Flex_UPdate

- **ไม่มีการเช็ค `liff.isInClient()`** และไม่เช็ค `liff.isApiAvailable('shareTargetPicker')`
- เมื่อเปิดลิงค์จาก Chrome/Safari: หน้าโหลด → init LIFF → ถ้าไม่ login ก็ `liff.login()` → หลังกลับมาก็เรียก `sendShare()`  
  ถ้าเปิดจาก browser, `shareTargetPicker` จะใช้ไม่ได้ แต่โปรเจกต์ไม่ throw error ยาว ๆ จึงไม่เกิด "ปัญหาอะไร" ในเชิง UX (ไม่มีข้อความ error ยาว)
- สรุป: ใช้ได้ดีเมื่อเปิดจากแอป LINE; เมื่อเปิดจาก browser แค่แชร์ไม่ได้ โดยไม่แสดง error ยาว

### 5.2 โปรเจกต์เรา (ก่อนปรับ)

- เช็ค `isInClient()` แล้ว **throw Error ยาว** พร้อมข้อความเทคนิค
- เมื่อเปิดจาก browser ผู้ใช้เห็นข้อความยาวหลายบรรทัด

### 5.3 การแชร์จาก Chrome (linecard.tectony.co.th)

- เมื่อกดลิงค์ LIFF จากแชทแล้วเปิดใน **Chrome** โปรเจกต์ linecard.tectony.co.th ยัง **เลือกแชร์ได้ตามปกติ**
- กลไก: เมื่อเรียก `liff.shareTargetPicker()` จากหน้าใน Chrome, LIFF SDK จะ **เปิด pop-up** ไปที่ `access.line.me/oauth2/v2.1/liff/shareTargetPicker?liffId=...` ให้ผู้ใช้เลือก Groups/Friends/Chats แล้วกด Share
- ดังนั้น **ไม่ควร block การเรียก `shareTargetPicker()` เมื่อ `!isInClient`** — ให้ลองเรียกเสมอ แล้วถ้าเบราว์เซอร์เปิด pop-up ได้ ผู้ใช้จะแชร์จาก Chrome ได้เหมือนอีกโปรเจกต์

### 5.4 สิ่งที่ปรับใช้ในโปรเจกต์เรา

- **ลบการ return เมื่อ `!isInClient` และ `!isShareAvailable`** — ไม่ block การเรียก `sendShare()` เมื่อเปิดจาก Chrome
- ให้ flow ไปถึง `sendShare()` เสมอ; ถ้า SDK เปิด pop-up ได้ (และไม่ถูก block โดยเบราว์เซอร์) ผู้ใช้จะแชร์จาก Chrome ได้
- ถ้าเรียกแล้ว error (เช่น pop-up ถูก block) จะติดที่ `catch` แล้วแสดงข้อความ error ตามปกติ

---

## 6. สรุปและสิ่งที่แก้ในโปรเจกต์เรา

- โปรเจกต์ที่ทำงานได้ใช้ **LIFF login แบบไม่ระบุ `redirectUri`** และ **Endpoint เสิร์ฟหน้า share เสมอ** และ **ไม่แสดง error ยาวเมื่อเปิดจาก browser**
- สิ่งที่แก้ในโปรเจกต์เรา:
  1. **share.html:** เรียก `liff.login()` แบบไม่ส่ง `redirectUri` และเก็บ `name`/`id` ใน localStorage ก่อน login
  2. **routes/index.js:** route `/` เสิร์ฟ `share.html` เสมอ (ไม่ redirect ไป `/api/auth/line/login` เมื่อไม่มี query)
  3. **share.html:** ไม่ block เมื่อเปิดจาก Chrome — ลบการ return เมื่อ `!isInClient` / `!isShareAvailable` เพื่อให้เรียก `shareTargetPicker()` ได้; จาก Chrome SDK จะเปิด pop-up ไป LINE ให้เลือกแชร์ได้ (เหมือน linecard.tectony.co.th)
