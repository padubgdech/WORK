// KHUMTONE dashboard — เปิดแอปคำขอเดียว (getMainData) + งานที่ทำซ้ำ (Repeat)
// doGet เรียก handleDashboardExtra_(e) ต่อจาก handleNoteHtml_(e)
// ใช้ Notion property "Repeat" (select: Daily / Weekly / Monthly) — setupRepeatProperty() สร้างให้ถ้ายังไม่มี
function handleDashboardExtra_(e) {
var p = (e && e.parameter) || {};
var a = p.action;
if (a === 'getMainData') return jsonpResponse(e, getMainData_(p));
if (a === 'setupRepeat') return jsonpResponse(e, setupRepeatProperty());
if (a === 'updateTask' && String(p.done) === 'true') { try { createNextRepeat_(p.id); } catch (err) { Logger.log('repeat error: ' + err); } return null; }
if (a === 'addTask' && p.repeat && !p._noRepeat) return addTaskWithRepeat_(e);
return null;
}

// ---------- เปิดแอปคำขอเดียว ----------
function callAction_(params) {
var out = doGet({ parameter: params });
try { return JSON.parse(out.getContent()); } catch (err) { return null; }
}

function getMainData_(p) {
var date = p.date || Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd');
var today = callAction_({ action: 'getTasks', date: date }) || {};
var overdue = callAction_({ action: 'getOverdueTasks' }) || {};
var events = callAction_({ action: 'getCalendarEvents', date: date }) || {};
var tasks = today.tasks || [], od = overdue.tasks || [];
var ids = tasks.concat(od).filter(function (t) { return !t.done; }).map(function (t) { return t.id; });
return { mainData: true, tasks: tasks, overdue: od, events: events.events || [], subtasks: subtasksBatch_(ids) };
}

// ดึงงานย่อยของหลายงานพร้อมกัน (ขนานกัน) แทนการยิงทีละการ์ด
function subtasksBatch_(ids) {
var out = {};
if (!ids.length) return out;
var reqs = ids.map(function (id) {
return { url: 'https://api.notion.com/v1/blocks/' + id + '/children?page_size=100', method: 'get', headers: { Authorization: 'Bearer ' + CONFIG.NOTION_TOKEN, 'Notion-Version': '2022-06-28' }, muteHttpExceptions: true };
});
var res = UrlFetchApp.fetchAll(reqs);
res.forEach(function (r, i) {
try {
var data = JSON.parse(r.getContentText());
out[ids[i]] = (data.results || []).filter(function (b) { return b.type === 'to_do'; }).map(function (b) {
var t = b.to_do.rich_text && b.to_do.rich_text[0] ? b.to_do.rich_text[0].plain_text : '';
return { id: b.id, name: t, done: !!b.to_do.checked };
});
} catch (err) {}
});
return out;
}

// ---------- งานที่ทำซ้ำ ----------
function notionReq_(path, method, body) {
var opt = { method: method, headers: { Authorization: 'Bearer ' + CONFIG.NOTION_TOKEN, 'Notion-Version': '2022-06-28', 'Content-Type': 'application/json' }, muteHttpExceptions: true };
if (body) opt.payload = JSON.stringify(body);
return JSON.parse(UrlFetchApp.fetch('https://api.notion.com/v1/' + path, opt).getContentText());
}

function setupRepeatProperty() {
var db = notionReq_('databases/' + CONFIG.NOTION_DATABASE_ID, 'get');
if (db.properties && db.properties.Repeat) return { ok: true, existed: true };
var r = notionReq_('databases/' + CONFIG.NOTION_DATABASE_ID, 'patch', { properties: { Repeat: { select: { options: [ { name: 'Daily', color: 'blue' }, { name: 'Weekly', color: 'green' }, { name: 'Monthly', color: 'purple' } ] } } } });
Logger.log(r.object === 'error' ? 'ERROR ' + r.message : 'สร้าง property Repeat แล้ว');
return { ok: r.object !== 'error', created: true };
}

function addDaysStr_(ds, n) { var d = new Date(ds + 'T00:00:00+07:00'); d.setDate(d.getDate() + n); return Utilities.formatDate(d, 'Asia/Bangkok', 'yyyy-MM-dd'); }
function addMonthsStr_(ds, n) { var d = new Date(ds + 'T00:00:00+07:00'); var day = d.getDate(); d.setDate(1); d.setMonth(d.getMonth() + n); var last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(); d.setDate(Math.min(day, last)); return Utilities.formatDate(d, 'Asia/Bangkok', 'yyyy-MM-dd'); }
function stepDate_(ds, rule) { return rule === 'Daily' ? addDaysStr_(ds, 1) : rule === 'Weekly' ? addDaysStr_(ds, 7) : addMonthsStr_(ds, 1); }

