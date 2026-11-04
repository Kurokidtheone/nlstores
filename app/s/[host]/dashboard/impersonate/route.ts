// Lands the admin in this store's dashboard (support). Token: signed, 60 s, for THIS store,
// and single-use (admin_log.used_at). The session is marked imp and lasts 2 hours.
import { NextResponse } from "next/server";
import { SELLER_COOKIE, startSession, verifyToken } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { currentHost, currentStore } from "@/lib/tenant";
import { publicUrl } from "@/lib/urls";

const deny = (why: string) =>
  new NextResponse(`Lien de support invalide ou déjà utilisé (${why}). Recommencez depuis l'admin.`, {
    status: 403,
    headers: { "content-type": "text/plain; charset=utf-8" },
  });

export async function GET(req: Request) {
  const token = await verifyToken(new URL(req.url).searchParams.get("t"));
  if (!token) return deny("expiré");
  const store = await currentStore();
  if (!store || store.id !== token.storeId) return deny("mauvaise boutique");
  const used = await (await getDb())
    .prepare("UPDATE admin_log SET used_at = datetime('now') WHERE nonce = ? AND store_id = ? AND action = 'impersonate' AND used_at IS NULL")
    .bind(token.nonce, store.id)
    .run();
  if (used.meta.changes !== 1) return deny("déjà utilisé");
  await startSession(SELLER_COOKIE, { role: "seller", storeId: store.id, v: store.session_version, imp: true }, 2 * 60 * 60);
  // req.url is the internal rewritten URL (/s/<host>/…): build the public one from the Host
  return NextResponse.redirect(await publicUrl(await currentHost(), "/dashboard"), 303);
}
