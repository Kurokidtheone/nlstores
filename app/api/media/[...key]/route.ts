import { getEnv } from "@/lib/db";

// Serves R2 images with a 1-year cache (keys are random and never reused).
export async function GET(_req: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const key = (await params).key.join("/");
  if (!/^stores\/\d+\/[a-z0-9-]+\.(webp|jpg|png)$/.test(key)) return new Response("Not found", { status: 404 });
  const obj = await (await getEnv()).MEDIA.get(key);
  if (!obj) return new Response("Not found", { status: 404 });
  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set("etag", obj.httpEtag);
  headers.set("cache-control", "public, max-age=31536000, immutable");
  return new Response(obj.body, { headers });
}
