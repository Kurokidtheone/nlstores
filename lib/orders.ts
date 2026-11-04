// createOrder: the browser only sends WHAT the buyer wants. Every price, offer and delivery
// fee is read again from D1 here; anything price-like in the request is ignored.
import { isWilaya } from "./algeria/wilayas";
import { normalizePhone } from "./algeria/phone";
import { getOffers, getProductById } from "./catalog";
import type { TKey } from "./i18n";
import type { Product, Store } from "./types";

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

/** Max successful orders per hour, counted in D1 (per store) */
export const ORDER_LIMITS = { perPhonePerHour: 5, perIpPerHour: 20 } as const;

type Fail = { ok: false; error: TKey; field?: string };
type Buyer = { name: string; phone: string; wilaya: number; commune: string; address: string; deliveryType: "home" | "desk" };

/** Buyer fields (shared by the storefront order and the seller's order edit) */
export function validateBuyer(req: Partial<OrderRequest>): { ok: true; value: Buyer } | Fail {
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
  return { ok: true, value: { name, phone, wilaya, commune, address, deliveryType } };
}

export type Priced = { productsTotal: number; deliveryPrice: number; total: number; variantText: string; qty: number };

/**
 * Every amount comes from D1: product price or bundle offer, delivery price of the wilaya.
 * Anything price-like sent by the browser is never read.
 */
export async function priceOrder(
  db: D1Database,
  storeId: number,
  product: Product,
  input: { qty: unknown; variant: unknown; deliveryType: "home" | "desk"; wilaya: number },
  opts: { checkStock: boolean },
): Promise<({ ok: true } & Priced) | Fail> {
  const chosen = (input.variant && typeof input.variant === "object" ? input.variant : {}) as Record<string, unknown>;
  const parts: string[] = [];
  for (const g of product.variants) {
    const v = chosen[g.name];
    if (typeof v !== "string" || !g.options.includes(v)) return { ok: false, error: "required", field: "variant" };
    parts.push(`${g.name}: ${v}`);
  }
  const offers = await getOffers(db, storeId, product.id);
  const qty = Number(input.qty);
  const offer = offers.find((o) => o.qty === qty);
  if (qty !== 1 && !offer) return { ok: false, error: "error_generic", field: "qty" };
  if (opts.checkStock && product.stock !== null && product.stock < qty) return { ok: false, error: "out_of_stock" };
  const productsTotal = offer ? offer.total_price : product.price;
  const deliveryPrice = await deliveryPriceOf(db, storeId, input.wilaya, input.deliveryType);
  if (deliveryPrice === null) return { ok: false, error: "not_delivered", field: "delivery_type" };
  return { ok: true, productsTotal, deliveryPrice, total: productsTotal + deliveryPrice, variantText: parts.join(" / "), qty };
}

export async function deliveryPriceOf(db: D1Database, storeId: number, wilaya: number, type: "home" | "desk"): Promise<number | null> {
  const dp = await db
    .prepare("SELECT home_price, desk_price FROM delivery_prices WHERE store_id = ? AND wilaya = ?")
    .bind(storeId, wilaya)
    .first<{ home_price: number | null; desk_price: number | null }>();
  return (type === "home" ? dp?.home_price : dp?.desk_price) ?? null;
}

