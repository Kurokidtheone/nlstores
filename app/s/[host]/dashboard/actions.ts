"use server";
// All seller writes. Every action starts with requireSeller() (except login) and every
// query is scoped with "AND store_id = ?" using the store of the current Host, never the browser.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { DESIGNS } from "@/designs/registry";
import { DEFAULT_POLICY } from "@/lib/policy";
import { WILAYA_COUNT } from "@/lib/algeria/wilayas";
import { normalizePhone } from "@/lib/algeria/phone";
import { SELLER_COOKIE, endSession, hashPassword, startSession, verifyPassword } from "@/lib/auth";
import { getOffers, getProductById, uniqueSlug } from "@/lib/catalog";
import { getEnv } from "@/lib/db";
import { copyStoreMedia, deleteStoreMedia } from "@/lib/media";
import { LIMITS, slugify, storeKeyRe, toInt, validateProductInput, type FieldErrors, type ProductInput } from "@/lib/products";
import { currentStore, requireSeller, storeState } from "@/lib/tenant";
import { publicUrl } from "@/lib/urls";
import { scheduleSheetSync } from "@/lib/sheet-sync";
import { updateOrder, type OrderEdit } from "@/lib/orders";
import { t, type TKey } from "@/lib/i18n";
import type { Msg, OrderStatus, Product } from "@/lib/types";

/** Public paths of a store live under /s/<host>/ after the middleware rewrite */
function revalidateStore(host: string, ...slugs: string[]) {
  const base = `/s/${encodeURIComponent(host)}`;
  revalidatePath(base); // catalog
  for (const s of slugs) revalidatePath(`${base}/p/${s}`);
  revalidatePath(`${base}/dashboard/products`);
}

const allMedia = (p: Product) => [...p.images, ...p.sections.reviews];

/**
 * Deletes R2 files no product of this store still uses. Runs after the DB write, so a failure
 * here is logged and never turns a successful save into an error (worst case: an orphan file).
 */
async function deleteUnusedMedia(db: D1Database, storeId: number, keys: string[]) {
  try {
    const re = storeKeyRe(storeId);
    const unused: string[] = [];
    for (const key of new Set(keys)) {
      if (!re.test(key)) continue;
      // instr() instead of LIKE: D1 rejects LIKE patterns longer than 50 bytes
      const used = await db
        .prepare("SELECT 1 FROM products WHERE store_id = ? AND (instr(images, ?) > 0 OR instr(sections, ?) > 0) LIMIT 1")
        .bind(storeId, `"${key}"`, `"${key}"`)
        .first();
      if (!used) unused.push(key);
    }
    if (unused.length) await deleteStoreMedia((await getEnv()).MEDIA, storeId, unused);
  } catch (e) {
    console.error("R2 cleanup failed", e);
  }
}

// ---------------------------------------------------------------- login

export type LoginState = { error?: Msg };

/** The only seller action without requireSeller(): it creates the session. */
export async function login(_prev: LoginState, form: FormData): Promise<LoginState> {
  const store = await currentStore();
  if (!store) return { error: { fr: "Boutique introuvable", ar: "المتجر غير موجود" } };
  // Expired stores can log in: they land on the renewal screen. Suspended ones can't.
  if (storeState(store) === "suspended") return { error: { fr: "Boutique suspendue. Contactez-nous.", ar: "المتجر موقوف. تواصل معنا." } };
  const phone = normalizePhone(String(form.get("phone") ?? ""));
  const password = String(form.get("password") ?? "");
  const bad = { error: { fr: "Téléphone ou mot de passe incorrect", ar: "الهاتف أو كلمة السر غير صحيحة" } };
  if (!phone || !password) return bad;
  const env = await getEnv();
  const row = await env.DB.prepare("SELECT password_hash, owner_phone FROM stores WHERE id = ?")
    .bind(store.id)
    .first<{ password_hash: string; owner_phone: string }>();
  if (!row || normalizePhone(row.owner_phone) !== phone || !(await verifyPassword(password, row.password_hash))) return bad;
  await startSession(SELLER_COOKIE, { role: "seller", storeId: store.id, v: store.session_version });
  redirect(store.must_change_password === 1 ? "/dashboard/password" : "/dashboard");
}

// ---------------------------------------------------------------- password

export type PasswordState = { error?: Msg; field?: string };

