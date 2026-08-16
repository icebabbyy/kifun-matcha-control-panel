# KIFUN MATCHA — Wongnai & LINE MAN Auto Sync Chrome Extension

ส่วนขยาย Google Chrome สำหรับดึงยอดขายจากหน้าเว็บ **Wongnai Merchant** (`merchant.wongnai.com`) เพื่อนำไปตัดสต็อกผงชา, นม, และแพ็กเกจจิ้งใน **Supabase Database** ของร้าน Kifun Matcha โดยอัตโนมัติ

---

### วิธีติดตั้งใน Google Chrome (ทำครั้งเดียว):

1. เปิด Google Chrome แล้วพิมพ์ในช่อง URL: `chrome://extensions`
2. เปิดสวิตช์ **"โหมดนักพัฒนาซอฟต์แวร์" (Developer mode)** ที่มุมขวาบน
3. กดปุ่ม **"โหลดส่วนขยายที่คลายการบีบอัดแล้ว" (Load unpacked)** ที่มุมซ้ายบน
4. เลือกโฟลเดอร์นี้:
   `C:\Users\ASUS\Desktop\kifun-matcha-control-panel\wongnai-extension`
5. จะปรากฏ Extension **"KIFUN MATCHA — Wongnai Sales & Stock Sync"** พร้อมใช้งานทันที!

---

### วิธีใช้งาน:
1. เปิดหน้าเว็บ Wongnai Merchant ตามปกติ: `https://merchant.wongnai.com/businesses/3884438/menu`
2. จะมีกล่องวิดเจ็ตสีเขียวเข้มมุมขวาล่างเขียนว่า **"🍵 KIFUN MATCHA SYNC"**
3. เมื่อมีออเดอร์เสร็จสิ้น สามารถกดปุ่ม **"⚡ ซิงก์ยอดตัดสต็อก"** ได้ทันที ระบบจะตัดสต็อกวัตถุดิบและส่งยอดขายเข้า Supabase Dashboard ทันทีครับ
