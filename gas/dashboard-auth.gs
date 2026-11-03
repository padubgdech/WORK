// KHUMTONE dashboard — ยืนยันตัวตนด้วย LINE (ครั้งเดียวต่อเครื่อง แล้วจำไว้ 30 วัน)
// ลำดับ: หน้าเว็บได้ ID token จาก LIFF → ?action=authLine&idToken=... → GAS ตรวจกับ LINE
//        → ถ้าเป็นเจ้าของ ออก session key (สุ่ม 64 ตัว) → หน้าเว็บแนบ _s=<key> ทุกคำขอ
// Hook: doGet บรรทัดแรก →  var ag = authGuard_(e); if (ag) return ag;
//       doPost (?action=uploadImage) → handleDashboardPost_ เรียก authGuard_ เอง · webhook LINE ไม่มี ?action= จึงไม่โดน
// Script Properties:
//   AUTH_LIFF_CHANNEL  = Channel ID ของ LINE Login (ตัวเลขหน้า "-" ใน LIFF ID)
//   AUTH_OWNER_SUBS    = userId ของ LINE Login ที่อนุญาต (คั่นด้วย ,) — ตั้งอัตโนมัติด้วย authStartSetup()
//   AUTH_ENFORCE       = 1 → บังคับใช้ · ไม่มี/0 → ยังเปิดเหมือนเดิม (ใช้ตอนทดสอบ / ปลดล็อกฉุกเฉิน)
//   ses_<sha256>       = {sub, exp} ของแต่ละเครื่อง

var AUTH_DAYS = 30;
var AUTH_RENEW_DAYS = 7;
var AUTH_PUBLIC = { authLine: 1, authStatus: 1 };

function authProps_() { return PropertiesService.getScriptProperties(); }

function authHash_(s) {
var b = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(s), Utilities.Charset.UTF_8);
return b.map(function (x) { return ('0' + (x & 255).toString(16)).slice(-2); }).join('');
}

function authEnforced_() { return authProps_().getProperty('AUTH_ENFORCE') === '1'; }

function authOwners_() {
return String(authProps_().getProperty('AUTH_OWNER_SUBS') || '').split(',').map(function (x) { return x.trim(); }).filter(String);
}

function authOut_(e, obj, isPost) {
if (isPost) return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
return jsonpResponse(e, obj);
}

// ตรวจ session ของคำขอ · คืน null = ผ่าน · คืน output = ตอบกลับทันที (ล็อกอิน / ไม่มีสิทธิ์)
function authGuard_(e, isPost) {
var p = (e && e.parameter) || {};
var a = p.action || '';
if (a === 'authLine') return authOut_(e, authLine_(p), isPost);
if (a === 'authStatus') return authOut_(e, authStatus_(p), isPost);
if (a === 'authLogout') return authOut_(e, authLogout_(p), isPost);
if (isPost && !a) return null;
if (!authEnforced_()) return null;
if (authCheck_(p._s)) return null;
return authOut_(e, { ok: false, auth: false, error: 'auth' }, isPost);
}

function authCheck_(key) {
if (!key || String(key).length < 32) return null;
var k = 'ses_' + authHash_(key);
var cache = CacheService.getScriptCache();
var hit = cache.get(k);
if (hit) return JSON.parse(hit);
var raw = authProps_().getProperty(k);
if (!raw) return null;
var s = JSON.parse(raw);
var now = Date.now();
if (!s.exp || s.exp < now || authOwners_().indexOf(s.sub) < 0) { authProps_().deleteProperty(k); return null; }
if (s.exp - now < AUTH_RENEW_DAYS * 864e5) { s.exp = now + AUTH_DAYS * 864e5; authProps_().setProperty(k, JSON.stringify(s)); }
cache.put(k, JSON.stringify(s), 600);
return s;
}

