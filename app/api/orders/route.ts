import { NextResponse } from "next/server";
import { getDb, getEnv } from "@/lib/db";
import { createOrder, type OrderRequest } from "@/lib/orders";
import { currentStore, isOpen, storeState } from "@/lib/tenant";

/** SHA-256(secret + IP): lets us count orders per IP without storing the IP */
async function ipHash(req: Request): Promise<string | null> {
  const ip = req.headers.get("cf-connecting-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "";
  if (!ip) return null;
  const secret = (await getEnv()).SESSION_SECRET ?? "";
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${secret}|ip|${ip}`));
  return [...new Uint8Array(digest)].slice(0, 16).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// POST an order. The store comes from the Host header; prices are recomputed in createOrder.
export async function POST(req: Request) {
  const store = await currentStore();
  if (!store || !isOpen(storeState(store))) return NextResponse.json({ ok: false, error: "store_unavailable" }, { status: 404 });
  let body: OrderRequest & { website?: unknown };
  try {
    body = (await req.json()) as OrderRequest & { website?: unknown };
  } catch {
    return NextResponse.json({ ok: false, error: "error_generic" }, { status: 400 });
  }
  // Honeypot: a hidden "website" field people never see. Bots fill it -> pretend it worked, store nothing.
  if (typeof body.website === "string" && body.website.trim() !== "") {
    return NextResponse.json({ ok: true, orderId: 0, total: 0 });
  }
  const result = await createOrder(await getDb(), store, body, { ipHash: await ipHash(req) });
  const status = result.ok ? 200 : result.error === "too_many_orders" ? 429 : 422;
  return NextResponse.json(result, { status });
}