/** Current password + new one twice. Logs out every other device (session_version + 1). */
export async function changePassword(_prev: PasswordState, form: FormData): Promise<PasswordState> {
  const { store, db, impersonating } = await requireSeller({ passwordScreen: true });
  if (impersonating)
    return { error: { fr: "Mode support admin : le mot de passe du vendeur ne peut pas être changé ici", ar: "وضع الدعم: لا يمكن تغيير كلمة سر البائع" } };
  const current = String(form.get("current") ?? "");
  const next = String(form.get("new") ?? "");
  const confirm = String(form.get("confirm") ?? "");
  const row = await db.prepare("SELECT password_hash FROM stores WHERE id = ?").bind(store.id).first<{ password_hash: string }>();
  if (!row || !(await verifyPassword(current, row.password_hash)))
    return { field: "current", error: { fr: "Mot de passe actuel incorrect", ar: "كلمة السر الحالية غير صحيحة" } };
  if (next.length < 8 || next.length > 128)
    return { field: "new", error: { fr: "8 caractères minimum", ar: "8 أحرف على الأقل" } };
  if (next !== confirm)
    return { field: "confirm", error: { fr: "Les deux mots de passe ne sont pas identiques", ar: "كلمتا السر غير متطابقتين" } };
  if (next === current)
    return { field: "new", error: { fr: "Choisissez un mot de passe différent de l'actuel", ar: "اختر كلمة سر مختلفة عن الحالية" } };

  const version = store.session_version + 1;
  await db
    .prepare(
      `UPDATE stores SET password_hash = ?, must_change_password = 0, password_changed_at = datetime('now'), session_version = ?
       WHERE id = ?`,
    )
    .bind(await hashPassword(next), version, store.id)
    .run();
  await startSession(SELLER_COOKIE, { role: "seller", storeId: store.id, v: version }); // keep this device logged in
  redirect("/dashboard?password=changed");
}

export async function logout() {
  await endSession(SELLER_COOKIE);
  redirect("/dashboard/login");
}

/** "Quitter" on the admin support banner: drop the impersonated session, back to the admin panel */
export async function endImpersonation() {
  await endSession(SELLER_COOKIE);
  const env = await getEnv();
  redirect(await publicUrl(env.ADMIN_HOST, "/"));
}

// ---------------------------------------------------------------- orders

const STATUSES: OrderStatus[] = ["new", "confirmed", "no_answer", "cancelled", "shipped", "delivered", "returned"];

export async function setOrderStatus(form: FormData) {
  const { store, db } = await requireSeller();
  const id = Number(form.get("id"));
  const status = String(form.get("status")) as OrderStatus;
  if (!Number.isInteger(id) || !STATUSES.includes(status)) return;
  await db
    .prepare("UPDATE orders SET status = ?, updated_at = datetime('now') WHERE id = ? AND store_id = ?")
    .bind(status, id, store.id)
    .run();
  revalidatePath("/", "layout");
}

export async function markNoAnswer(form: FormData) {
  const { store, db } = await requireSeller();
  const id = Number(form.get("id"));
  if (!Number.isInteger(id)) return;
  await db
    .prepare("UPDATE orders SET status = 'no_answer', no_answer_count = no_answer_count + 1, updated_at = datetime('now') WHERE id = ? AND store_id = ?")
    .bind(id, store.id)
    .run();
  revalidatePath("/", "layout");
}

export async function blockOrderPhone(form: FormData) {
  const { store, db } = await requireSeller();
  const id = Number(form.get("id"));
  if (!Number.isInteger(id)) return;
  await db.batch([
    db.prepare("INSERT OR IGNORE INTO blacklist (store_id, phone) SELECT store_id, phone FROM orders WHERE id = ? AND store_id = ?").bind(id, store.id),
    db.prepare("UPDATE orders SET status = 'cancelled', updated_at = datetime('now') WHERE id = ? AND store_id = ?").bind(id, store.id),
  ]);
  revalidatePath("/", "layout");
}

/** Bulk: the selected orders get one status (only orders of this store are touched) */
export async function bulkSetStatus(ids: number[], status: OrderStatus): Promise<{ ok: boolean; count: number }> {
  const { store, db } = await requireSeller();
  if (!STATUSES.includes(status) || !Array.isArray(ids)) return { ok: false, count: 0 };
  const clean = [...new Set(ids.map(Number).filter(Number.isInteger))].slice(0, 500);
  let count = 0;
  for (let i = 0; i < clean.length; i += 90) {
    const chunk = clean.slice(i, i + 90);
    const res = await db
      .prepare(`UPDATE orders SET status = ?, updated_at = datetime('now') WHERE store_id = ? AND id IN (${chunk.map(() => "?").join(",")})`)
      .bind(status, store.id, ...chunk)
      .run();
    count += res.meta.changes ?? 0;
  }
  revalidatePath("/", "layout");
  return { ok: true, count };
}

