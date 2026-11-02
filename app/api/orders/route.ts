import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { createOrder, type OrderRequest } from "@/lib/orders";
import { currentStore, isOpen, storeState } from "@/lib/tenant";

// POST an order. The store comes from the Host header; prices are recomputed in createOrder.
export async function POST(req: Request) {
  const store = await currentStore();
  if (!store || !isOpen(storeState(store))) return NextResponse.json({ ok: false, error: "store_unavailable" }, { status: 404 });
  let body: OrderRequest;
  try {
    body = (await req.json()) as OrderRequest;
  } catch {
    return NextResponse.json({ ok: false, error: "error_generic" }, { status: 400 });
  }
  const result = await createOrder(await getDb(), store, body);
  return NextResponse.json(result, { status: result.ok ? 200 : 422 });
}
