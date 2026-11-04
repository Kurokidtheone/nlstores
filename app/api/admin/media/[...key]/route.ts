import { isAdminRequest } from "@/lib/admin-auth";
import { getEnv } from "@/lib/db";

// Receipts and not-yet-used product photos: admin only, never cached publicly.
export async function GET(_req: Request, { params }: { params: Promise<{ key: string[] }> }) {
  if (!(await isAdminRequest())) return new Response("Unauthorized", { status: 401 });
  const key = (await params).key.join("/");
  if (!/^(receipts|staging)\/[a-f0-9-]{36}\.(webp|jpg|png)$/.test(key)) return new Response("Not found", { status: 404 });
  const obj = await (await getEnv()).MEDIA.get(key);
  if (!obj) return new Response("Not found", { status: 404 });
  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set("cache-control", "private, max-age=3600");
  return new Response(obj.body, { headers });
}
