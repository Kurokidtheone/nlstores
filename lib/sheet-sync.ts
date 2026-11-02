// Google Sheet sync: one row per store, upserted by Store ID by scripts/google-sheet/Code.gs.
// A sync NEVER blocks an action: it runs after the response (waitUntil) and a failure only
// lands in sheet_sync_queue, retried by the daily job and the admin buttons.
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getDesign } from "@/designs/registry";
import { wilayaName } from "./algeria/wilayas";
import { PLANS } from "./plans";
import { algeriaDate, lifecycleOf } from "./store-state";

/** Exact column order of the sheet (Code.gs writes the Days left formula itself) */
export const SHEET_COLUMNS = [
  "Store ID", "Store name", "Client name", "Phone", "Wilaya", "Design", "Plan", "Store URL", "Custom domain",
  "Start date", "End date", "Days left", "Status", "Total paid (DA)", "Last payment date", "Payment method", "Request ID", "Last update",
] as const;
export const DAYS_LEFT_COL = SHEET_COLUMNS.indexOf("Days left");

export type SheetRow = (string | number)[];

const METHOD: Record<string, string> = { ccp: "CCP", baridimob: "BaridiMob", chargily: "Chargily", cash: "Espèces" };
const DOMAIN_STATUS: Record<string, string> = { active: "actif", pending: "en attente", to_retry: "à réessayer" };
const STATUS: Record<string, string> = { active: "Active", grace: "Grâce", expired: "Expirée", to_delete: "À supprimer" };

type Raw = {
  id: number; name: string; owner_name: string; owner_phone: string; owner_wilaya: number | null; design: string; slug: string;
  status: string; expires_at: string; created_at: string; request_ref: string | null;
  custom_domain: string | null; custom_status: string | null; first_start: string | null;
  total_paid: number; last_pay_date: string | null; last_pay_method: string | null;
};

const SELECT = `
  SELECT s.id, s.name, s.owner_name, s.owner_phone, s.owner_wilaya, s.design, s.slug, s.status, s.expires_at, s.created_at, s.request_ref,
    (SELECT hostname FROM domains WHERE store_id = s.id AND kind = 'custom' LIMIT 1) AS custom_domain,
    (SELECT status FROM domains WHERE store_id = s.id AND kind = 'custom' LIMIT 1) AS custom_status,
    (SELECT MIN(period_start) FROM payments WHERE store_id = s.id) AS first_start,
    (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE store_id = s.id) AS total_paid,
    (SELECT created_at FROM payments WHERE store_id = s.id ORDER BY created_at DESC, id DESC LIMIT 1) AS last_pay_date,
    (SELECT method FROM payments WHERE store_id = s.id ORDER BY created_at DESC, id DESC LIMIT 1) AS last_pay_method
  FROM stores s`;

/** SQLite "YYYY-MM-DD HH:MM:SS" (UTC) or ISO -> epoch ms */
const toMs = (d: string) => Date.parse(d.includes("T") ? d : `${d.replace(" ", "T")}Z`);

function toRow(r: Raw, rootDomain: string, now: number): SheetRow {
  const status = r.status === "suspended" ? "Suspendue" : STATUS[lifecycleOf(r.expires_at, now)];
  const updated = new Date(now + 3_600_000).toISOString().slice(0, 16).replace("T", " "); // Algeria time
  return [
    r.id,
    r.name,
    r.owner_name,
    r.owner_phone,
    r.owner_wilaya ? wilayaName(r.owner_wilaya, "fr") : "",
    getDesign(r.design).name,
    r.custom_domain ? PLANS.custom_domain.fr : PLANS.standard.fr,
    `https://${r.slug}.${rootDomain}`,
    r.custom_domain ? `${r.custom_domain} (${DOMAIN_STATUS[r.custom_status ?? ""] ?? r.custom_status})` : "",
    algeriaDate(toMs(r.first_start ?? r.created_at)),
    algeriaDate(toMs(r.expires_at)),
    "", // Days left: formula in the sheet
    status,
    r.total_paid,
    r.last_pay_date ? algeriaDate(toMs(r.last_pay_date)) : "",
    r.last_pay_method ? (METHOD[r.last_pay_method] ?? r.last_pay_method) : "",
    r.request_ref ?? "",
    updated,
  ];
}

/** Rows for some stores, or all stores when storeIds is omitted */
export async function buildSheetRows(db: D1Database, env: CloudflareEnv, storeIds?: number[], now = Date.now()): Promise<SheetRow[]> {
  const raws: Raw[] = [];
  if (!storeIds) {
    raws.push(...(await db.prepare(`${SELECT} ORDER BY s.id`).all<Raw>()).results);
  } else {
    const ids = [...new Set(storeIds)].filter(Number.isInteger);
    for (let i = 0; i < ids.length; i += 90) {
      const chunk = ids.slice(i, i + 90);
      raws.push(...(await db.prepare(`${SELECT} WHERE s.id IN (${chunk.map(() => "?").join(",")})`).bind(...chunk).all<Raw>()).results);
    }
  }
  return raws.map((r) => toRow(r, env.ROOT_DOMAIN, now));
}

