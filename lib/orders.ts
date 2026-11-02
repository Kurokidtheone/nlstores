// createOrder: the browser only sends WHAT the buyer wants. Every price, offer and delivery
// fee is read again from D1 here; anything price-like in the request is ignored.
import { isWilaya } from "./algeria/wilayas";
import { normalizePhone } from "./algeria/phone";
import { getOffers, getProductById } from "./catalog";
import type { TKey } from "./i18n";
import type { Store } from "./types";

export type OrderRequest = {
  product_id: unknown;
  qty: unknown;
  variant: unknown; // { "Couleur": "Rouge" }
  delivery_type: unknown;
  name: unknown;
  phone: unknown;
  wilaya: unknown;
  commune: unknown;
  address: unknown;
};

export type OrderResult = { ok: true; orderId: number; total: number } | { ok: false; error: TKey; field?: string };

const str = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "");

export async function createOrder(db: D1Database, store: Store, req: OrderRequest): Promise<OrderResult> {
  const name = str(req.name, 80);
  if (name.length < 2) return { ok: false, error: "required", field: "name" };
  const phone = normalizePhone(str(req.phone, 20));
  if (!phone) return { ok: false, error: "phone_invalid", field: "phone" };
  const wilaya = Number(req.wilaya);
  if (!isWilaya(wilaya)) return { ok: false, error: "required", field: "wilaya" };
  const commune = str(req.commune, 80);
  if (commune.length < 2) return { ok: false, error: "required", field: "commune" };
  const address = str(req.address, 200);
  const deliveryType = req.delivery_type === "desk" ? "desk" : req.delivery_type === "home" ? "home" : null;
  if (!deliveryType) return { ok: false, error: "required", field: "delivery_type" };

  const productId = Number(req.product_id);
  const product = Number.isInteger(productId) ? await getProductById(db, store.id, productId) : null;
  if (!product || !product.visible) return { ok: false, error: "error_generic" };

  // Variant: one valid option per group
  const chosen = (req.variant && typeof req.variant === "object" ? req.variant : {}) as Record<string, unknown>;
  const parts: string[] = [];
  for (const g of product.variants) {
    const v = chosen[g.name];
    if (typeof v !== "string" || !g.options.includes(v)) return { ok: false, error: "required", field: "variant" };
    parts.push(`${g.name}: ${v}`);
  }

  // Quantity: 1 or one of the offer quantities
  const offers = await getOffers(db, store.id, product.id);
  const qty = Number(req.qty);
  const offer = offers.find((o) => o.qty === qty);
  if (qty !== 1 && !offer) return { ok: false, error: "error_generic" };
  if (product.stock !== null && product.stock < qty) return { ok: false, error: "out_of_stock" };
  const productsTotal = offer ? offer.total_price : product.price;

  const dp = await db
    .prepare("SELECT home_price, desk_price FROM delivery_prices WHERE store_id = ? AND wilaya = ?")
    .bind(store.id, wilaya)
    .first<{ home_price: number | null; desk_price: number | null }>();
  const deliveryPrice = deliveryType === "home" ? dp?.home_price : dp?.desk_price;
  if (deliveryPrice == null) return { ok: false, error: "not_delivered", field: "delivery_type" };

  const blocked = await db.prepare("SELECT 1 FROM blacklist WHERE store_id = ? AND phone = ?").bind(store.id, phone).first();
  if (blocked) return { ok: false, error: "error_generic" };

  const dup = await db
    .prepare("SELECT 1 FROM orders WHERE store_id = ? AND phone = ? AND created_at > datetime('now', '-1 day')")
    .bind(store.id, phone)
    .first();

  const total = productsTotal + deliveryPrice;
  const row = await db
    .prepare(
      `INSERT INTO orders (store_id, product_id, product_name, variant, qty, products_total, delivery_type, delivery_price, total,
                           customer_name, phone, wilaya, commune, address, is_duplicate)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
    )
    .bind(store.id, product.id, product.name, parts.join(" / "), qty, productsTotal, deliveryType, deliveryPrice, total, name, phone, wilaya, commune, address, dup ? 1 : 0)
    .first<{ id: number }>();
  return { ok: true, orderId: row!.id, total };
}

export type Stats = { today: number; pending: number; confirmed: number; delivered: number; revenue: number };

export async function getStats(db: D1Database, storeId: number): Promise<Stats> {
  const r = await db
    .prepare(
      `SELECT
         SUM(created_at >= date('now')) AS today,
         SUM(status IN ('new', 'no_answer')) AS pending,
         SUM(status IN ('confirmed', 'shipped')) AS confirmed,
         SUM(status = 'delivered') AS delivered,
         COALESCE(SUM(CASE WHEN status = 'delivered' THEN products_total END), 0) AS revenue
       FROM orders WHERE store_id = ?`,
    )
    .bind(storeId)
    .first<Record<keyof Stats, number | null>>();
  return {
    today: r?.today ?? 0,
    pending: r?.pending ?? 0,
    confirmed: r?.confirmed ?? 0,
    delivered: r?.delivered ?? 0,
    revenue: r?.revenue ?? 0,
  };
}
