import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { getEnv } from "@/lib/db";

const TYPES: Record<string, string> = { "image/webp": "webp", "image/jpeg": "jpg", "image/png": "png" };
const MAX_BYTES = 3 * 1024 * 1024;

// Admin uploads before a store exists: ?kind=receipt -> receipts/ (private), else staging/ (quick
// product photos, copied to stores/<id>/ when the store is created).
export async function POST(req: Request) {
  if (!(await isAdminRequest())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const kind = new URL(req.url).searchParams.get("kind") === "receipt" ? "receipts" : "staging";
  const file = (await req.formData().catch(() => null))?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "no file" }, { status: 400 });
  const ext = TYPES[file.type];
  if (!ext) return NextResponse.json({ error: "Format non supporté (JPG, PNG, WEBP)" }, { status: 415 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "Image trop lourde (3 Mo max.)" }, { status: 413 });
  const key = `${kind}/${crypto.randomUUID()}.${ext}`;
  await (await getEnv()).MEDIA.put(key, await file.arrayBuffer(), { httpMetadata: { contentType: file.type } });
  return NextResponse.json({ key });
}
