# Safety Dashboard (Web)

Dashboard สำหรับติดตามสถิติความปลอดภัย (Safety), แสดง **Announcement**, **Poster นโยบาย (รูปภาพ)** และ **Calendar เช็ครายวัน** ว่าเกิดเหตุอันตรายหรือไม่

## ฟีเจอร์หลัก
- **Calendar รายวัน**: คลิกเพื่อเปลี่ยนสถานะ `No Data → Normal → Non-Absent → Absent → No Data`
- **Safety Streak**: นับจำนวนวัน "Normal" ต่อเนื่องย้อนหลัง
- **Statistics**: นับจำนวนเคสจาก Calendar + Incident Log
- **IFR/ISR** (แบบง่าย):
  - IFR = (Absent * 1,000,000) / Man-hours
  - ISR = ((Absent + Non-Absent) * 1,000,000) / Man-hours
- **Announcement**: เพิ่ม/แก้ไข/ลบได้
- **Safety Policy Poster**: อัปโหลดรูปภาพได้
- **Incident Log**: เพิ่มรายการ First Aid / Near Miss / Fire
- **Export/Import JSON**: สำรอง/ย้ายข้อมูลระหว่างเครื่อง

> หมายเหตุ: ข้อมูลถูกเก็บแบบ **LocalStorage (บนเครื่อง/เบราว์เซอร์)** เพื่อให้รันบน GitHub Pages ได้โดยไม่ต้องมี Backend

## โหมดขึ้นจอ Display (4K / TV)
- กด **Display Mode** เพื่อให้ Dashboard สลับหน้าจออัตโนมัติ (Overview → Poster → Calendar)
- กด **Fullscreen** เพื่อขึ้นจอ TV/LED
- มีการปรับสเกล UI เพิ่มเติมเมื่อความกว้างหน้าจอ >= 2560px (เหมาะกับ 4K แนวนอน)

## ใช้ Google Sheets เป็น DB (ยกเว้น Calendar)
Dashboard สามารถ **ดึง/อัปเดตข้อมูลจาก Google Sheets** ได้ (เหมาะกับการอัปเดต KPI/ประกาศจากหลายคน)

**ข้อมูลที่ Sync กับ Sheets**
- Man-hours (Year)
- Announcement
- Policy Poster
- Incident Log

**ข้อมูลที่ไม่ Sync (Local only)**
- Calendar รายวัน (และระบบจะ auto-run ให้เป็นสีเขียวเวลา **16:00** หากยังไม่กรอก)

### วิธีทำ (แนะนำ: Google Apps Script Web App)
1) สร้าง Google Sheet ใหม่
2) ไปที่ **Extensions → Apps Script**
3) วางโค้ดจากไฟล์ `apps-script/Code.gs`
4) ตั้งค่า `WRITE_TOKEN` ใน Apps Script
5) Deploy → **New deployment** → **Web app**
   - Execute as: **Me**
   - Who has access: **Anyone** (เพื่อให้จอ TV ดึงข้อมูลได้)
6) จะได้ URL ลักษณะนี้: `https://script.google.com/macros/s/XXXXX/exec`

### ตั้งค่าใน Dashboard
- กดปุ่ม **Sheets** ที่มุมขวาบน
- ใส่ `endpoint` (URL ที่ได้จาก Apps Script)
- ใส่ `write token` (ถ้าต้องการให้ Dashboard push กลับไป Sheets)
- ตั้งค่า auto-sync (เช่น 60 วินาที)

> ถ้าตั้ง token ว่าง ระบบจะเป็น **Read-only** (เหมาะกับจอ Display)

## Run ในเครื่อง
```bash
npm install
npm run dev
```

## Build
```bash
npm run build
npm run preview
```

## Deploy ไป GitHub Pages (แนะนำ)
1) Push โค้ดขึ้น repo แล้วใช้ branch `main`
2) ไปที่ **Settings → Pages**
   - Source: **GitHub Actions**
3) Workflow `Deploy to GitHub Pages` จะ build และ deploy ให้อัตโนมัติเมื่อ push เข้า `main`

## ถ้าหน้าเว็บ Path เพี้ยนบน GitHub Pages
โปรเจกต์นี้ตั้งค่า base path ผ่านตัวแปร `VITE_BASE`
- ใน GitHub Actions ตั้งให้อัตโนมัติเป็น `/<repo-name>/`
- ถ้ารันเองให้ใช้:
```bash
VITE_BASE=/your-repo-name/ npm run build
```