export type OrderEditResult = { ok: true; total: number } | { ok: false; error: Msg; field?: string };

/** Order detail sheet: buyer fields, delivery, quantity, variant. The total is recomputed from D1. */
export async function editOrder(id: number, input: OrderEdit): Promise<OrderEditResult> {
  const { store, db } = await requireSeller();
  if (!Number.isInteger(id)) return { ok: false, error: { fr: "Commande introuvable", ar: "الطلب غير موجود" } };
  const res = await updateOrder(db, store.id, id, input);
  if (!res.ok) {
    const k: TKey = res.error;
    return { ok: false, field: res.field, error: { fr: t("fr", k), ar: t("ar", k) } };
  }
  revalidatePath("/", "layout");
  return res;
}

// ---------------------------------------------------------------- products

export type CreateState = { errors?: FieldErrors };

/** Quick add: name + price, then straight to the full editor. New products start hidden. */
export async function createProduct(_prev: CreateState, form: FormData): Promise<CreateState> {
  const { store, db, host } = await requireSeller();
  const name = String(form.get("name") ?? "").replace(/\s+/g, " ").trim();
  const price = toInt(form.get("price"));
  const errors: FieldErrors = {};
  if (name.length < 2 || name.length > LIMITS.name) errors.name = { fr: "Le nom est obligatoire", ar: "الاسم إجباري" };
  if (price === null || Number.isNaN(price) || price < 1 || price > LIMITS.maxPrice) errors.price = { fr: "Prix invalide", ar: "سعر غير صالح" };
  if (Object.keys(errors).length) return { errors };

  const slug = await uniqueSlug(db, store.id, slugify(name));
  const row = await db
    .prepare(
      `INSERT INTO products (store_id, slug, name, price, visible, sort)
       VALUES (?, ?, ?, ?, 0, (SELECT COALESCE(MAX(sort), -1) + 1 FROM products WHERE store_id = ?)) RETURNING id`,
    )
    .bind(store.id, slug, name, price, store.id)
    .first<{ id: number }>();
  revalidateStore(host);
  redirect(`/dashboard/products/${row!.id}`);
}

/** On success returns the cleaned values that were stored, so the editor shows exactly that */
export type SaveResult = { ok: true; saved: ProductInput } | { ok: false; errors: FieldErrors };

/**
 * Saves the whole editor. `discarded` = photos uploaded in this session then removed before
 * saving; they are deleted from R2 if no product uses them.
 */
export async function saveProduct(id: number, input: unknown, discarded: unknown = []): Promise<SaveResult> {
  const { store, db, host } = await requireSeller();
  const notFound: SaveResult = { ok: false, errors: { form: { fr: "Produit introuvable", ar: "المنتج غير موجود" } } };
  if (!Number.isInteger(id)) return notFound;
  const before = await getProductById(db, store.id, id);
  if (!before) return notFound;

  const v = validateProductInput(input, store.id);
  if (!v.ok) return v;
  const p = v.value;

  const taken = await db.prepare("SELECT 1 FROM products WHERE store_id = ? AND slug = ? AND id != ?").bind(store.id, p.slug, id).first();
  if (taken) return { ok: false, errors: { slug: { fr: "Ce lien est déjà utilisé par un autre produit", ar: "هذا الرابط مستعمل لمنتج آخر" } } };

  try {
    await db.batch([
      db
        .prepare(
          `UPDATE products SET name = ?, slug = ?, description = ?, price = ?, old_price = ?, stock = ?, visible = ?,
                  images = ?, video_url = ?, variants = ?, sections = ?, is_sample = 0, updated_at = datetime('now')
           WHERE id = ? AND store_id = ?`,
        )
        .bind(
          p.name, p.slug, p.description, p.price, p.old_price, p.stock, p.visible ? 1 : 0,
          JSON.stringify(p.images), p.video_url, JSON.stringify(p.variants), JSON.stringify(p.sections),
          id, store.id,
        ),
      db.prepare("DELETE FROM offers WHERE product_id = ? AND store_id = ?").bind(id, store.id),
      ...p.offers.map((o) =>
        db
          .prepare("INSERT INTO offers (store_id, product_id, qty, total_price) SELECT store_id, id, ?, ? FROM products WHERE id = ? AND store_id = ?")
          .bind(o.qty, o.total_price, id, store.id),
      ),
    ]);
  } catch (e) {
    if (String(e).includes("UNIQUE")) return { ok: false, errors: { slug: { fr: "Ce lien est déjà utilisé", ar: "هذا الرابط مستعمل" } } };
    throw e;
  }

  // R2 cleanup: photos removed from this product + uploads discarded before saving
  const kept = new Set([...p.images, ...p.sections.reviews]);
  const extra = Array.isArray(discarded) ? discarded.filter((k): k is string => typeof k === "string").slice(0, 50) : [];
  await deleteUnusedMedia(db, store.id, [...allMedia(before), ...extra].filter((k) => !kept.has(k)));

  revalidateStore(host, before.slug, p.slug);
  return { ok: true, saved: p };
}