function createNextRepeat_(pageId) {
if (!pageId) return null;
var page = notionReq_('pages/' + pageId, 'get');
var pr = page.properties || {};
var rule = pr.Repeat && pr.Repeat.select ? pr.Repeat.select.name : '';
if (['Daily', 'Weekly', 'Monthly'].indexOf(rule) === -1) return null;
var todayStr = Utilities.formatDate(new Date(), 'Asia/Bangkok', 'yyyy-MM-dd');
var start = pr['Action Date'] && pr['Action Date'].date ? pr['Action Date'].date.start.slice(0, 10) : todayStr;
var end = pr['End Date'] && pr['End Date'].date ? pr['End Date'].date.start.slice(0, 10) : '';
var next = stepDate_(start, rule), guard = 0;
while (next <= todayStr && guard++ < 400) next = stepDate_(next, rule); // ทำช้า → รอบถัดไปต้องอยู่หลังวันนี้
var key = 'rep_' + pageId + '_' + next, props = PropertiesService.getScriptProperties();
if (props.getProperty(key)) return null; // สร้างไปแล้ว (กัน Done ซ้ำ)
var np = {};
Object.keys(pr).forEach(function (k) {
var v = pr[k];
if (k === 'Action Date' || k === 'End Date') return;
if (v.type === 'title') np[k] = { title: (v.title || []).map(function (t) { return { text: { content: t.plain_text } }; }) };
else if (v.type === 'rich_text') np[k] = { rich_text: (v.rich_text || []).map(function (t) { return { text: { content: t.plain_text } }; }) };
else if (v.type === 'select' && v.select) np[k] = { select: { name: v.select.name } };
else if (v.type === 'multi_select') np[k] = { multi_select: (v.multi_select || []).map(function (o) { return { name: o.name }; }) };
else if (v.type === 'number' && v.number !== null) np[k] = { number: v.number };
else if (v.type === 'checkbox') np[k] = { checkbox: false };
else if (v.type === 'url' && v.url) np[k] = { url: v.url };
});
np['Action Date'] = { date: { start: next } };
if (end && end >= start) np['End Date'] = { date: { start: addDaysStr_(next, Math.round((new Date(end) - new Date(start)) / 864e5)) } };
var kids = notionReq_('blocks/' + pageId + '/children?page_size=100', 'get');
var todos = (kids.results || []).filter(function (b) { return b.type === 'to_do'; }).map(function (b) {
return { object: 'block', type: 'to_do', to_do: { rich_text: (b.to_do.rich_text || []).map(function (t) { return { type: 'text', text: { content: t.plain_text } }; }), checked: false } };
});
var body = { parent: { database_id: CONFIG.NOTION_DATABASE_ID }, properties: np };
if (todos.length) body.children = todos;
var created = notionReq_('pages', 'post', body);
if (created.object === 'error') { Logger.log('repeat create error: ' + created.message); return null; }
props.setProperty(key, created.id);
return created.id;
}

// เพิ่มงานพร้อมตั้ง Repeat — ให้ addTask เดิมสร้างงาน แล้วหางานที่เพิ่งสร้างมาใส่ Repeat
function addTaskWithRepeat_(e) {
var p = {}; Object.keys(e.parameter).forEach(function (k) { p[k] = e.parameter[k]; });
var rule = p.repeat; delete p.repeat; p._noRepeat = '1';
var out = doGet({ parameter: p });
if (['Daily', 'Weekly', 'Monthly'].indexOf(rule) === -1) return out;
try {
var name = decodeURIComponent(p.name || '');
var q = notionReq_('databases/' + CONFIG.NOTION_DATABASE_ID + '/query', 'post', { filter: { property: 'Task', title: { equals: name } }, sorts: [{ timestamp: 'created_time', direction: 'descending' }], page_size: 1 });
var pg = q.results && q.results[0];
if (pg) notionReq_('pages/' + pg.id, 'patch', { properties: { Repeat: { select: { name: rule } } } });
} catch (err) { Logger.log('addTaskWithRepeat error: ' + err); }
return out;
}
