// Orders list filters, shared by the orders screen and its CSV export (same rows in both).
import { normalizePhone } from "./algeria/phone";
import type { Order, OrderStatus } from "./types";

export const ORDER_FILTERS: (OrderStatus | "all")[] = ["all", "new", "no_answer", "confirmed", "shipped", "delivered", "returned", "cancelled"];

export type OrderFilter = { status: OrderStatus | "all"; q: string };

export function parseOrderFilter(sp: { s?: string; q?: string }): OrderFilter {
  const status = (ORDER_FILTERS as string[]).includes(sp.s ?? "") ? (sp.s as OrderStatus | "all") : "all";
  return { status, q: String(sp.q ?? "").trim().slice(0, 40) };
}

/**
 * Search by order number (#12 or 12), phone (any part, +213 accepted) or name.
 * instr() instead of LIKE: D1 rejects long LIKE patterns.
 */
export async function findOrders(db: D1Database, storeId: number, f: OrderFilter, limit = 200): Promise<Order[]> {
  const where: string[] = ["store_id = ?"];
  const binds: (string | number)[] = [storeId];
  if (f.status === "new") where.push("status IN ('new', 'no_answer')");
  else if (f.status !== "all") (where.push("status = ?"), binds.push(f.status));
  if (f.q) {
    if (/^#\d{1,9}$/.test(f.q)) {
      // "#12": the order number only
      where.push("id = ?");
      binds.push(Number(f.q.slice(1)));
    } else {
      const digits = f.q.replace(/\D/g, "");
      const asPhone = normalizePhone(f.q) ?? (digits.startsWith("213") ? `0${digits.slice(3)}` : digits);
      const phonePart = asPhone.length >= 4 ? asPhone : ""; // "1" would match every phone
      const id = /^\d{1,9}$/.test(f.q) ? Number(f.q) : -1;
      where.push("(id = ? OR (? != '' AND instr(phone, ?) > 0) OR instr(lower(customer_name), lower(?)) > 0)");
      binds.push(id, phonePart, phonePart, f.q);
    }
  }
  const { results } = await db
    .prepare(`SELECT * FROM orders WHERE ${where.join(" AND ")} ORDER BY id DESC LIMIT ${Math.min(Math.max(limit, 1), 5000)}`)
    .bind(...binds)
    .all<Order>();
  return results;
}
