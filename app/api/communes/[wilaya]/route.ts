import { NextResponse } from "next/server";
import { communesOf } from "@/lib/algeria/communes";
import { isWilaya } from "@/lib/algeria/wilayas";

// Communes of one wilaya for the order form (the full list stays on the server: 86 KB).
// Public, identical for every store, cached for a day.
export async function GET(_req: Request, { params }: { params: Promise<{ wilaya: string }> }) {
  const w = Number((await params).wilaya);
  if (!isWilaya(w)) return NextResponse.json({ error: "unknown wilaya" }, { status: 404 });
  const list = communesOf(w).map((c) => ({ fr: c.fr, ar: c.ar, a: c.aliases }));
  return NextResponse.json(list, { headers: { "cache-control": "public, max-age=86400, s-maxage=86400" } });
}