export async function duplicateProduct(id: number) {
  const { store, db, host } = await requireSeller();
  const src = await getProductById(db, store.id, id);
  if (!src) return;
  const offers = await getOffers(db, store.id, id);
  // Own copies of the photos, so deleting a photo in one product never breaks the other
  const copies = await copyStoreMedia((await getEnv()).MEDIA, store.id, allMedia(src));
  const swap = (k: string) => copies.get(k) ?? k;
  const sections = { ...src.sections, reviews: src.sections.reviews.filter((k) => copies.has(k)).map(swap) };
  const images = src.images.filter((k) => copies.has(k)).map(swap);
  const slug = await uniqueSlug(db, store.id, `${src.slug}-copie`.slice(0, LIMITS.slug));

  const row = await db
    .prepare(
      `INSERT INTO products (store_id, slug, name, description, price, old_price, stock, images, video_url, variants, sections, visible, sort)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, (SELECT COALESCE(MAX(sort), -1) + 1 FROM products WHERE store_id = ?)) RETURNING id`,
    )
    .bind(
      store.id, slug, `${src.name} (copie)`.slice(0, LIMITS.name), src.description, src.price, src.old_price, src.stock,
      JSON.stringify(images), src.video_url, JSON.stringify(src.variants), JSON.stringify(sections), store.id,
    )
    .first<{ id: number }>();
  const newId = row!.id;
  if (offers.length)
    await db.batch(
      offers.map((o) =>
        db.prepare("INSERT INTO offers (store_id, product_id, qty, total_price) SELECT store_id, id, ?, ? FROM products WHERE id = ? AND store_id = ?").bind(o.qty, o.total_price, newId, store.id),
      ),
    );
  revalidateStore(host);
  redirect(`/dashboard/products/${newId}`);
}

export async function deleteProduct(id: number) {
  const { store, db, host } = await requireSeller();
  const p = await getProductById(db, store.id, id);
  if (!p) redirect("/dashboard/products");
  await db.batch([
    db.prepare("DELETE FROM offers WHERE product_id = ? AND store_id = ?").bind(id, store.id),
    db.prepare("DELETE FROM products WHERE id = ? AND store_id = ?").bind(id, store.id),
  ]);
  await deleteUnusedMedia(db, store.id, allMedia(p));
  revalidateStore(host, p.slug);
  redirect("/dashboard/products");
}

/** Moves a product one place up or down in the store order (products.sort) */
export async function moveProduct(form: FormData) {
  const { store, db, host } = await requireSeller();
  const id = Number(form.get("id"));
  const dir = form.get("dir") === "up" ? -1 : 1;
  const { results } = await db.prepare("SELECT id FROM products WHERE store_id = ? ORDER BY sort, id").bind(store.id).all<{ id: number }>();
  const ids = results.map((r) => r.id);
  const i = ids.indexOf(id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= ids.length) return;
  [ids[i], ids[j]] = [ids[j], ids[i]];
  await db.batch(ids.map((pid, sort) => db.prepare("UPDATE products SET sort = ? WHERE id = ? AND store_id = ?").bind(sort, pid, store.id)));
  revalidateStore(host);
}

// ---------------------------------------------------------------- delivery

export type SimpleState = { ok?: boolean; error?: Msg };

