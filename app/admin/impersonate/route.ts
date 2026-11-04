// POST from the admin store list ("Ouvrir le tableau de bord"). A plain form POST (not a server
// action) so it can open in a new tab. Logs the access, then sends the admin to the store's own
// host with a single-use 60-second token.
import { NextResponse } from "next/server";
import { signToken } from "@/lib/auth";
import { requireAdmin } from "@/lib/tenant";
import { publicUrl } from "@/lib/urls";

export async function POST(req: Request) {
  const { db, env } = await requireAdmin();
  // Route handlers have no built-in CSRF check: the form must come from the admin host
  const origin = req.headers.get("origin");
  if (!origin || new URL(origin).hostname !== env.ADMIN_HOST) return new NextResponse("Forbidden", { status: 403 });

  const storeId = Number((await req.formData()).get("store_id"));
  const sub = Number.isInteger(storeId)
    ? await db.prepare("SELECT hostname FROM domains WHERE store_id = ? AND kind = 'subdomain'").bind(storeId).first<{ hostname: string }>()
    : null;
  if (!sub) return new NextResponse("Boutique introuvable", { status: 404 });

  const nonce = crypto.randomUUID();
  await db.prepare("INSERT INTO admin_log (action, store_id, detail, nonce) VALUES ('impersonate', ?, 'open dashboard as store', ?)").bind(storeId, nonce).run();
  const token = await signToken({ purpose: "impersonate", storeId, nonce }, 60);
  return NextResponse.redirect(await publicUrl(sub.hostname, `/dashboard/impersonate?t=${encodeURIComponent(token)}`), 303);
}