export const sheetConfigured = (env: CloudflareEnv) => !!(env.SHEET_WEBHOOK_URL && env.SHEET_SECRET);

export type PostResult = { ok: true } | { ok: false; skipped?: boolean; error: string };

/** POST rows to the Apps Script. Any 2xx/3xx is a success, unless the script answers ok:false. */
export async function postRows(env: CloudflareEnv, rows: SheetRow[]): Promise<PostResult> {
  if (!sheetConfigured(env)) return { ok: false, skipped: true, error: "Google Sheet non connecté (SHEET_WEBHOOK_URL / SHEET_SECRET)" };
  if (rows.length === 0) return { ok: true };
  try {
    for (let i = 0; i < rows.length; i += 200) {
      const res = await fetch(env.SHEET_WEBHOOK_URL!, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret: env.SHEET_SECRET, columns: SHEET_COLUMNS, rows: rows.slice(i, i + 200) }),
        redirect: "follow", // Apps Script answers 302 -> the JSON result
        signal: AbortSignal.timeout(15_000),
      });
      if (res.status < 200 || res.status >= 400) return { ok: false, error: `HTTP ${res.status}` };
      const body = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (body && body.ok === false) return { ok: false, error: `Apps Script : ${body.error ?? "refusé"}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e).slice(0, 300) };
  }
}

async function enqueue(db: D1Database, storeIds: number[], error: string) {
  if (!storeIds.length) return;
  await db.batch(
    storeIds.map((id) =>
      db
        .prepare(
          `INSERT INTO sheet_sync_queue (store_id, last_error) VALUES (?, ?)
           ON CONFLICT (store_id) DO UPDATE SET attempts = attempts + 1, last_error = excluded.last_error,
             next_attempt_at = datetime('now', '+' || MIN(attempts + 1, 24) || ' hours'), updated_at = datetime('now')`,
        )
        .bind(id, error.slice(0, 300)),
    ),
  );
}

/** Sync these stores now. Never throws: a failure is queued for later. */
export async function syncStores(db: D1Database, env: CloudflareEnv, storeIds: number[]): Promise<PostResult> {
  const ids = [...new Set(storeIds)];
  if (!ids.length) return { ok: true };
  try {
    const res = await postRows(env, await buildSheetRows(db, env, ids));
    if (res.ok) {
      await db.prepare(`DELETE FROM sheet_sync_queue WHERE store_id IN (${ids.map(() => "?").join(",")})`).bind(...ids).run();
    } else if (!res.skipped) {
      await enqueue(db, ids, res.error);
    }
    return res;
  } catch (e) {
    await enqueue(db, ids, String(e)).catch(() => {});
    return { ok: false, error: String(e) };
  }
}

export async function syncStoreToSheet(db: D1Database, env: CloudflareEnv, storeId: number): Promise<PostResult> {
  return syncStores(db, env, [storeId]);
}

/** For actions: sync after the response is sent, so the action is never slowed down or blocked */
export async function scheduleSheetSync(...storeIds: number[]): Promise<void> {
  try {
    const { env, ctx } = await getCloudflareContext({ async: true });
    const p = syncStores(env.DB, env as CloudflareEnv, storeIds).catch(() => undefined);
    if (ctx && typeof ctx.waitUntil === "function") ctx.waitUntil(p);
  } catch {
    // never block the caller
  }
}

/** Sends the queued stores again (all of them with force, else only those due) */
export async function retrySheetQueue(db: D1Database, env: CloudflareEnv, force = false): Promise<{ retried: number; result: PostResult }> {
  const { results } = await db
    .prepare(`SELECT store_id FROM sheet_sync_queue ${force ? "" : "WHERE next_attempt_at <= datetime('now')"}`)
    .all<{ store_id: number }>();
  const ids = results.map((r) => r.store_id);
  // Stores deleted since: drop them from the queue
  const existing = ids.length ? await buildSheetRows(db, env, ids) : [];
  const alive = existing.map((r) => Number(r[0]));
  const gone = ids.filter((id) => !alive.includes(id));
  if (gone.length) await db.prepare(`DELETE FROM sheet_sync_queue WHERE store_id IN (${gone.map(() => "?").join(",")})`).bind(...gone).run();
  return { retried: alive.length, result: await syncStores(db, env, alive) };
}

/** Everything at once: first setup and repair. On success the queue is emptied. */
export async function syncAllStores(db: D1Database, env: CloudflareEnv): Promise<PostResult & { count: number }> {
  const rows = await buildSheetRows(db, env);
  const res = await postRows(env, rows);
  const ids = rows.map((r) => Number(r[0]));
  if (res.ok) await db.prepare("DELETE FROM sheet_sync_queue").run();
  else if (!res.skipped) await enqueue(db, ids, res.error);
  return { ...res, count: rows.length };
}
