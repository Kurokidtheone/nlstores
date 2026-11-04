// The daily job (07:00 UTC = 08:00 Algeria), run by the cron in worker.ts through
// POST /api/cron/daily, or by the "Run daily job now" button in admin.
import type { ReminderKind } from "./renewal";
import { syncStores, retrySheetQueue, type PostResult } from "./sheet-sync";
import { daysLeft, lifecycleOf, type Lifecycle } from "./store-state";

export type DailyReport = {
  ranAt: string;
  lifecycleChanges: { id: number; name: string; from: Lifecycle; to: Lifecycle }[];
  remindersCreated: number;
  toDelete: number;
  sheet: { retried: number; synced: number; result: PostResult | null };
};

/**
 * Which reminder a store should have today. Windows (not exact days) so a missed run or a store
 * created close to its end still gets the right reminder: 30 → 8 days, 7 → 1, 0 → -2, -3 → -59.
 */
export function reminderKindFor(days: number): ReminderKind | null {
  if (days <= 30 && days >= 8) return "d30";
  if (days <= 7 && days >= 1) return "d7";
  if (days <= 0 && days >= -2) return "d0";
  if (days <= -3 && days > -60) return "after3";
  return null;
}

type Row = { id: number; name: string; status: string; expires_at: string; lifecycle: Lifecycle };

export async function runDailyJob(db: D1Database, env: CloudflareEnv, now = Date.now()): Promise<DailyReport> {
  const { results: stores } = await db.prepare("SELECT id, name, status, expires_at, lifecycle FROM stores").all<Row>();

  // 1. Lifecycle: active -> grace -> expired (+7 d) -> to_delete (+60 d). Never deletes anything.
  const changes: DailyReport["lifecycleChanges"] = [];
  const writes: D1PreparedStatement[] = [];
  for (const s of stores) {
    const to = lifecycleOf(s.expires_at, now);
    if (to !== s.lifecycle) {
      changes.push({ id: s.id, name: s.name, from: s.lifecycle, to });
      writes.push(db.prepare("UPDATE stores SET lifecycle = ? WHERE id = ?").bind(to, s.id));
    }
  }

  // 2. Reminders (not for suspended stores). One per kind and subscription period; a newer one
  //    replaces an older one not sent yet; reminders of a previous period are dropped.
  const inserts = new Set<D1PreparedStatement>();
  for (const s of stores) {
    writes.push(
      db.prepare("UPDATE renewal_reminders SET status = 'skipped' WHERE store_id = ? AND status = 'pending' AND expires_at != ?").bind(s.id, s.expires_at),
    );
    if (s.status === "suspended") continue;
    const kind = reminderKindFor(daysLeft(s.expires_at, now));
    if (!kind) continue;
    const insert = db.prepare("INSERT OR IGNORE INTO renewal_reminders (store_id, kind, expires_at) VALUES (?, ?, ?)").bind(s.id, kind, s.expires_at);
    inserts.add(insert);
    writes.push(
      insert,
      db
        .prepare("UPDATE renewal_reminders SET status = 'skipped' WHERE store_id = ? AND expires_at = ? AND status = 'pending' AND kind != ?")
        .bind(s.id, s.expires_at, kind),
    );
  }
  let created = 0; // new reminders only (INSERT OR IGNORE keeps one per kind and period)
  for (let i = 0; i < writes.length; i += 50) {
    const chunk = writes.slice(i, i + 50);
    const res = await db.batch(chunk);
    chunk.forEach((stmt, j) => inserts.has(stmt) && (created += res[j].meta.changes ?? 0));
  }

  // 3. Sheet: retry the queue, then sync every store whose status changed
  const retry = await retrySheetQueue(db, env);
  const changed = changes.map((c) => c.id);
  const synced = changed.length ? await syncStores(db, env, changed) : null;

  const report: DailyReport = {
    ranAt: new Date(now).toISOString(),
    lifecycleChanges: changes,
    remindersCreated: created,
    toDelete: stores.filter((s) => lifecycleOf(s.expires_at, now) === "to_delete").length,
    sheet: { retried: retry.retried, synced: changed.length, result: synced ?? (retry.retried ? retry.result : null) },
  };
  await db
    .prepare("INSERT INTO admin_log (action, detail) VALUES ('daily_job', ?)")
    .bind(JSON.stringify({ changes: changes.length, reminders: report.remindersCreated, toDelete: report.toDelete, sheet: report.sheet.result?.ok ?? null }))
    .run();
  return report;
}
