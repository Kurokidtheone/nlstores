import { NextResponse } from "next/server";
import { getEnv } from "@/lib/db";
import { currentStore, isOpen, isSellerOf, storeState } from "@/lib/tenant";

const TYPES: Record<string, string> = { "image/webp": "webp", "image/jpeg": "jpg", "image/png": "png" };
const MAX_BYTES = 3 * 1024 * 1024; // photos are already compressed in the browser

// Seller image upload -> R2 at stores/<storeId>/<uuid>.<ext>. Only the logged-in seller of this host.
export async function POST(req: Request) {
  const store = await currentStore();
  if (!store || !(await isSellerOf(store)) || !isOpen(storeState(store)) || store.must_change_password === 1) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "no file" }, { status: 400 });
  const ext = TYPES[file.type];
  if (!ext) return NextResponse.json({ error: "Format non supporté (JPG, PNG, WEBP)" }, { status: 415 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "Image trop lourde (3 Mo max.)" }, { status: 413 });

  const key = `stores/${store.id}/${crypto.randomUUID()}.${ext}`;
  await (await getEnv()).MEDIA.put(key, await file.arrayBuffer(), { httpMetadata: { contentType: file.type } });
  return NextResponse.json({ key });
}
