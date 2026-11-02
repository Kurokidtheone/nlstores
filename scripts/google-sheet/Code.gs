/**
 * NEXT LEVEL STORES — Google Sheet sync (one row per store, kept up to date by the platform)
 *
 * ─── SETUP (once, about 5 minutes) ───────────────────────────────────────────────────────────
 * 1. Open your Google Sheet → menu Extensions → Apps Script.
 * 2. Delete the example code, paste THIS whole file, click 💾 (Save project).
 * 3. Line 34 below: replace CHANGE-ME with a long secret (30+ letters and numbers, e.g. from a
 *    password generator). Click 💾 again. Keep this secret: you paste it in Cloudflare at step 6.
 * 4. At the top, in the function list choose "setup" → click ▶ Run.
 *    Google asks for permission: Review permissions → choose your account → "Advanced" →
 *    "Go to … (unsafe)" → Allow. (It is your own script.)
 *    The tab "Boutiques" now has its header, date formats and colors.
 * 5. Top right: Deploy → New deployment → ⚙️ (Select type) → Web app.
 *      Description:     Next Level sync
 *      Execute as:      Me
 *      Who has access:  Anyone
 *    → Deploy (authorize again if asked) → copy the "Web app URL" (it ends with /exec).
 *    Check: open that URL in your browser, it must say "OK".
 * 6. Cloudflare → Workers & Pages → nl-stores → Settings → Variables and Secrets → + Add,
 *    type Secret:  SHEET_WEBHOOK_URL = the URL of step 5
 *                  SHEET_SECRET      = the secret of step 3
 *    → Deploy.
 * 7. Admin (admin.<your domain>) → Aujourd'hui → Google Sheet → "Tout synchroniser".
 *    Every store appears; after that the sheet updates itself.
 *
 * ─── AFTER EDITING THIS SCRIPT ───────────────────────────────────────────────────────────────
 * Deploy → Manage deployments → ✏️ (Edit) → Version: "New version" → Deploy.
 * The URL stays the same, nothing to change in Cloudflare.
 *
 * Do not rename or reorder the header row by hand: the platform writes the columns in this order.
 * "Days left" is a formula (End date − TODAY()), so it counts down by itself every day.
 */

const SHEET_SECRET = "CHANGE-ME";
const SHEET_NAME = "Boutiques";

const COLUMNS = [
  "Store ID", "Store name", "Client name", "Phone", "Wilaya", "Design", "Plan", "Store URL", "Custom domain",
  "Start date", "End date", "Days left", "Status", "Total paid (DA)", "Last payment date", "Payment method", "Request ID", "Last update",
];
const COL = (name) => COLUMNS.indexOf(name) + 1; // 1-based column number
const DATE_COLUMNS = ["Start date", "End date", "Last payment date"];
const END_LETTER = String.fromCharCode(64 + COL("End date")); // "K"
const DAYS_LETTER = String.fromCharCode(64 + COL("Days left")); // "L"

/** Called by the platform: { secret, columns, rows: [[...18 values], ...] } -> upsert by Store ID */
function doPost(e) {
  let body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return json_({ ok: false, error: "bad json" });
  }
  if (!SHEET_SECRET || SHEET_SECRET === "CHANGE-ME" || body.secret !== SHEET_SECRET) {
    return json_({ ok: false, error: "unauthorized (secret)" });
  }
  if (body.columns && body.columns.join("|") !== COLUMNS.join("|")) {
    return json_({ ok: false, error: "columns changed: paste the new Code.gs" });
  }
  const rows = Array.isArray(body.rows) ? body.rows : [];

  // One writer at a time: two calls at once can never append the same store twice
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) return json_({ ok: false, error: "busy, retry later" });
  try {
    const sheet = getSheet_();
    const last = sheet.getLastRow();
    const ids = last > 1 ? sheet.getRange(2, 1, last - 1, 1).getValues() : [];
    const rowOf = {};
    ids.forEach(function (r, i) {
      if (r[0] !== "" && r[0] !== null) rowOf[String(r[0])] = i + 2;
    });
    let updated = 0;
    let appended = 0;
    rows.forEach(function (raw) {
      const values = toValues_(raw);
      const id = String(values[0]);
      let n = rowOf[id];
      if (n) {
        updated++;
      } else {
        n = sheet.getLastRow() + 1;
        rowOf[id] = n;
        appended++;
      }
      sheet.getRange(n, 1, 1, COLUMNS.length).setValues([values]);
      // Formulas always use English syntax in Apps Script (commas), whatever the sheet language
      sheet.getRange(n, COL("Days left")).setFormula("=IF(" + END_LETTER + n + '="","",' + END_LETTER + n + "-TODAY())");
    });
    SpreadsheetApp.flush();
    return json_({ ok: true, updated: updated, appended: appended });
  } finally {
    lock.releaseLock();
  }
}

