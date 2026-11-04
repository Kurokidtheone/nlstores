// Read helpers for products, offers and delivery prices. Every query is scoped by store_id.
import { WILAYA_COUNT } from "./algeria/wilayas";
import { rowToProduct, type ProductRow } from "./products";
import type { DeliveryPrice, Offer, Product } from "./types";

export async function listProducts(db: D1Database, storeId: number, opts: { visibleOnly?: boolean } = {}): Promise<Product[]> {
  const { results } = await db
    .prepare(`SELECT * FROM products WHERE store_id = ? ${opts.visibleOnly ? "AND visible = 1" : ""} ORDER BY sort, id`)
    .bind(storeId)
    .all<ProductRow>();
  return results.map(rowToProduct);
}

export async function getProductById(db: D1Database, storeId: number, id: number): Promise<Product | null> {
  const row = await db.prepare("SELECT * FROM products WHERE id = ? AND store_id = ?").bind(id, storeId).first<ProductRow>();
  return row ? rowToProduct(row) : null;
}

export async function getProductBySlug(db: D1Database, storeId: number, slug: string): Promise<Product | null> {
  const row = await db.prepare("SELECT * FROM products WHERE slug = ? AND store_id = ?").bind(slug, storeId).first<ProductRow>();
  return row ? rowToProduct(row) : null;
}

export async function getOffers(db: D1Database, storeId: number, productId: number): Promise<Offer[]> {
  const { results } = await db
    .prepare("SELECT qty, total_price FROM offers WHERE product_id = ? AND store_id = ? ORDER BY qty")
    .bind(productId, storeId)
    .all<Offer>();
  return results;
}

/** Always 69 entries, wilaya 1..69 (missing rows = not delivered) */
export async function getDeliveryPrices(db: D1Database, storeId: number): Promise<DeliveryPrice[]> {
  const { results } = await db
    .prepare("SELECT wilaya, home_price, desk_price FROM delivery_prices WHERE store_id = ?")
    .bind(storeId)
    .all<DeliveryPrice>();
  const byWilaya = new Map(results.map((r) => [r.wilaya, r]));
  return Array.from({ length: WILAYA_COUNT }, (_, i) => byWilaya.get(i + 1) ?? { wilaya: i + 1, home_price: null, desk_price: null });
}

/** A slug not used yet in this store: base, base-2, base-3, ... */
export async function uniqueSlug(db: D1Database, storeId: number, base: string, exceptId = 0): Promise<string> {
  const root = base || "produit";
  const { results } = await db
    .prepare("SELECT slug FROM products WHERE store_id = ? AND id != ? AND (slug = ? OR slug LIKE ?)")
    .bind(storeId, exceptId, root, `${root}-%`)
    .all<{ slug: string }>();
  const used = new Set(results.map((r) => r.slug));
  if (!used.has(root)) return root;
  for (let i = 2; ; i++) if (!used.has(`${root}-${i}`)) return `${root}-${i}`;
}
