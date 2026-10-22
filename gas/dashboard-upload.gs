// KHUMTONE dashboard — อัปรูปใน note ขึ้น Google Drive
// หน้าเว็บส่ง POST มาที่ ?action=uploadImage · doPost เรียก handleDashboardPost_(e) เป็นบรรทัดแรก
// webhook ของ LINE ไม่มี ?action= จึงไม่โดนกระทบ
// ต้องมีสิทธิ์ https://www.googleapis.com/auth/drive ใน appsscript.json
function handleDashboardPost_(e) {
var action = e && e.parameter && e.parameter.action;
if (action !== 'uploadImage') return null;
var out;
try {
var body = JSON.parse((e.postData && e.postData.contents) || '{}');
out = saveDashboardImage_(body.imageData || '', body.fileName || 'image.jpg');
} catch (err) {
out = { ok: false, error: String(err) };
}
return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

function dashboardImageFolder_() {
var props = PropertiesService.getScriptProperties();
var id = props.getProperty('DASHBOARD_IMG_FOLDER_ID');
if (id) { try { return DriveApp.getFolderById(id); } catch (e) {} }
var f = DriveApp.createFolder('KHUMTONE Dashboard Images');
props.setProperty('DASHBOARD_IMG_FOLDER_ID', f.getId());
return f;
}

function saveDashboardImage_(dataUrl, fileName) {
var m = String(dataUrl).match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
if (!m) return { ok: false, error: 'not an image' };
var bytes = Utilities.base64Decode(m[2]);
if (bytes.length > 8 * 1024 * 1024) return { ok: false, error: 'image too large' };
var name = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyyMMdd-HHmmss') + '-' + String(fileName).replace(/[^\w.\-]/g, '_');
var file = dashboardImageFolder_().createFile(Utilities.newBlob(bytes, m[1], name));
file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); // ให้แสดงในหน้าเว็บได้
return { ok: true, id: file.getId(), url: 'https://lh3.googleusercontent.com/d/' + file.getId() };
}

function setupDashboardUpload() {
Logger.log('พร้อมใช้งาน — โฟลเดอร์: ' + dashboardImageFolder_().getUrl());
}

// ใช้กับ moveTask / setTaskDate — อัปเดต End Date ไปพร้อม Action Date (เดิมค้างวันเก่า ทำให้วันจบอยู่ก่อนวันเริ่ม)
// endDate: ไม่ส่ง = ไม่แตะ End Date · 'none' = ล้าง End Date · 'yyyy-MM-dd' = ตั้งค่าใหม่
// ใน รหัส.gs ทั้ง moveTask และ setTaskDate ใช้: properties: dashboardDateProps_(newDate, e.parameter.endDate)
function dashboardDateProps_(start, endDate) {
var p = { "Action Date": { date: { start: start } } };
if (endDate === 'none') p["End Date"] = { date: null };
else if (endDate) p["End Date"] = { date: { start: endDate } };
return p;
}