/** Open the Web app URL in a browser to check it works */
function doGet() {
  return ContentService.createTextOutput("OK — Next Level Stores sync is installed");
}

/** Run once from the editor (▶ Run): header, frozen row, formats, colors on Days left */
function setup() {
  const sheet = getSheet_();
  const header = sheet.getRange(1, 1, 1, COLUMNS.length);
  header.setValues([COLUMNS]).setFontWeight("bold").setBackground("#111827").setFontColor("#ffffff");
  sheet.setFrozenRows(1);

  const body = function (name) {
    return sheet.getRange(2, COL(name), sheet.getMaxRows() - 1, 1);
  };
  DATE_COLUMNS.forEach(function (name) {
    body(name).setNumberFormat("dd/mm/yyyy");
  });
  body("Last update").setNumberFormat("dd/mm/yyyy hh:mm");
  body("Total paid (DA)").setNumberFormat("#,##0");
  body("Days left").setNumberFormat("0").setHorizontalAlignment("center");

  // Days left: grey = expired (< 0), red = under 8 days, orange = under 31 days
  const range = body("Days left");
  const cell = DAYS_LETTER + "2";
  const ours = [
    SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied("=AND(" + cell + '<>"",' + cell + "<0)")
      .setBackground("#d1d5db").setFontColor("#4b5563").setRanges([range]).build(),
    SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied("=AND(" + cell + '<>"",' + cell + ">=0," + cell + "<8)")
      .setBackground("#fecaca").setFontColor("#991b1b").setRanges([range]).build(),
    SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied("=AND(" + cell + '<>"",' + cell + ">=8," + cell + "<31)")
      .setBackground("#fed7aa").setFontColor("#9a3412").setRanges([range]).build(),
  ];
  // Keep rules you added on other columns, replace ours
  const others = sheet.getConditionalFormatRules().filter(function (rule) {
    return !rule.getRanges().some(function (r) {
      return r.getColumn() === COL("Days left");
    });
  });
  sheet.setConditionalFormatRules(others.concat(ours));
  sheet.autoResizeColumns(1, COLUMNS.length);
}

// ─── helpers ─────────────────────────────────────────────────────────────────────────────────

function getSheet_() {
  const book = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = book.getSheetByName(SHEET_NAME);
  if (!sheet) {
    // First run: reuse an empty first tab, else add one
    const first = book.getSheets()[0];
    sheet = first && first.getLastRow() === 0 ? first.setName(SHEET_NAME) : book.insertSheet(SHEET_NAME);
  }
  if (sheet.getLastRow() === 0) sheet.getRange(1, 1, 1, COLUMNS.length).setValues([COLUMNS]);
  return sheet;
}

/** "2027-11-02" -> Date; "2027-11-02 08:15" -> Date with time; anything else unchanged */
function toValues_(raw) {
  const values = COLUMNS.map(function (_, i) {
    return raw[i] === undefined || raw[i] === null ? "" : raw[i];
  });
  DATE_COLUMNS.concat(["Last update"]).forEach(function (name) {
    const i = COL(name) - 1;
    const m = /^(\d{4})-(\d{2})-(\d{2})(?: (\d{2}):(\d{2}))?$/.exec(String(values[i]));
    if (m) values[i] = new Date(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0));
  });
  values[COL("Days left") - 1] = ""; // replaced by the formula
  values[COL("Phone") - 1] = "'" + String(values[COL("Phone") - 1]).replace(/^'/, ""); // text: keep the leading 0
  return values;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
