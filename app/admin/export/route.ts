// Backup of the Google Sheet: same columns, as CSV (UTF-8 with BOM so Excel shows Arabic correctly).
// Route /export on the admin host (a path with a dot would skip the middleware).
import { buildSheetRows, DAYS_LEFT_COL, SHEET_COLUMNS } from "@/lib/sheet-sync";
import { algeriaDate, daysLeft } from "@/lib/store-state";
import { requireAdmin } from "@/lib/tenant";

const cell = (v: string | number) => {
  const s = String(v ?? "");
  return /[",\n\r;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export async function GET() {
  const { db, env } = await requireAdmin();
  const rows = await buildSheetRows(db, env);
  const endCol = SHEET_COLUMNS.indexOf("End date");
  for (const r of rows) r[DAYS_LEFT_COL] = daysLeft(`${r[endCol]}T12:00:00Z`); // the sheet uses a formula; the CSV gets the value
  const csv = "﻿" + [SHEET_COLUMNS as readonly string[], ...rows].map((r) => r.map(cell).join(",")).join("\r\n") + "\r\n";
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="boutiques-${algeriaDate(Date.now())}.csv"`,
      "cache-control": "no-store",
    },
  });
}
