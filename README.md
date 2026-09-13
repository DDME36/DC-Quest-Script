# ZENTYR Discord Quest Script Injector (v3.6)

โปรแกรมสำหรับเปิด Discord Desktop พร้อมโหลดสคริปต์ Quest จาก GitHub แบบ Stealth In-Memory Runtime

---

## สถาปัตยกรรมและการทำงาน

- **Single-File Executable**: แจกจ่ายและใช้งานด้วย `ZENTYR Discord Script.exe` เพียงไฟล์เดียว (~142 KB)
- **Zero Dependencies**: ทำงานบน Windows ทุกเครื่องที่มี .NET Framework 4.0+ (Windows 7, 8, 10, 11 มีติดตั้งมาพร้อมระบบ 100%)
- **Online-Only Hot-Patchable**: ทุกครั้งที่เปิด โปรแกรมจะดาวน์โหลดสคริปต์ล่าสุดจาก:
  `https://raw.githubusercontent.com/DDME36/DC-Quest-Script/main/zentyr.js`
  เมื่อ Discord มีการอัปเดต สามารถแก้ไขสคริปต์บน GitHub ได้ทันที ผู้ใช้ไม่ต้องโหลด EXE ใหม่
- **Stealth & Self-Destruction**: ไม่ทิ้งไฟล์สคริปต์ค้างไว้บนดิสก์ ไฟล์ loader และการแก้ `discord_desktop_core/index.js` ถูกล้างและคืนค่าเดิมทันทีหลัง Discord รันเข้าหน่วยความจำ (RAM)

---

## ระบบ 3 โหมดการทำงาน (Tri-Engine Mode)

บนแถบควบคุมของหน้าต่าง ZENTYR ใน Discord จะมีแถบ Segmented Control ให้ผู้ใช้เลือกโหมดการทำงานได้ 3 ระดับ:

| คุณสมบัติ | SAFE (โหมดปลอดภัย) | BALANCED (โหมดสมดุล - แนะนำ) | TURBO (โหมดเต็มพิกัด) |
| :--- | :--- | :--- | :--- |
| **จำนวนเกมพร้อมกัน (Games)** | **1 เกม** (ทำทีละตัว) | **2 เกมพร้อมกัน** | **ทุกเกมพร้อมกันทั้งหมด** (Uncapped) |
| **จำนวนวิดีโอพร้อมกัน (Videos)** | **1 วิดีโอ** | **2 วิดีโอพร้อมกัน** | **5 วิดีโอพร้อมกัน** |
| **ความเร็ววิดีโอ (Video Speed)** | **2.5x – 3x** (ความเร็วสมจริง) | **5x** *(วิดีโอ 15 นาที เสร็จใน ~3 นาที)* | **8x** (เร่งสปีดสูงสุด) |
| **หน่วงเวลาระหว่างคำขอ (Delay)** | ~3.2 วินาที (+ Random Jitter) | ~2.2 วินาที (+ Random Jitter) | ~1.2 วินาที |
| **ช่วงการส่ง Heartbeat** | ~6.5 วินาที | ~4.5 วินาที | ~2.0 วินาที |
| **ค่าเริ่มต้น (Default)** | ทางเลือกสำหรับความปลอดภัยสูงสุด | **ค่าเริ่มต้นสำหรับผู้ใช้ทั่วไป** | ทางเลือกสำหรับคนรีบ / ไอดีสำรอง |
| **ความจำโหมด** | บันทึกลง `localStorage` อัตโนมัติ | บันทึกลง `localStorage` อัตโนมัติ | บันทึกลง `localStorage` อัตโนมัติ |

---

## วิธีใช้งาน

1. อัปโหลดหรืออัปเดตไฟล์ `zentyr.js` ไปยัง branch `main` ของ repository `DDME36/DC-Quest-Script`
2. ดับเบิลคลิกเปิด `ZENTYR Discord Script.exe`
3. โปรแกรมจะปิด Discord อย่างนุ่มนวล ติดตั้ง Loader ชั่วคราว และเปิด Discord ขึ้นมาใหม่
4. บนหน้าต่าง Discord จะปรากฏ **ZENTYR Widget** ขึ้นมา
   - สามารถคลิกเลือกโหมด **`SAFE`**, **`BALANCED`**, หรือ **`TURBO`** บนแถบเมนูเพื่อสลับโหมดได้ทันที
   - หากต้องการซ่อนหน้าต่าง ให้กดปุ่ม `>` หรือ `Shift + .` บนคีย์บอร์ด

### คำสั่งล้างระบบด้วยตนเอง (Standalone Cleanup)

หากต้องการล้างไฟล์ loader หรือคืนค่าเดิมของ Discord โดยไม่เปิดใช้งาน:

```bat
"ZENTYR Discord Script.exe" --cleanup
```

---

## วิธีการ Build และเปลี่ยนโลโก้ใหม่

### การบิวด์โปรแกรม
รัน `build.bat` หรือใช้คำสั่ง:

```bat
C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe /nologo /warn:4 /target:exe /platform:anycpu /win32icon:"assets\zentyr.ico" /out:"ZENTYR Discord Script.exe" ZentyrInjector.cs
```

### การเปลี่ยนโลโก้ใหม่
เมื่อได้รับไฟล์โลโก้/ไอคอนใหม่:
1. นำไฟล์ไอคอนใหม่นามสกุล `.ico` มาวางทับที่ `assets\zentyr.ico`
2. ดับเบิลคลิก `build.bat` อีกครั้ง
3. จะได้ไฟล์ `ZENTYR Discord Script.exe` พร้อมโลโก้ใหม่ทันทีโดยไม่ต้องแก้ไขโค้ดใดๆ

---

## ความปลอดภัยและข้อจำกัด

- Remote script จำกัดขนาดไม่เกิน 2 MB, timeout 15 วินาที และต้องมี marker `ZENTYR Quest Engine` กับ `window.__zentyrLock`
- การทำ Quest automation อาจขัดต่อเงื่อนไขการใช้งาน (Terms of Service) ของ Discord ควรพิจารณาความเสี่ยงและแนะนำให้ใช้ Balanced หรือ Safe Mode
- สคริปต์ได้ปิดระบบ Auto-claim ไว้ เพื่อให้ผู้ใช้กดรับของรางวัลด้วยตนเองใน *Discord Settings > Gift Inventory*