"use server";
// Owner panel actions. Every action (except login) starts with requireAdmin().
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { getTemplate } from "@/designs/templates";
import { deliveryRows } from "@/designs/shared/template-base";
import { ADMIN_COOKIE, endSession, hashPassword, safeEqual, startSession } from "@/lib/auth";
import { createCustomHostname, getCustomHostname } from "@/lib/cloudflare-domains";
import { getEnv } from "@/lib/db";
import { slugProblem, validateNewStore, type Errors } from "@/lib/onboarding";
import { temporaryPassword } from "@/lib/password";
import { plusOneYear } from "@/lib/plans";
import { DEFAULT_POLICY } from "@/lib/policy";
import { slugify } from "@/lib/products";
import { currentHost, requireAdmin } from "@/lib/tenant";
import type { Lang, Msg } from "@/lib/types";
import { publicUrl } from "@/lib/urls";
import { welcomeMessage } from "@/lib/welcome";
import { runDailyJob, type DailyReport } from "@/lib/daily-job";
import { PAYMENT_METHODS } from "@/lib/plans";
import { RECEIPT_KEY_RE } from "@/lib/onboarding";
import { thankYouMessage } from "@/lib/renewal";
import { buildSheetRows, postRows, retrySheetQueue, scheduleSheetSync, syncAllStores, type PostResult } from "@/lib/sheet-sync";
import { lifecycleOf } from "@/lib/store-state";
import { toInt } from "@/lib/products";

export type AdminState = { error?: Msg; ok?: string };

export async function adminLogin(_prev: AdminState, form: FormData): Promise<AdminState> {
  const env = await getEnv();
  if ((await currentHost()) !== env.ADMIN_HOST) notFound();
  const password = String(form.get("password") ?? "");
  if (!env.ADMIN_PASSWORD || !safeEqual(password, env.ADMIN_PASSWORD)) return { error: { fr: "Mot de passe incorrect", ar: "كلمة السر غير صحيحة" } };
  await startSession(ADMIN_COOKIE, { role: "admin" });
  redirect("/");
}

export async function adminLogout() {
  await endSession(ADMIN_COOKIE);
  redirect("/login");
}

// ---------------------------------------------------------------- slug check (live, while typing)

export type SlugCheck = { slug: string; available: boolean; reason?: string };

export async function checkSlug(raw: string): Promise<SlugCheck> {
  const { db, env } = await requireAdmin();
  const slug = String(raw ?? "").trim().toLowerCase();
  const problem = slugProblem(slug);
  if (problem) return { slug, available: false, reason: problem };
  const taken = await db
    .prepare("SELECT 1 FROM stores WHERE slug = ? UNION SELECT 1 FROM domains WHERE hostname = ?")
    .bind(slug, `${slug}.${env.ROOT_DOMAIN}`)
    .first();
  return taken ? { slug, available: false, reason: "Déjà pris" } : { slug, available: true };
}

// ---------------------------------------------------------------- welcome message

export type Welcome = {
  storeId: number;
  lang: Lang;
  phone: string;
  storeUrl: string;
  message: string;
  domain: { hostname: string; status: string; error: string | null } | null;
};

