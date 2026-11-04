# KHUMTONE WORK — dashboard (LINE LIFF)

Personal task dashboard for Dech (KHUMTONE). Thai UI. Read this before changing anything.

## Where things live
- **Frontend:** `index.html` (single file) → GitHub Pages `https://padubgdech.github.io/WORK/`. Push to `main` = deploy (1–2 min).
- **Backend:** Google Apps Script project **"LINE"** in padungdech.w@gmail.com
  (`https://script.google.com/home/projects/1Zo3gE2KB_EJj9gnEuxZ4tJS9j1piswQyI-pQYUOaJ_7FUd7LbZh8YyLe/edit`).
  It is also the Rudy LINE bot (webhook in `doPost`, triggers `processMessage` every minute, `morningRoutine`, `eveningReview`).
- **Dashboard deployment:** the one whose URL contains `AKfycbzUocf5...FrnjvFc4eHA` (same as `GAS` in index.html).
  When deploying: Manage deployments → pick THAT deployment → pencil → Version: New version. Never "New deployment" (URL would change).
  Other active deployments (versions 183–188, 19, 20, 64) belong to the LINE bot — don't touch.
- **Data:** Notion database (Tasks), properties: Task (title), Priority, Status, Action Date, End Date, Note, Repeat (select Daily/Weekly/Monthly), Pinned (checkbox).
- `gas/*.gs` in this repo = copies of the files added to the GAS project (keep in sync).

## GAS files added by Claude (already installed)
- `note-html-sync.gs` — note HTML sync to a Google Sheet (`saveNoteHtml`/`getNoteHtml`). Hook: first lines of `doGet`.
- `dashboard-upload.gs` — note images → Drive folder "KHUMTONE Dashboard Images" (POST `?action=uploadImage`, hook first lines of `doPost`) + `dashboardDateProps_` used by `moveTask`/`setTaskDate` to update End Date.
- `dashboard-extra.gs` — `getMainData` (one request: today + overdue + events + subtasks via `fetchAll`) and recurring tasks
  (Notion "Repeat" select Daily/Weekly/Monthly; marking a repeat task Done creates the next one; dedupe via Script Properties `rep_<id>_<date>`).
  Hook: `doGet` line after `if (nh) return nh;` → `var ex = handleDashboardExtra_(e); if (ex) return ex;`.
  Installed 29 Oct 2026, `setupRepeatProperty` run (property created). `USE_MAIN_DATA=true` in index.html.
  Pinned tasks (same file): Notion checkbox "Pinned" (`setupPinnedProperty` run). `getMainData` returns `pinned:[{id,created}]`
  (+ their subtasks); actions `getPinned`, `setPinned` (id, pinned=true|false); `addTask` with `pin=1` → pins the new task.
  Dashboard deployment = **version 195** (3 Nov 2026: + addAllDayEvent, getRangeEvents).
- Frontend pinned band (design "D compact", canvas artifact "ปักหมุดงาน — 4 แบบ"): `#main-pinned` above the Main grid.
  Shows every Pinned task that is still active (`allActiveTasks`+today+overdue; done ones drop out) — dated or not (Dech: "ปักได้ทุกงาน").
  Undated: age badge (days since Notion created_time) + "วันนี้"; setting a date auto-unpins. Dated: "เริ่ม <date>" badge, stays pinned
  until × (unpin). Pin toggle on every Tasks-page card and in the add-task modal.
  Click a pinned card → `openPinDetail` popup = full `tcCard` (note, subtasks, Done/เลื่อน/ลบ) + ถอดหมุด; undated tasks show
  `pinDateBox` (flag `t._pinBox`) instead of the date bar. If the task is already in the Main lists it scrolls/highlights that card instead.
  `getTask()` also falls back to `allActiveTasks` so subtask/note actions work in the popup.
  Each pinned card has an inline note (4 Nov, Dech: "จด NOTE ย่อตรงนี้ได้"): yellow lined box `.pin-nwrap` (label "NOTE · พิมพ์ได้เลย" + save status) → `.pin-nedit#pne-<id>` contenteditable (`pinNoteHtml`),
  autosave 900 ms / blur / tab hide (`pinNoteInput`/`pinNoteFlush`) → `noteCommit` (shared with `saveNoteInline`: localStorage
  `note_html_<id>` + task arrays + pushNote). Paste = plain text. `renderPinned` skips while a pin note is focused (`_pinRenderLater`). Note: 21 of 25 active tasks had no date (Tasks backlog) — that's why pinning is an explicit checkbox,
  not "no date". Main sidebar NOTE notebook was removed (29 Oct) at Dech's request.
