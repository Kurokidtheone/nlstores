import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { currentStore, sellerSession } from "@/lib/tenant";

// Polled every 30 s by the seller dashboard (components/dash/OrderNotifier.tsx).
// Only the logged-in seller of this host; only this store's orders.
export async function GET() {
  const store = await currentStore();
  if (!store || !(await sellerSession(store))) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const latest = await (await getDb())
    .prepare("SELECT id, customer_name, product_name, total FROM orders WHERE store_id = ? ORDER BY id DESC LIMIT 1")
    .bind(store.id)
    .first<{ id: number; customer_name: string; product_name: string; total: number }>();
  return NextResponse.json({ latest: latest ?? null }, { headers: { "cache-control": "no-store" } });
}
