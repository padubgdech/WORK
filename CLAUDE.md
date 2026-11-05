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
  `note_html_<id>` + task arrays + pushNote). Paste = plain text. `renderPinned` skips while a pin note is focused (`_pinRenderLater`).
  Quick notes (4 Nov, Dech: "เพิ่ม tap note ใหม่" in the empty band space): `.pin-qadd` tile "+ Note ใหม่" → `pinQnNew` creates a
  `rudy_notes` entry with `main:true` (also shows in the Note tab) → `.pin-qn` sticky (light cream bg like the add tile, 3px top bar `--qc`; colour dots `PIN_QN_COLS` on hover/focus → `pinQnColor`, stored `n.bar`), editor `#pqn-<id>` autosave 800 ms
  (`pinQnInput`/`pinQnFlush`, noteSanitize), delete = 2-tap trash (`pinQnDel`, no confirm() in LINE). Band shows if pinned tasks OR
  quick notes exist; `showPage('main')` re-renders the band. (The earlier "+" inside the task note box was removed at his request.)
  Formatting (5 Nov): both pin editors show `pinToolbar()` while focused (B / I / U / 6 text colours `NRT_COLORS` / Tx) → `pinFmt`
  (execCommand, fires input → autosave; Tx with no selection turns formats off for what's typed next); `pinTbState` marks active B/I/U. Note: 21 of 25 active tasks had no date (Tasks backlog) — that's why pinning is an explicit checkbox,
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
- Note tab REBUILT as Notion-style (5 Nov, Dech chose mockup "แบบ 1" on the canvas page "Note แบบ Notion", NT1-Sidebar): `#nx`, all code
  prefixed `nx` (`nxRender`; `renderNotes()` now just calls it; old card functions kept as `renderNotesOld`, unused). Sidebar = sections
  (localStorage `rudy_nb_sec_v1`, seeded ทั่วไป `s_general` / KHUMTONE / STILL FOREST / PETZATO; ⋯ menu = rename, colour, 2-tap delete →
  pages move to ทั่วไป) with page tree (subpages via `parent`, max depth 5) + search. Pages ARE `rudy_notes` entries (+ `sec`, `parent`,
  `cover`, `font`), so Main quick notes and Rudy-chat notes show up under ทั่วไป. Page: cover colour, section icon, breadcrumb, sticky
  toolbar (font IBM Plex/Sarabun/Noto Serif Thai/Mitr per page, move section, B I U S, 6 text colours, highlight, Tx, + ตาราง, + เช็กลิสต์,
  2-tap ลบหน้า incl. subpages), title + body contenteditable, autosave 700 ms (`nxFlush`, `nxSanitize` allows tables/todo/nx-link).
  Slash menu (`nxSlashCheck`, `NX_BLOCKS`: table, todo, h2, h3, ul, ol, quote, hr, page) filtered by typed text, ↑↓ Enter Esc.
  Tables: floating `#nx-ttools` (+row/+col/del row/del col/del table) under the table; Tab moves cells (adds a row at the end).
  Resize (5 Nov): drag a cell's right edge = column width, bottom edge = row height (`nxEdge`, pointer events, 6px / 12px touch) →
  inline width+min-width / height px on cells (kept by `nxSanitize`). Header colour: `NX_HEAD` swatches in `#nx-ttools` → `nxTable('head',c)`.
  Todo = `ul.nx-todo > li[data-done]`, click the box to toggle. Subpage = `a.nx-link[data-page]` (text refreshed to the page title on render).
  Full-page (5 Nov, "ให้เต็มหน้า คล้ายแบบ 1"): `goTab` toggles `body.nx-full` → hides `#phdr`, no padding/border, `.nx` = 100vh − 60px.
  Format bar `#nx-tb` = floating dark bubble above a text selection on desktop (`nxBubble` on selectionchange), sticky row while
  typing on phone (+ ตาราง / + เช็กลิสต์ there). Page options moved to ⋯ (`nxOpts` → `#nx-opts`: font, section, cover, delete).
  New pages get cover `NX_COVERS[1]`. Phone: list view ↔ page view (`_nxMob`, back button). Test: scratchpad test_nx.py.
  More (5 Nov "ทำฟังชันต่อ"): markdown shortcuts at line start (`nxMdCheck`: # ## - * 1. [] > ---) · slash menu icons/groups (`NX_IC`, `g`)
  · status pills `span.nx-tag[data-c=y|g|b|r|p|n]` (`/สถานะ`, click → `#nx-tagpop` text/colour/presets/delete) · page icon `n.icon`
  (`NX_ICONS`, ⋯ menu) · favourites `n.fav` (☆ in the crumb row, "หน้าโปรด" list in sidebar) · fold children `n.fold` (`nxFold`) ·
  drag & drop rows `.nx-pgrow` (desktop HTML5 DnD: before/after a page = same parent, onto a section row = move to its root; order `n.ord`,
  `nxSortKids`) · trash localStorage `rudy_nb_trash_v1` [{note,at}] 30 days (`nxTrashAdd/nxRestore/nxPurge`, view `_nxView='trash'`;
  Main quick-note deletes go there too). Test: scratchpad test_nx3.py.
  Media/links/tasks (5 Nov): images `/รูป`, paste or drop → `nxUploadImage` (shrinkImage 1600 + existing `uploadImagePost` → Drive
  lh3 url; fallback data URL) → `img.nx-img` (sanitizer allows only lh3/drive or data:image src; dblclick halves width). Web links
  `a.nx-ext` (`nxLinkAsk` / bubble 🔗 / pasted URL; click → `#nx-linkpop` open/edit/remove). Checklist line → `#nx-todotool`
  "＋ ส่งเป็นงานใน Tasks" → `api addTask` (note "จาก Note: <page>") + `li[data-task]`. Reorder without drag: ⋯ ↑↓ for pages
  (`nxMovePage`) and sections (`nxSecMove`). Backup JSON download (`nxBackup`) / import-merge (`nxRestoreFile`, newer updatedAt wins).
  Test: scratchpad test_nx4.py.
  Cover/icon images (5 Nov "ให้สามารถเพื่มรูปได้"): cover hover buttons `.nx-cov-acts` (top-right) → `nxPickCover` (1800px → Drive) →
  `n.coverImg` + `n.coverPos` (0–100 %, "↕ จัดตำแหน่ง" = drag `#nx-cover.repos`); icon is a button → `#nx-iconpop` (upload `n.iconImg`
  256px, emoji `n.icon`, Aa = section initials). Phone format bar shows only while title/body focused (`.nx-tb.mob-on`). Test: test_nx5.py.
  SYNC (5 Nov): no new GAS — reuses note-html-sync `saveNoteHtml`/`getNoteHtml` as a key→text store (49k/key, newer ts wins).
  Keys: `nx__idx` = {pages:{id:ts}, dead:{id:ts} (60 d), secs, secsTs}, `nx_<pageId>` = page JSON (data: images stripped).
  `nxSync()`: read idx → merge with local (`rudy_nb_synced` = ids known at last sync → missing locally = deleted → dead) → push newer
  local pages → pull newer remote pages (skip the page being typed) → kill dead ones (into local trash) → write merged idx.
  `notesSave`/`nxSecsSave` are wrapped to call `nxSyncSoon(4s)`; also on load (+3.5 s), Note tab open, tab visible. Section seeding
  writes localStorage directly so a fresh device never overrides real sections (`rudy_nb_sec_ts`). Status button `#nx-sync` in the
  sidebar footer (click = sync now). Old GAS without noteHtml flag → `_nxSync.off`. Test: scratchpad test_sync.py (2 devices).
  Block drag (5 Nov): hover a top-level block in `#nx-body` → `#nx-grip` ⋮⋮ (desktop) → drag → `#nx-dropline`; `nxNormalizeTop` wraps loose
  text runs into divs first. Main quick notes: section `<select>` (`pinQnSec`). Rudy chat note search: AI type `find` (prompt rule) or
  chip `🔎 ค้น Note` (mode `find`, no AI) → `rcFindNotes` (title ×3, body ×1) → history item `{found:{q,total,items}}` → `rcOpenNote`. Test: test_nx6.py.
  Side peek (5 Nov, from Dech's Notion screenshot): clicking a subpage link/list item → `nxPeekOpen` (≥1100px; else full open) →
  `.nx-split`: left = parent read-only `nxStaticHtml` (`_nxPeek` = parent id), right = normal editor for the subpage + bar » (`nxPeekClose`)
  / ⤢ (`nxOpen` full). `nxOpen`/`nxBack` clear `_nxPeek`. Link/list/sidebar icons: `nxPgIcon` (emoji or `iconImg`) / `nxPgIcon2` (+doc icon);
  `a.nx-link` innerHTML rebuilt on render, sanitizer flattens it to text. Hover card `#nx-hover` (350 ms). Test: test_nx7.py.
  Image paste (5 Nov "control v วางรูป"): `nxClipImages(clipboardData)` (items kind=file, then files) used by `nxPaste` and `pinNotePaste`
  (pin task notes, quick notes, task-card `nta-` editor) → `pinPasteImage` (shrink 1280 → Drive → <img>, dispatches input → autosave).
  `noteSanitize` now keeps IMG with lh3/drive/data:image src. Copy/paste of an lh3 <img> between notes works via text/html. Test: test_paste.py.
  Drag fix (5 Nov "ทำไมการลากวาง page เป็นการ copy"): sidebar row drags use type `application/x-nx-page` (not text/plain); `#nx-body`
  ondragover/ondrop refuse page drags (`nxIsPageDrag`) so the browser never inserts a copy; `a.nx-link`/`a.nx-sublink` draggable=false
  and `nxBodyDragStart` blocks dragging links/tags inside the body. Test: test_dragcopy.py.
  Quick-note title (5 Nov "พิมเปลี่ยนชื่อ note ได้"): header "📝 NOTE" → input `.pin-qn-ttl#pqt-<id>` (= `n.title`, same as the Note-tab page
  title; autosave 700 ms/blur, Enter → body). Colour dots moved to the footer row `.pin-qn-ft` (next to หัวข้อ). Test: test_qnt.py.
  Roadmap / checklist for the Note page: `NOTE-CHECKLIST.md` (tick items there when done).
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