async function buildWelcome(db: D1Database, env: CloudflareEnv, storeId: number, password: string): Promise<Welcome> {
  const store = await db
    .prepare("SELECT id, name, lang, owner_name, owner_phone, expires_at FROM stores WHERE id = ?")
    .bind(storeId)
    .first<{ id: number; name: string; lang: Lang; owner_name: string; owner_phone: string; expires_at: string }>();
  if (!store) throw new Error("store not found");
  const { results: domains } = await db
    .prepare("SELECT hostname, kind, status, last_error FROM domains WHERE store_id = ?")
    .bind(storeId)
    .all<{ hostname: string; kind: string; status: string; last_error: string | null }>();
  const sub = domains.find((d) => d.kind === "subdomain")!;
  const custom = domains.find((d) => d.kind === "custom") ?? null;
  const base = await publicUrl(sub.hostname, "");
  const message = welcomeMessage({
    lang: store.lang,
    ownerName: store.owner_name || store.name,
    storeName: store.name,
    storeUrl: `${base}/`,
    dashboardUrl: `${base}/dashboard`,
    helpUrl: `${base}/dashboard/help`,
    phone: store.owner_phone,
    password,
    renewalDate: store.expires_at,
    customDomain: custom?.hostname,
    cnameTarget: `stores.${env.ROOT_DOMAIN}`,
  });
  return {
    storeId,
    lang: store.lang,
    phone: store.owner_phone,
    storeUrl: `${base}/`,
    message,
    domain: custom ? { hostname: custom.hostname, status: custom.status, error: custom.last_error } : null,
  };
}

// ---------------------------------------------------------------- create and go live

export type CreateResult = { ok: true; welcome: Welcome } | { ok: false; errors: Errors };

/**
 * Creates everything in ONE D1 batch (a transaction: all or nothing): store, subdomain,
 * custom domain row, template texts, products, 69 delivery prices, payment, admin_log.
 * Product photos are copied to stores/<id>/ before the batch and removed again if it fails.
 * The Cloudflare custom-hostname call comes last: if it fails, the domain is only flagged "to_retry".
 */
