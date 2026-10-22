/**
 * KHUMTONE dashboard — Note HTML sync
 * เก็บ note ที่มี format/รูป (HTML) ไว้ใน Google Sheet ให้เปิดเครื่องไหนก็เห็นเหมือนกัน
 *
 * วิธีติดตั้ง (ทำครั้งเดียว):
 *  1. เปิดโปรเจกต์ Apps Script ของ Rudy → กด + สร้างไฟล์ใหม่ชื่อ note-html-sync → วางโค้ดนี้ทั้งไฟล์
 *  2. ในฟังก์ชัน doGet(e) เดิม เพิ่ม 2 บรรทัดนี้ไว้ "บรรทัดแรกสุด" ของฟังก์ชัน:
 *        var nh = handleNoteHtml_(e);
 *        if (nh) return nh;
 *  3. เลือกฟังก์ชัน setupNoteHtmlSync ในแถบด้านบน → กด Run → อนุญาตสิทธิ์ Google Sheets
 *  4. Deploy → Manage deployments → แก้ deployment เดิม → Version: New version → Deploy
 *     (ต้องใช้ deployment เดิม URL จะได้ไม่เปลี่ยน)
 */

function setupNoteHtmlSync() {
  var sh = noteSheet_();
  Logger.log('พร้อมใช้งาน — Sheet: ' + sh.getParent().getUrl());
}

function handleNoteHtml_(e) {
  var p = (e && e.parameter) || {};
  var a = p.action;
  if (a !== 'saveNoteHtml' && a !== 'getNoteHtml') return null;
  var out;
  try {
    out = (a === 'saveNoteHtml') ? saveNoteHtml_(p) : getNoteHtml_(p);
  } catch (err) {
    out = { ok: false, error: String(err) };
  }
  out.noteHtml = true; // หน้าเว็บใช้เช็กว่า GAS รองรับ sync แล้ว
  var body = JSON.stringify(out);
  if (p.callback) {
    return ContentService.createTextOutput(p.callback + '(' + body + ')')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(body).setMimeType(ContentService.MimeType.JSON);
}

function noteSheet_() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('NOTE_HTML_SHEET_ID');
  var ss = null;
  if (id) { try { ss = SpreadsheetApp.openById(id); } catch (e) { ss = null; } }
  if (!ss) {
    ss = SpreadsheetApp.create('KHUMTONE Note HTML (dashboard sync)');
    props.setProperty('NOTE_HTML_SHEET_ID', ss.getId());
    ss.getSheets()[0].appendRow(['taskId', 'html', 'updatedAt']);
  }
  return ss.getSheets()[0];
}

// รับ HTML ทีละ chunk (URL ส่งยาวมากไม่ได้) → ครบแล้วค่อยรวมเขียนลง Sheet
function saveNoteHtml_(p) {
  var id = p.id, idx = Number(p.chunkIdx) || 0, total = Number(p.chunkTotal) || 1;
  var tok = p.token || '', ts = Number(p.ts) || Date.now();
  if (!id) return { ok: false, error: 'no id' };
  var cache = CacheService.getScriptCache();
  var key = 'nh_' + id + '_' + tok + '_';
  cache.put(key + idx, p.html || '', 21600);
  if (idx < total - 1) return { ok: true, partial: idx };

  var keys = [];
  for (var i = 0; i < total; i++) keys.push(key + i);
  var got = cache.getAll(keys), parts = [];
  for (var j = 0; j < total; j++) {
    if (got[key + j] === undefined || got[key + j] === null) return { ok: false, error: 'missing chunk ' + j };
    parts.push(got[key + j]);
  }
  var html = parts.join('');
  if (html.length > 49000) return { ok: false, error: 'note too long' }; // 1 ช่องใน Sheet เก็บได้ 50,000 ตัวอักษร

  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var sh = noteSheet_();
    var data = sh.getDataRange().getValues(), row = -1;
    for (var r = 1; r < data.length; r++) { if (data[r][0] === id) { row = r + 1; break; } }
    if (row > 0) {
      var cur = Number(data[row - 1][2]) || 0;
      if (cur > ts) return { ok: true, stale: true }; // มีฉบับใหม่กว่าจากอีกเครื่องแล้ว
      sh.getRange(row, 2, 1, 2).setValues([[html, ts]]);
    } else {
      sh.appendRow([id, html, ts]);
    }
  } finally {
    lock.releaseLock();
  }
  cache.removeAll(keys);
  return { ok: true, saved: true, ts: ts };
}

function getNoteHtml_(p) {
  var want = {};
  String(p.ids || '').split(',').forEach(function (i) { if (i) want[i] = 1; });
  var data = noteSheet_().getDataRange().getValues(), notes = {};
  for (var r = 1; r < data.length; r++) {
    if (want[data[r][0]]) notes[data[r][0]] = { html: String(data[r][1]), ts: Number(data[r][2]) || 0 };
  }
  return { ok: true, notes: notes };
}
