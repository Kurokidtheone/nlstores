"use server";
// All seller writes. Every action starts with requireSeller() (except login) and every
// query is scoped with "AND store_id = ?" using the store of the current Host, never the browser.
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { DESIGNS } from "@/designs/registry";
import { WILAYA_COUNT } from "@/lib/algeria/wilayas";
import { normalizePhone } from "@/lib/algeria/phone";
import { SELLER_COOKIE, endSession, startSession, verifyPassword } from "@/lib/auth";
import { getOffers, getProductById, uniqueSlug } from "@/lib/catalog";
import { getEnv } from "@/lib/db";
import { copyStoreMedia, deleteStoreMedia } from "@/lib/media";
import { LIMITS, slugify, storeKeyRe, toInt, validateProductInput, type FieldErrors, type ProductInput } from "@/lib/products";
import { currentStore, isOpen, requireSeller, storeState } from "@/lib/tenant";
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
  if (!isOpen(storeState(store))) return { error: { fr: "Abonnement expiré. Contactez-nous.", ar: "انتهى الاشتراك. تواصل معنا." } };
  const phone = normalizePhone(String(form.get("phone") ?? ""));
  const password = String(form.get("password") ?? "");
  const bad = { error: { fr: "Téléphone ou mot de passe incorrect", ar: "الهاتف أو كلمة السر غير صحيحة" } };
  if (!phone || !password) return bad;
  const env = await getEnv();
  const row = await env.DB.prepare("SELECT password_hash, owner_phone FROM stores WHERE id = ?")
    .bind(store.id)
    .first<{ password_hash: string; owner_phone: string }>();
  if (!row || normalizePhone(row.owner_phone) !== phone || !(await verifyPassword(password, row.password_hash))) return bad;
  await startSession(SELLER_COOKIE, { role: "seller", storeId: store.id });
  redirect("/dashboard");
}

export async function logout() {
  await endSession(SELLER_COOKIE);
  redirect("/dashboard/login");
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
                  images = ?, video_url = ?, variants = ?, sections = ?, updated_at = datetime('now')
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
  await db.batch(
    rows.map((r) =>
      db
        .prepare(
          `INSERT INTO delivery_prices (store_id, wilaya, home_price, desk_price) VALUES (?, ?, ?, ?)
           ON CONFLICT (store_id, wilaya) DO UPDATE SET home_price = excluded.home_price, desk_price = excluded.desk_price`,
        )
        .bind(store.id, r.w, r.home, r.desk),
    ),
  );
  revalidatePath("/", "layout");
  return { ok: true };
}

// ---------------------------------------------------------------- settings

export async function saveSettings(_prev: SimpleState, form: FormData): Promise<SimpleState> {
  const { store, db } = await requireSeller();
  const name = String(form.get("name") ?? "").replace(/\s+/g, " ").trim();
  const lang = form.get("lang") === "fr" ? "fr" : "ar";
  const design = String(form.get("design"));
  const color = String(form.get("primary_color") ?? "");
  const waRaw = String(form.get("whatsapp") ?? "").trim();
  const meta = String(form.get("meta_pixel_id") ?? "").trim();
  const tiktok = String(form.get("tiktok_pixel_id") ?? "").trim();
  const whatsapp = waRaw ? normalizePhone(waRaw) : null;

  if (name.length < 2 || name.length > 60) return { error: { fr: "Nom de la boutique : 2 à 60 caractères", ar: "اسم المتجر: من 2 إلى 60 حرفا" } };
  if (!DESIGNS.some((d) => d.id === design)) return { error: { fr: "Design inconnu", ar: "تصميم غير معروف" } };
  if (!/^#[0-9a-fA-F]{6}$/.test(color)) return { error: { fr: "Couleur invalide", ar: "لون غير صالح" } };
  if (waRaw && !whatsapp) return { error: { fr: "Numéro WhatsApp invalide", ar: "رقم واتساب غير صالح" } };
  if (meta && !/^\d{5,20}$/.test(meta)) return { error: { fr: "ID Pixel Meta : chiffres uniquement", ar: "معرف بيكسل ميتا: أرقام فقط" } };
  if (tiktok && !/^[A-Za-z0-9]{5,40}$/.test(tiktok)) return { error: { fr: "ID Pixel TikTok invalide", ar: "معرف بيكسل تيك توك غير صالح" } };

  await db
    .prepare(
      `UPDATE stores SET name = ?, lang = ?, design = ?, primary_color = ?, whatsapp = ?, meta_pixel_id = ?, tiktok_pixel_id = ?
       WHERE id = ?`,
    )
    .bind(name, lang, design, color.toLowerCase(), whatsapp, meta || null, tiktok || null, store.id)
    .run();
  revalidatePath("/", "layout");
  return { ok: true };
}