- Note tab (`renderNotes`, localStorage `rudy_notes`): cards + detail panel restyled to Apple frosted single colour (design "การ์ด 5" on the canvas,
  29 Oct). Per-note colour picker removed from the panel (n.color still stored, just unused). Selected card = blue ring (`.note-card.sel`).
  Rich text (30 Oct): `#nd-body` is a contenteditable + `noteToolbar()` (B I U S H, lists, 6 colours, ไฮไลต์, Tx). Saves `n.html`
  (via `noteSanitize` allow-list: b/i/u/s/br/div/p/ul/ol/li/span/h3, only color/background/bold styles) + plain `n.body`.
  Old notes without `html` render body with `\n`→`<br>` (`noteHtmlOf`).
  Inline editing (30 Oct, Dech: "แก้ใน NOTE ได้เลย แสดงแบบเต็ม"): no side panel any more — every card shows the full note and is
  editable in place (title `#nttl-<id>`, body `#nbody-<id>`, toolbar only on the focused card). Autosave 600 ms after typing +
  on blur/tab hide/unload (`noteAutoSave`/`noteFlush`). Delete = trash icon in card header. `renderNotes(focusId)`.
  Compact cards (30 Oct): smaller padding/fonts/toolbar. Resizable (31 Oct): `.note-grid` is flex-wrap; each card width = `n.w`
  (default 240) and optional fixed height `n.h` (body scrolls). Drag `.note-grip` (bottom-right) / arrow keys → `noteSaveSize`
  autosaves; double-click grip = reset. Phone: width forced 100%, only height resizes.
- Rudy chat (3 Nov, design "แชท Rudy 1" on the canvas): floating `#rudy-fab` bottom-right (mobile: above tab bar) → `#rudy-chat` panel.
  No new GAS code: `askRudy` (existing, Gemini 2.5 Flash) only classifies/extracts → JSON {type task|event|note|query|chat, name, date,
  startTime, endTime, priority, location, note, queryDate, reply}. Confirm card (ยืนยัน/แก้ไข) then calls existing `addTask`
  (name/date/endDate/priority/note) or `addCalendarEvent` (name[+ " @ location"], date, startTime, endTime). Notes go to `rudy_notes`
  locally (📝 chip skips AI). Queries are answered from dashboard data (`rcSummary`), not Gemini. Prompt is English to keep the
  GET URL short (prompt is double-encoded). History in localStorage `rudy_chat_v1` (last 60).
  All-day / multi-day events (3 Nov): Gemini returns `allDay` + `endDate`; card shows range; confirm → new GAS action
  `addAllDayEvent` (dashboard-extra.gs: name, date, endDate inclusive → CalendarApp.getDefaultCalendar().createAllDayEvent).
  Events without a clock time are all-day. Greeting is computed live in `rcRender` (not stored).
