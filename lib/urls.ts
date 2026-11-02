import { headers } from "next/headers";

/**
 * Absolute URL of a store/admin host: https://<host> in production,
 * http://<host>:<port> in local dev (same port as the current request).
 */
export async function publicUrl(hostname: string, path = "/"): Promise<string> {
  if (process.env.NODE_ENV === "production") return `https://${hostname}${path}`;
  const port = ((await headers()).get("host") ?? "").split(":")[1];
  return `http://${hostname}${port ? `:${port}` : ""}${path}`;
}
