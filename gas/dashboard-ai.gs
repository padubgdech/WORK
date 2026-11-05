// dashboard-ai.gs — อ่านรูปใบจอง (ตั๋วเครื่องบิน / ที่พัก / รถไฟ / ตั๋ว / ใบเสร็จ) ด้วย Gemini แล้วตอบเป็น JSON
// เรียกจาก dashboard: POST ?action=readBooking  body {image:"data:image/jpeg;base64,...", ctx:{trip,start,end,today,cur,stops:[...]}}
// hook: handleDashboardPost_ (dashboard-upload.gs) ส่ง action=readBooking มาที่ handleDashboardAi_(e)
// คีย์ Gemini: Script Property GEMINI_API_KEY ก่อน ถ้าไม่มีจะหาใน CONFIG (ชื่อที่มีคำว่า gemini)

function aiGeminiKey_() {
var k = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
if (k) return k;
try {
if (typeof CONFIG !== 'undefined' && CONFIG) {
for (var n in CONFIG) { if (/gemini/i.test(n) && CONFIG[n] && typeof CONFIG[n] === 'string') return CONFIG[n]; }
}
} catch (e) {}
return '';
}

function handleDashboardAi_(e) {
var out;
try {
var body = JSON.parse((e.postData && e.postData.contents) || '{}');
out = aiReadBooking_(body.image || '', body.ctx || {});
} catch (err) {
out = { ok: false, error: String(err) };
}
return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

function aiReadBooking_(dataUrl, ctx) {
var m = String(dataUrl).match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
if (!m) return { ok: false, error: 'not an image' };
var key = aiGeminiKey_();
if (!key) return { ok: false, error: 'no gemini key' };
var prompt = 'You read travel booking screenshots (flight e-tickets, hotel/Airbnb confirmations, train/bus tickets, activity tickets, car rental, travel insurance, receipts). '
+ 'Trip context: ' + JSON.stringify(ctx) + '. Use the trip year for dates without a year. '
+ 'Return ONLY JSON: {"items":[{"type":"flight|hotel|train|car|ticket|ins|other",'
+ '"title":"short title, e.g. TG634 BKK→TPE or hotel name","date":"YYYY-MM-DD start / departure / check-in","time":"HH:MM or empty",'
+ '"endDate":"YYYY-MM-DD arrival / check-out or empty","endTime":"HH:MM or empty","from":"","to":"","code":"booking reference / PNR / confirmation no.",'
+ '"people":"number of guests/passengers or empty","price":number or null,"currency":"ISO code e.g. THB TWD JPY or empty",'
+ '"address":"full address for hotels, else empty","note":"short Thai note: terminal, seat, room type, check-in rules",'
+ '"uncertain":["field names you are not sure about"]}]}. '
+ 'One item per flight leg (outbound and return are separate items). A hotel stay is one item (date=check-in, endDate=check-out). '
+ 'price = total paid for that item if shown (number only). If nothing is a booking, return {"items":[]}.';
var payload = {
contents: [{ parts: [{ text: prompt }, { inline_data: { mime_type: m[1], data: m[2] } }] }],
generationConfig: { temperature: 0.1, responseMimeType: 'application/json' }
};
var res = UrlFetchApp.fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + encodeURIComponent(key), {
method: 'post', contentType: 'application/json', payload: JSON.stringify(payload), muteHttpExceptions: true
});
var code = res.getResponseCode();
if (code !== 200) return { ok: false, error: 'gemini ' + code, detail: String(res.getContentText()).slice(0, 300) };
var j = JSON.parse(res.getContentText());
var txt = '';
try { txt = j.candidates[0].content.parts.map(function (p) { return p.text || ''; }).join(''); } catch (e2) {}
var data = null;
try { data = JSON.parse(txt); } catch (e3) { var mm = String(txt).match(/\{[\s\S]*\}/); if (mm) { try { data = JSON.parse(mm[0]); } catch (e4) {} } }
if (!data || !data.items) return { ok: false, error: 'bad ai reply', raw: String(txt).slice(0, 300) };
return { ok: true, items: data.items };
}
