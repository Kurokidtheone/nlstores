// Same check as requireAdmin(), for route handlers (which answer with a status instead of redirecting).
import { ADMIN_COOKIE, readSession } from "./auth";
import { getEnv } from "./db";
import { currentHost } from "./tenant";

export async function isAdminRequest(): Promise<boolean> {
  const env = await getEnv();
  if ((await currentHost()) !== env.ADMIN_HOST) return false;
  const s = await readSession(ADMIN_COOKIE);
  return !!s && s.role === "admin";
}