export async function saveDelivery(_prev: SimpleState, form: FormData): Promise<SimpleState> {
  const { store, db } = await requireSeller();
  const rows: { w: number; home: number | null; desk: number | null }[] = [];
  for (let w = 1; w <= WILAYA_COUNT; w++) {
    const home = toInt(form.get(`home_${w}`));
    const desk = toInt(form.get(`desk_${w}`));
    for (const v of [home, desk])
      if (v !== null && (Number.isNaN(v) || v > 100_000))
        return { error: { fr: `Wilaya ${w} : prix invalide`, ar: `الولاية ${w}: سعر غير صالح` } };
    rows.push({ w, home, desk });
  }
  await db.batch([
    ...rows.map((r) =>
      db
        .prepare(
          `INSERT INTO delivery_prices (store_id, wilaya, home_price, desk_price) VALUES (?, ?, ?, ?)
           ON CONFLICT (store_id, wilaya) DO UPDATE SET home_price = excluded.home_price, desk_price = excluded.desk_price`,
        )
        .bind(store.id, r.w, r.home, r.desk),
    ),
    db.prepare("UPDATE stores SET delivery_checked = 1 WHERE id = ?").bind(store.id), // setup checklist
  ]);
  revalidatePath("/", "layout");
  return { ok: true };
}

// ---------------------------------------------------------------- settings

const HEX = /^#[0-9a-fA-F]{6}$/;
export async function saveSettings(_prev: SimpleState, form: FormData): Promise<SimpleState> {
  const { store, db, host } = await requireSeller();
  const str = (k: string) => String(form.get(k) ?? "");
  const name = str("name").replace(/\s+/g, " ").trim();
  const lang = form.get("lang") === "fr" ? "fr" : "ar";
  const design = str("design");
  const primary = str("primary_color");
  const accent = str("accent_color");
  const logoKey = str("logo_key").trim() || null;
  const announcement = str("announcement").replace(/\s+/g, " ").trim();
  const announcementOn = form.get("announcement_on") === "1";
  const policyRaw = str("policy").replace(/\r\n?/g, "\n").trim();
  const waRaw = str("whatsapp").trim();
  const meta = str("meta_pixel_id").trim();
  const tiktok = str("tiktok_pixel_id").trim();
  const whatsapp = waRaw ? normalizePhone(waRaw) : null;
  const err = (fr: string, ar: string): SimpleState => ({ error: { fr, ar } });

  if (name.length < 2 || name.length > 60) return err("Nom de la boutique : 2 à 60 caractères", "اسم المتجر: من 2 إلى 60 حرفا");
  if (!DESIGNS.some((d) => d.id === design)) return err("Design inconnu", "تصميم غير معروف");
  if (!HEX.test(primary) || !HEX.test(accent)) return err("Couleur invalide", "لون غير صالح");
  if (logoKey && !storeKeyRe(store.id).test(logoKey)) return err("Logo invalide", "الشعار غير صالح");
  if (announcement.length > 120) return err("Bandeau : 120 caractères maximum", "الشريط: 120 حرفا كحد أقصى");
  if (announcementOn && !announcement) return err("Écrivez le texte du bandeau ou désactivez-le", "اكتب نص الشريط أو أوقفه");
  if (policyRaw.length > 5000) return err("Texte livraison et retours : 5000 caractères maximum", "نص التوصيل والإرجاع: 5000 حرف كحد أقصى");
  if (waRaw && !whatsapp) return err("Numéro WhatsApp invalide", "رقم واتساب غير صالح");
  if (meta && !/^\d{5,20}$/.test(meta)) return err("ID Pixel Meta : chiffres uniquement", "معرف بيكسل ميتا: أرقام فقط");
  if (tiktok && !/^[A-Za-z0-9]{5,40}$/.test(tiktok)) return err("ID Pixel TikTok invalide", "معرف بيكسل تيك توك غير صالح");

  // Empty or unchanged default text -> NULL, so it keeps following the store language
  const policy = !policyRaw || policyRaw === DEFAULT_POLICY.ar.trim() || policyRaw === DEFAULT_POLICY.fr.trim() ? null : policyRaw;

  await db
    .prepare(
      `UPDATE stores SET name = ?, lang = ?, design = ?, primary_color = ?, accent_color = ?, logo_key = ?,
              announcement = ?, announcement_on = ?, policy = ?, whatsapp = ?, meta_pixel_id = ?, tiktok_pixel_id = ?
       WHERE id = ?`,
    )
    .bind(
      name, lang, design, primary.toLowerCase(), accent.toLowerCase(), logoKey,
      announcement, announcementOn ? 1 : 0, policy, whatsapp, meta || null, tiktok || null,
      store.id,
    )
    .run();
  if (name !== store.name) await scheduleSheetSync(store.id); // the sheet shows the store name
  // Old logo replaced or removed -> delete its R2 file
  if (store.logo_key && store.logo_key !== logoKey) await deleteUnusedMedia(db, store.id, [store.logo_key]);
  revalidatePath(`/s/${encodeURIComponent(host)}`, "layout");
  return { ok: true };
}