export async function createOrder(db: D1Database, store: Store, req: OrderRequest, meta: { ipHash: string | null } = { ipHash: null }): Promise<OrderResult> {
  const b = validateBuyer(req);
  if (!b.ok) return b;
  const { name, phone, wilaya, commune, address, deliveryType } = b.value;

  const productId = Number(req.product_id);
  const product = Number.isInteger(productId) ? await getProductById(db, store.id, productId) : null;
  if (!product || !product.visible) return { ok: false, error: "error_generic" };
  const p = await priceOrder(db, store.id, product, { qty: req.qty, variant: req.variant, deliveryType, wilaya }, { checkStock: true });
  if (!p.ok) return p;

  const blocked = await db.prepare("SELECT 1 FROM blacklist WHERE store_id = ? AND phone = ?").bind(store.id, phone).first();
  if (blocked) return { ok: false, error: "error_generic" };

  // Abuse protection: 5 orders per phone and 20 per IP per hour, in this store
  const recent = await db
    .prepare(
      `SELECT
         (SELECT COUNT(*) FROM orders WHERE store_id = ? AND phone = ? AND created_at > datetime('now', '-1 hour')) AS by_phone,
         (SELECT COUNT(*) FROM orders WHERE store_id = ? AND ip_hash = ? AND created_at > datetime('now', '-1 hour')) AS by_ip`,
    )
    .bind(store.id, phone, store.id, meta.ipHash ?? "")
    .first<{ by_phone: number; by_ip: number }>();
  if ((recent?.by_phone ?? 0) >= ORDER_LIMITS.perPhonePerHour || (meta.ipHash && (recent?.by_ip ?? 0) >= ORDER_LIMITS.perIpPerHour)) {
    return { ok: false, error: "too_many_orders" };
  }

  const dup = await db
    .prepare("SELECT 1 FROM orders WHERE store_id = ? AND phone = ? AND created_at > datetime('now', '-1 day')")
    .bind(store.id, phone)
    .first();

  const row = await db
    .prepare(
      `INSERT INTO orders (store_id, product_id, product_name, variant, qty, products_total, delivery_type, delivery_price, total,
                           customer_name, phone, wilaya, commune, address, is_duplicate, ip_hash)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
    )
    .bind(
      store.id, product.id, product.name, p.variantText, p.qty, p.productsTotal, deliveryType, p.deliveryPrice, p.total,
      name, phone, wilaya, commune, address, dup ? 1 : 0, meta.ipHash,
    )
    .first<{ id: number }>();
  return { ok: true, orderId: row!.id, total: p.total };
}

export type OrderEdit = { name: unknown; phone: unknown; wilaya: unknown; commune: unknown; address: unknown; delivery_type: unknown; qty: unknown; variant: unknown };

/**
 * Seller edits an order: the buyer fields are validated again and the total is recomputed from
 * D1 (product price / offer of the chosen quantity + delivery price of the new wilaya and type).
 * If the product was deleted since, quantity and variant are kept and only delivery is recomputed.
 */
export async function updateOrder(db: D1Database, storeId: number, orderId: number, req: OrderEdit): Promise<{ ok: true; total: number } | Fail> {
  const b = validateBuyer(req as Partial<OrderRequest>);
  if (!b.ok) return b;
  const { name, phone, wilaya, commune, address, deliveryType } = b.value;
  const order = await db
    .prepare("SELECT id, product_id, qty, variant, products_total FROM orders WHERE id = ? AND store_id = ?")
    .bind(orderId, storeId)
    .first<{ id: number; product_id: number | null; qty: number; variant: string; products_total: number }>();
  if (!order) return { ok: false, error: "error_generic" };
  const product = order.product_id ? await getProductById(db, storeId, order.product_id) : null;

  let priced: Priced;
  if (product) {
    const p = await priceOrder(db, storeId, product, { qty: req.qty, variant: req.variant, deliveryType, wilaya }, { checkStock: false });
    if (!p.ok) return p;
    priced = p;
  } else {
    const deliveryPrice = await deliveryPriceOf(db, storeId, wilaya, deliveryType);
    if (deliveryPrice === null) return { ok: false, error: "not_delivered", field: "delivery_type" };
    priced = { productsTotal: order.products_total, deliveryPrice, total: order.products_total + deliveryPrice, variantText: order.variant, qty: order.qty };
  }
  await db
    .prepare(
      `UPDATE orders SET customer_name = ?, phone = ?, wilaya = ?, commune = ?, address = ?, delivery_type = ?, qty = ?, variant = ?,
              products_total = ?, delivery_price = ?, total = ?, updated_at = datetime('now')
       WHERE id = ? AND store_id = ?`,
    )
    .bind(name, phone, wilaya, commune, address, deliveryType, priced.qty, priced.variantText, priced.productsTotal, priced.deliveryPrice, priced.total, orderId, storeId)
    .run();
  return { ok: true, total: priced.total };
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
