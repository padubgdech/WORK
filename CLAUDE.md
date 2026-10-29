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
- **Data:** Notion database (Tasks), properties: Task (title), Priority, Status, Action Date, End Date, Note, Repeat (planned).
- `gas/*.gs` in this repo = copies of the files added to the GAS project (keep in sync).

## GAS files added by Claude (already installed)
- `note-html-sync.gs` — note HTML sync to a Google Sheet (`saveNoteHtml`/`getNoteHtml`). Hook: first lines of `doGet`.
- `dashboard-upload.gs` — note images → Drive folder "KHUMTONE Dashboard Images" (POST `?action=uploadImage`, hook first lines of `doPost`) + `dashboardDateProps_` used by `moveTask`/`setTaskDate` to update End Date.
- `dashboard-extra.gs` — `getMainData` (one request: today + overdue + events + subtasks via `fetchAll`) and recurring tasks
  (Notion "Repeat" select Daily/Weekly/Monthly; marking a repeat task Done creates the next one; dedupe via Script Properties `rep_<id>_<date>`).
  Hook: `doGet` line after `if (nh) return nh;` → `var ex = handleDashboardExtra_(e); if (ex) return ex;`.
  Installed 29 Oct 2026, `setupRepeatProperty` run (property created), dashboard deployment = version 192. `USE_MAIN_DATA=true` in index.html.
- Scopes added in appsscript.json: spreadsheets, drive (user authorized).

## Pending
1. Security (not started): GAS web app is ANYONE_ANONYMOUS and its URL is public → anyone can edit/delete tasks. Plan: verify LIFF ID token / userId in GAS. Tokens (LINE/Notion/Gemini) are hard-coded in `รหัส.gs` CONFIG → rotate and move to Script Properties.
2. Separate HR/employee app: profile "แก้ไขข้อมูล" opens the first-login modal (only "ออกจากระบบ", no ✕, save button stuck on "กำลังบันทึก..."). Location of that code unknown — ask Dech.

## Working notes (learned the hard way)
- Dech's machine is a **Mac**: in the Apps Script editor use `cmd+…` (cmd+a, cmd+z, cmd+f, cmd+s). Ctrl shortcuts get typed as text.
- Typing into the Monaco editor: write code with **no leading indentation** and **no `/* */` block comments** (auto-indent/doc-comment completion corrupt it). Keys like `Page_Down` may get typed literally — scroll with the mouse or jump with cmd+f instead.
- Always screenshot after creating a file/clicking a menu before select-all+delete — once the "new file" menu hadn't opened and cmd+a wiped `รหัส.gs` (undone before save).
- GAS project has a 200-version limit; old versions were pruned on 22 Oct 2026. Deleting versions = user does it (permanent delete).
- Easiest way to put code into the editor: Claude in Chrome `javascript_tool` → `monaco.editor.getModels()` (uri `file_N.js`) → `model.pushEditOperations(...)`, then cmd+s. No typing/indent problems. Reading code back through the tool gets blocked ("Cookie/query string data") — return booleans/line numbers instead.
- OAuth consent opens in a popup Claude can't control → ask Dech to click Allow.
- Frontend tests: headless Playwright with a mocked GAS (`script.google.com` route returning JSONP). Check phone width 390px (single column + bottom tab bar below 760px).
- Frontend architecture: JSONP `api()` for reads; `apiS()` = write queue with retry (localStorage `khum_pending_v1`); note sync; subtasks auto-load queue; `loadMainData()` (flag `USE_MAIN_DATA`).