- Calendar tab rebuilt (3 Nov, from Dech's mockup "Rudy Calendar — Multi-day Mockups", A+C+D): views เดือน / รายการ / ไทม์ไลน์
  (`calView`, localStorage `cal_view`). Data: one call `getRangeEvents` (dashboard-extra.gs: from,to → events {id,title,allDay,date,
  endDate inclusive,startTime,endTime,location}) cached per grid range in `calMonthCache` (`calInvalidate()`), plus tasks from
  `allActiveTasks` (actionDate–endDate, colour by priority). Spans = tasks + all-day events (bars, lanes via `cvLanes`); dots = timed
  events. Month: Mon-first weeks, bar label full on today's segment ("· 1–7 พ.ย. · วันที่ 3/7"), "ต่อ · วันที่ a–b" otherwise.
  Agenda: mini calendar + "ช่วงยาวเดือนนี้" progress + list (multi-day all-day events = block with inner timed events).
  Timeline: rows งาน / ทริป / นัดหมาย, today line, 3 summary cards. Clicks: bar → task popup (tcCard) / event popup (cancel);
  day → day popup (+ งาน / + นัดหมาย → Rudy chat in event mode). Old per-day functions (loadCalDay, cellChips…) are now unused.
- Scopes added in appsscript.json: spreadsheets, drive (user authorized).

- LINE login (3 Nov, code written, NOT yet installed): `gas/dashboard-auth.gs` + frontend `authBoot/authLogin/authLost` (index.html, top of script).
  Once per device: LIFF ID token → `?action=authLine` → GAS verifies at api.line.me/oauth2/v2.1/verify (client_id = Script Property
  `AUTH_LIFF_CHANNEL`), sub must be in `AUTH_OWNER_SUBS` → session key (64 chars, stored hashed as Script Property `ses_<sha256>`,
  30 days, auto-renewed when <7 days left, CacheService 10 min) → localStorage `khum_sess_v1` → every request sends `_s`.
  Guard = `authGuard_(e)` first line of doGet; uploadImage guarded inside `handleDashboardPost_`; webhook POST (no ?action) untouched.
  `AUTH_ENFORCE`=1 enforces; 0/missing = open (rollout + emergency unlock). Editor functions: `authStartSetup` (15-min window: first LINE
  login becomes owner), `authEnable`, `authDisable`, `authLogoutAll`, `authInfo`. Frontend: `LIFF_ID=''` = auth off (legacy).
  On `{auth:false}` reads re-login then retry; writes stay in the queue (state 'auth', tries not counted). Relogin on expired ID token
  max once per 2 min (sessionStorage `khum_relogin`) — avoids redirect loop. Lock screen `#auth-lock`. Test: scratchpad test_auth.py / gas_auth_sim.js.
  Rollout: (1) LIFF app (endpoint https://padubgdech.github.io/WORK/, scope openid) → (2) install file + doGet hook + set AUTH_LIFF_CHANNEL
  → deploy new version → (3) set LIFF_ID in index.html, push → (4) run authStartSetup, Dech logs in → (5) authEnable.
  NOTE: once enforced, anything else calling the dashboard deployment's doGet without a session breaks (only the dashboard is known to).

## Pending
1. Security: login step above (in progress). Tokens (LINE/Notion/Gemini) are hard-coded in `รหัส.gs` CONFIG → move to Script Properties;
   rotating them also needs the LINE-bot webhook deployment updated (it runs an old pinned version with the old tokens).
2. Separate HR/employee app: profile "แก้ไขข้อมูล" opens the first-login modal (only "ออกจากระบบ", no ✕, save button stuck on "กำลังบันทึก..."). Location of that code unknown — ask Dech.

## Working notes (learned the hard way)
- Dech's machine is a **Mac**: in the Apps Script editor use `cmd+…` (cmd+a, cmd+z, cmd+f, cmd+s). Ctrl shortcuts get typed as text.
- Typing into the Monaco editor: write code with **no leading indentation** and **no `/* */` block comments** (auto-indent/doc-comment completion corrupt it). Keys like `Page_Down` may get typed literally — scroll with the mouse or jump with cmd+f instead.
- Always screenshot after creating a file/clicking a menu before select-all+delete — once the "new file" menu hadn't opened and cmd+a wiped `รหัส.gs` (undone before save).
- GAS project has a 200-version limit; old versions were pruned on 22 Oct 2026. Deleting versions = user does it (permanent delete).
- Easiest way to put a whole GAS file into the editor: push `gas/*.gs` to GitHub, then in the editor tab `await fetch('https://raw.githubusercontent.com/padubgdech/WORK/<commit>/gas/<file>')` and `pushEditOperations` it into the model (works, CORS ok).
- Easiest way to put code into the editor: Claude in Chrome `javascript_tool` → `monaco.editor.getModels()` (uri `file_N.js`) → `model.pushEditOperations(...)`, then cmd+s. No typing/indent problems. Reading code back through the tool gets blocked ("Cookie/query string data") — return booleans/line numbers instead.
- OAuth consent opens in a popup Claude can't control → ask Dech to click Allow.
- Frontend tests: headless Playwright with a mocked GAS (`script.google.com` route returning JSONP). Check phone width 390px (single column + bottom tab bar below 760px).
- Frontend architecture: JSONP `api()` for reads; `apiS()` = write queue with retry (localStorage `khum_pending_v1`); note sync; subtasks auto-load queue; `loadMainData()` (flag `USE_MAIN_DATA`).