export async function createStoreFull(input: unknown): Promise<CreateResult> {
  const { db, env } = await requireAdmin();
  const v = validateNewStore(input, env.ROOT_DOMAIN);
  if (!v.ok) return v;
  const { client, store, payment, products } = v.value;

  const subdomain = `${store.slug}.${env.ROOT_DOMAIN}`;
  const taken = await db
    .prepare("SELECT 1 FROM stores WHERE slug = ? UNION SELECT 1 FROM domains WHERE hostname IN (?, ?)")
    .bind(store.slug, subdomain, store.custom_domain ?? subdomain)
    .first();
  if (taken) return { ok: false, errors: { "store.slug": "Sous-domaine ou domaine déjà utilisé" } };

  // Reserve the next id so photo keys can be stores/<id>/... before anything is written
  const next = await db
    .prepare("SELECT MAX(COALESCE((SELECT seq FROM sqlite_sequence WHERE name = 'stores'), 0), COALESCE((SELECT MAX(id) FROM stores), 0)) + 1 AS id")
    .first<{ id: number }>();
  const storeId = next!.id;

  const bucket = env.MEDIA;
  const copied: string[] = [];
  const photoMap = new Map<string, string>();
  try {
    for (const key of products.flatMap((p) => p.photos)) {
      const obj = await bucket.get(key);
      if (!obj) throw new Error("une photo a expiré, renvoyez-la");
      const dest = `stores/${storeId}/${crypto.randomUUID()}.${key.split(".").pop()}`;
      await bucket.put(dest, await obj.arrayBuffer(), { httpMetadata: obj.httpMetadata });
      copied.push(dest);
      photoMap.set(key, dest);
    }
  } catch (e) {
    if (copied.length) await bucket.delete(copied);
    return { ok: false, errors: { form: `Copie des photos impossible : ${String(e)}` } };
  }

  const t = getTemplate(store.design);
  const lang = store.lang;
  const password = temporaryPassword();
  const expires = plusOneYear(payment.start);
  // Template policy identical to the default text -> NULL, so it keeps following the store language
  const policy = t.policy[lang] === DEFAULT_POLICY[lang] ? null : t.policy[lang];

  // Products: the quick products, or the design's sample product
  type Row = { slug: string; name: string; description: string; price: number; old: number | null; images: string[]; variants: unknown[]; sections: unknown; sample: 0 | 1 };
  const rows: Row[] = [];
  if (products.length) {
    const used = new Set<string>();
    products.forEach((p, i) => {
      let slug = slugify(p.name) || `produit-${i + 1}`;
      for (let n = 2; used.has(slug); n++) slug = `${slugify(p.name) || "produit"}-${n}`;
      used.add(slug);
      rows.push({
        slug, name: p.name, description: "", price: p.price, old: p.old_price,
        images: p.photos.map((k) => photoMap.get(k)!), variants: [],
        sections: { benefits: [], steps: [], reviews: [], faq: t.faq[lang], hide: [] }, sample: 0,
      });
    });
  } else {
    const s = t.sample[lang];
    rows.push({
      slug: s.slug, name: s.name, description: s.description, price: s.price, old: s.old_price, images: [], variants: s.variants,
      sections: { benefits: s.benefits, steps: s.steps, reviews: [], faq: t.faq[lang], hide: [] }, sample: 1,
    });
  }

  // 69 delivery prices in one statement (our own integers, inlined: D1 allows max 100 bound params)
  const delivery = deliveryRows(t.delivery);
  if (!delivery.every((d) => [d.wilaya, d.home, d.desk].every(Number.isInteger))) throw new Error("bad delivery template");
  const deliverySql = `INSERT INTO delivery_prices (store_id, wilaya, home_price, desk_price) VALUES ${delivery
    .map((d) => `(${storeId}, ${d.wilaya}, ${d.home}, ${d.desk})`)
    .join(", ")}`;

  try {
    await db.batch([
      db
        .prepare(
          `INSERT INTO stores (id, slug, name, lang, design, primary_color, accent_color, whatsapp, owner_name, owner_phone, password_hash,
                               expires_at, must_change_password, announcement, announcement_on, policy, owner_wilaya, facebook_url, request_ref)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, 1, ?, ?, ?, ?)`,
        )
        .bind(
          storeId, store.slug, store.name, lang, store.design, t.colors.primary, t.colors.accent, client.phone, client.name, client.phone,
          await hashPassword(password), expires, t.announcement[lang], policy, client.wilaya, client.facebook, client.request_ref,
        ),
      db.prepare("INSERT INTO domains (hostname, store_id, kind, status) VALUES (?, ?, 'subdomain', 'active')").bind(subdomain, storeId),
      ...(store.custom_domain
        ? [db.prepare("INSERT INTO domains (hostname, store_id, kind, status) VALUES (?, ?, 'custom', 'pending')").bind(store.custom_domain, storeId)]
        : []),
      db.prepare(deliverySql),
      ...rows.map((r, i) =>
        db
          .prepare(
            `INSERT INTO products (store_id, slug, name, description, price, old_price, images, variants, sections, visible, sort, is_sample)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
          )
          .bind(storeId, r.slug, r.name, r.description, r.price, r.old, JSON.stringify(r.images), JSON.stringify(r.variants), JSON.stringify(r.sections), i, r.sample),
      ),
      db
        .prepare("INSERT INTO payments (store_id, amount, method, receipt_key, reference, period_start, period_end) VALUES (?, ?, ?, ?, ?, ?, ?)")
        .bind(storeId, payment.amount, payment.method, payment.receipt_key, client.request_ref, `${payment.start}T00:00:00.000Z`, expires),
      db
        .prepare("INSERT INTO admin_log (action, store_id, detail) VALUES ('create_store', ?, ?)")
        .bind(storeId, JSON.stringify({ design: store.design, lang, request_ref: client.request_ref, products: rows.length, sample: rows[0].sample === 1 })),
    ]);
  } catch (e) {
    // Nothing was written (D1 batch = transaction): remove the copied photos too
    if (copied.length) await bucket.delete(copied).catch(() => {});
    const msg = String(e);
    return {
      ok: false,
      errors: { form: msg.includes("UNIQUE") ? "Ce sous-domaine, ce domaine ou cet identifiant vient d'être pris : réessayez." : `Création impossible, rien n'a été créé. (${msg.slice(0, 200)})` },
    };
  }

  // Store is live. Clean the staging copies, then the Cloudflare call (may fail -> "to retry")
  const staging = products.flatMap((p) => p.photos);
  if (staging.length) await bucket.delete(staging).catch(() => {});
  if (store.custom_domain) await registerCustomDomain(db, env, store.custom_domain);
  await scheduleSheetSync(storeId);

  revalidatePath("/admin");
  return { ok: true, welcome: await buildWelcome(db, env, storeId, password) };
}

async function registerCustomDomain(db: D1Database, env: CloudflareEnv, hostname: string) {
  const cf = await createCustomHostname(env, hostname).catch((e) => ({ ok: false as const, error: String(e) }));
  if (cf.ok) {
    await db
      .prepare("UPDATE domains SET cf_hostname_id = ?, status = 'pending', last_error = NULL, checked_at = datetime('now') WHERE hostname = ?")
      .bind(cf.id, hostname)
      .run();
  } else {
    await db
      .prepare("UPDATE domains SET status = 'to_retry', last_error = ?, checked_at = datetime('now') WHERE hostname = ?")
      .bind(cf.error.slice(0, 300), hostname)
      .run();
  }
}

// ---------------------------------------------------------------- support tools

/** New temporary password + must_change_password = 1, logs the seller out everywhere */
export async function resendWelcome(storeId: number): Promise<{ ok: true; welcome: Welcome } | { ok: false; error: string }> {
  const { db, env } = await requireAdmin();
  if (!Number.isInteger(storeId)) return { ok: false, error: "Boutique introuvable" };
  const password = temporaryPassword();
  const res = await db.batch([
    db
      .prepare("UPDATE stores SET password_hash = ?, must_change_password = 1, session_version = session_version + 1 WHERE id = ?")
      .bind(await hashPassword(password), storeId),
    db.prepare("INSERT INTO admin_log (action, store_id, detail) SELECT 'resend_welcome', id, 'new temporary password' FROM stores WHERE id = ?").bind(storeId),
  ]);
  if (!res[0].meta.changes) return { ok: false, error: "Boutique introuvable" };
  return { ok: true, welcome: await buildWelcome(db, env, storeId, password) };
}

/** Domain status from Cloudflare; creates the custom hostname if the first call had failed */
export async function checkDomain(form: FormData) {
  const { db, env } = await requireAdmin();
  const hostname = String(form.get("hostname") ?? "");
  const d = await db
    .prepare("SELECT hostname, store_id, cf_hostname_id FROM domains WHERE hostname = ? AND kind = 'custom'")
    .bind(hostname)
    .first<{ hostname: string; store_id: number; cf_hostname_id: string | null }>();
  if (!d) return;
  if (!d.cf_hostname_id) {
    await registerCustomDomain(db, env, d.hostname);
  } else {
    const st = await getCustomHostname(env, d.cf_hostname_id).catch((e) => ({ ok: false as const, error: String(e) }));
    await db
      .prepare("UPDATE domains SET status = ?, last_error = ?, checked_at = datetime('now') WHERE hostname = ?")
      .bind(st.ok ? (st.active ? "active" : "pending") : "pending", st.ok ? (st.active ? null : st.detail) : st.error.slice(0, 300), d.hostname)
      .run();
  }
  await db.prepare("INSERT INTO admin_log (action, store_id, detail) VALUES ('check_domain', ?, ?)").bind(d.store_id, d.hostname).run();
  await scheduleSheetSync(d.store_id);
  revalidatePath("/admin");
}

// ---------------------------------------------------------------- renewal (+1 year with payment)

export type RenewResult =
  | { ok: true; expiresAt: string; message: string; phone: string; lang: Lang }
  | { ok: false; error: string };

/** +1 year from max(today, end date), payment + receipt recorded, sheet synced, thank-you message */
export async function renewWithPayment(input: { storeId: number; amount: unknown; method: unknown; receipt_key: unknown }): Promise<RenewResult> {
  const { db } = await requireAdmin();
  const storeId = Number(input.storeId);
  const amount = toInt(input.amount);
  const method = String(input.method ?? "");
  const receipt = typeof input.receipt_key === "string" && input.receipt_key ? input.receipt_key : null;
  if (!Number.isInteger(storeId)) return { ok: false, error: "Boutique introuvable" };
  if (amount === null || Number.isNaN(amount) || amount < 1000 || amount > 1_000_000) return { ok: false, error: "Montant invalide" };
  if (!PAYMENT_METHODS.some((m) => m.id === method)) return { ok: false, error: "Choisissez le moyen de paiement" };
  if (receipt && !RECEIPT_KEY_RE.test(receipt)) return { ok: false, error: "Reçu invalide" };

  const store = await db
    .prepare("SELECT id, name, owner_name, owner_phone, lang, expires_at FROM stores WHERE id = ?")
    .bind(storeId)
    .first<{ id: number; name: string; owner_name: string; owner_phone: string; lang: Lang; expires_at: string }>();
  if (!store) return { ok: false, error: "Boutique introuvable" };

  // Paid early: the new year starts at the old end date. Paid late: it starts today.
  const start = new Date(Math.max(Date.now(), Date.parse(store.expires_at) || 0));
  const end = new Date(start);
  end.setUTCFullYear(end.getUTCFullYear() + 1);
  await db.batch([
    db.prepare("UPDATE stores SET expires_at = ?, lifecycle = 'active', status = 'active' WHERE id = ?").bind(end.toISOString(), storeId),
    db
      .prepare(
        `INSERT INTO payments (store_id, amount, method, receipt_key, reference, period_start, period_end, kind)
         SELECT id, ?, ?, ?, request_ref, ?, ?, 'renewal' FROM stores WHERE id = ?`,
      )
      .bind(amount, method, receipt, start.toISOString(), end.toISOString(), storeId),
    db.prepare("UPDATE renewal_reminders SET status = 'skipped' WHERE store_id = ? AND status = 'pending'").bind(storeId),
    db.prepare("INSERT INTO admin_log (action, store_id, detail) VALUES ('renew', ?, ?)").bind(storeId, JSON.stringify({ amount, method, until: end.toISOString() })),
  ]);
  await scheduleSheetSync(storeId);
  revalidatePath("/admin");
  return {
    ok: true,
    expiresAt: end.toISOString(),
    phone: store.owner_phone,
    lang: store.lang,
    message: thankYouMessage({ lang: store.lang, ownerName: store.owner_name || store.name, storeName: store.name, expiresAt: end.toISOString(), amount }),
  };
}

export async function toggleSuspend(form: FormData) {
  const { db } = await requireAdmin();
  const id = Number(form.get("id"));
  await db
    .prepare("UPDATE stores SET status = CASE status WHEN 'active' THEN 'suspended' ELSE 'active' END WHERE id = ?")
    .bind(id)
    .run();
  await db.prepare("INSERT INTO admin_log (action, store_id) VALUES ('toggle_suspend', ?)").bind(id).run();
  await scheduleSheetSync(id);
  revalidatePath("/admin");
}

// ---------------------------------------------------------------- daily job, reminders, sheet

export async function runDailyJobNow(): Promise<DailyReport> {
  const { db, env } = await requireAdmin();
  const report = await runDailyJob(db, env);
  revalidatePath("/admin");
  return report;
}

/** "Send on WhatsApp" was clicked: the reminder is done */
export async function markReminderSent(id: number) {
  const { db } = await requireAdmin();
  if (!Number.isInteger(id)) return;
  await db.batch([
    db.prepare("UPDATE renewal_reminders SET status = 'sent', sent_at = datetime('now') WHERE id = ? AND status = 'pending'").bind(id),
    db.prepare("INSERT INTO admin_log (action, store_id, detail) SELECT 'reminder_sent', store_id, kind FROM renewal_reminders WHERE id = ?").bind(id),
  ]);
  revalidatePath("/admin");
}

export async function syncAllToSheet(): Promise<PostResult & { count: number }> {
  const { db, env } = await requireAdmin();
  const res = await syncAllStores(db, env);
  revalidatePath("/admin");
  return res;
}

export async function retrySheetNow(): Promise<{ retried: number; result: PostResult }> {
  const { db, env } = await requireAdmin();
  const res = await retrySheetQueue(db, env, true);
  revalidatePath("/admin");
  return res;
}

// ---------------------------------------------------------------- delete (only "to delete" stores, confirmed)

async function deleteCustomHostname(env: CloudflareEnv, id: string) {
  if (!env.CF_API_TOKEN || !env.CF_ZONE_ID || env.CF_ZONE_ID.startsWith("REPLACE")) return;
  await fetch(`https://api.cloudflare.com/client/v4/zones/${env.CF_ZONE_ID}/custom_hostnames/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${env.CF_API_TOKEN}` },
  }).catch(() => {});
}

/**
 * Deletes a store expired for more than 60 days, after the admin typed its address to confirm:
 * photos (R2), custom hostname (Cloudflare), every row (D1 cascade). The sheet row is marked
 * "Supprimée" and the deletion stays in admin_log.
 */
export async function deleteStore(storeId: number, confirmSlug: string): Promise<{ ok: boolean; error?: string }> {
  const { db, env } = await requireAdmin();
  const store = await db
    .prepare("SELECT id, slug, name, owner_name, owner_phone, expires_at FROM stores WHERE id = ?")
    .bind(storeId)
    .first<{ id: number; slug: string; name: string; owner_name: string; owner_phone: string; expires_at: string }>();
  if (!store) return { ok: false, error: "Boutique introuvable" };
  if (lifecycleOf(store.expires_at) !== "to_delete") return { ok: false, error: "Seules les boutiques expirées depuis plus de 60 jours peuvent être supprimées" };
  if (String(confirmSlug ?? "").trim().toLowerCase() !== store.slug) return { ok: false, error: `Tapez exactement « ${store.slug} » pour confirmer` };

  // Last row for the sheet, before the data disappears
  const [row] = await buildSheetRows(db, env, [store.id]);
  if (row) {
    row[12] = "Supprimée";
    await postRows(env, [row]);
  }
  const { results: custom } = await db
    .prepare("SELECT cf_hostname_id FROM domains WHERE store_id = ? AND kind = 'custom' AND cf_hostname_id IS NOT NULL")
    .bind(store.id)
    .all<{ cf_hostname_id: string }>();
  for (const d of custom) await deleteCustomHostname(env, d.cf_hostname_id);
  // R2: every file of the store
  let cursor: string | undefined;
  do {
    const list = await env.MEDIA.list({ prefix: `stores/${store.id}/`, cursor });
    if (list.objects.length) await env.MEDIA.delete(list.objects.map((o) => o.key));
    cursor = list.truncated ? list.cursor : undefined;
  } while (cursor);
  const paid = await db.prepare("SELECT COALESCE(SUM(amount), 0) AS n FROM payments WHERE store_id = ?").bind(store.id).first<{ n: number }>();
  await db.batch([
    db.prepare("DELETE FROM stores WHERE id = ?").bind(store.id), // cascades to every store table
    db.prepare("DELETE FROM sheet_sync_queue WHERE store_id = ?").bind(store.id),
    db
      .prepare("INSERT INTO admin_log (action, store_id, detail) VALUES ('delete_store', ?, ?)")
      .bind(store.id, JSON.stringify({ slug: store.slug, name: store.name, owner: store.owner_name, phone: store.owner_phone, expired: store.expires_at, total_paid: paid?.n ?? 0 })),
  ]);
  revalidatePath("/admin");
  return { ok: true };
}
