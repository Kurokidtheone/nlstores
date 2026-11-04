import { getCloudflareContext } from "@opennextjs/cloudflare";

export async function getEnv(): Promise<CloudflareEnv> {
  return (await getCloudflareContext({ async: true })).env as CloudflareEnv;
}

export async function getDb(): Promise<D1Database> {
  return (await getEnv()).DB;
}

/** JSON.parse that never throws */
export function parseJson<T>(text: unknown, fallback: T): T {
  if (typeof text !== "string" || text === "") return fallback;
  try {
    return JSON.parse(text) as T;
  } catch {
    return fallback;
  }
}