function authVerifyLine_(idToken) {
var ch = authProps_().getProperty('AUTH_LIFF_CHANNEL');
if (!ch) return { error: 'ยังไม่ได้ตั้ง AUTH_LIFF_CHANNEL' };
var r = UrlFetchApp.fetch('https://api.line.me/oauth2/v2.1/verify', {
method: 'post', payload: { id_token: String(idToken || ''), client_id: ch }, muteHttpExceptions: true
});
var j = {};
try { j = JSON.parse(r.getContentText()); } catch (err) {}
if (r.getResponseCode() !== 200 || !j.sub) return { error: j.error_description || 'LINE ตรวจ token ไม่ผ่าน' };
return { sub: j.sub, name: j.name || '' };
}

function authLine_(p) {
var v = authVerifyLine_(p.idToken);
if (v.error) return { ok: false, auth: false, error: v.error };
var props = authProps_();
var owners = authOwners_();
var setupUntil = Number(props.getProperty('AUTH_SETUP_UNTIL') || 0);
if (owners.indexOf(v.sub) < 0 && setupUntil > Date.now()) {
owners.push(v.sub);
props.setProperty('AUTH_OWNER_SUBS', owners.join(','));
props.deleteProperty('AUTH_SETUP_UNTIL');
}
if (owners.indexOf(v.sub) < 0) return { ok: false, auth: false, denied: true, name: v.name, error: 'บัญชี LINE นี้ไม่มีสิทธิ์ใช้แดชบอร์ด' };
authCleanup_();
var key = (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '');
var exp = Date.now() + AUTH_DAYS * 864e5;
props.setProperty('ses_' + authHash_(key), JSON.stringify({ sub: v.sub, exp: exp, at: Date.now(), dev: String(p.dev || '').slice(0, 60) }));
return { ok: true, session: key, exp: exp, name: v.name };
}

function authStatus_(p) {
return { ok: true, enforced: authEnforced_(), valid: !!authCheck_(p._s), owners: authOwners_().length };
}

function authLogout_(p) {
if (p._s) {
var k = 'ses_' + authHash_(p._s);
authProps_().deleteProperty(k);
CacheService.getScriptCache().remove(k);
}
return { ok: true };
}

function authCleanup_() {
var props = authProps_(), all = props.getProperties(), now = Date.now();
Object.keys(all).forEach(function (k) {
if (k.indexOf('ses_') !== 0) return;
try { if (JSON.parse(all[k]).exp < now) props.deleteProperty(k); } catch (err) { props.deleteProperty(k); }
});
}

// ---- รันจากหน้า editor (เฉพาะเจ้าของโปรเจกต์ทำได้) ----

// เปิดหน้าต่าง 15 นาที: บัญชี LINE แรกที่ล็อกอินเข้าแดชบอร์ดจะถูกบันทึกเป็นเจ้าของ
function authStartSetup() {
authProps_().setProperty('AUTH_SETUP_UNTIL', String(Date.now() + 15 * 60000));
Logger.log('เปิดให้ลงทะเบียนเจ้าของ 15 นาที — เปิดแดชบอร์ดแล้วล็อกอิน LINE');
}

function authEnable() { authProps_().setProperty('AUTH_ENFORCE', '1'); Logger.log('บังคับใช้การยืนยันตัวตนแล้ว'); }

function authDisable() { authProps_().setProperty('AUTH_ENFORCE', '0'); Logger.log('ปิดการบังคับใช้ชั่วคราว (เปิดเหมือนเดิม)'); }

// ออกจากระบบทุกเครื่อง (เช่น ทำมือถือหาย)
function authLogoutAll() {
var props = authProps_(), all = props.getProperties(), n = 0;
Object.keys(all).forEach(function (k) { if (k.indexOf('ses_') === 0) { props.deleteProperty(k); n++; } });
Logger.log('ลบ session ทั้งหมด ' + n + ' เครื่อง (cache หมดอายุภายใน 10 นาที)');
}

function authInfo() {
var all = authProps_().getProperties();
var ses = Object.keys(all).filter(function (k) { return k.indexOf('ses_') === 0; });
Logger.log('enforce=' + (all.AUTH_ENFORCE || '-') + ' channel=' + (all.AUTH_LIFF_CHANNEL ? 'set' : '-') + ' owners=' + authOwners_().length + ' sessions=' + ses.length);
}
