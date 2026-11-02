// Host -> store. The store is ALWAYS resolved from the real Host header, never from the URL
// params or the browser, so one store can never read or write another store's data.
import { cache } from "react";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { ADMIN_COOKIE, SELLER_COOKIE, readSession, type Session } from "./auth";
import { getDb, getEnv } from "./db";
import type { Store } from "./types";

const STORE_COLUMNS =
  "s.id, s.slug, s.name, s.lang, s.design, s.primary_color, s.whatsapp, s.meta_pixel_id, s.tiktok_pixel_id, s.owner_name, s.owner_phone, s.status, s.expires_at, s.created_at, " +
  "s.logo_key, s.accent_color, s.announcement, s.announcement_on, s.policy, s.must_change_password, s.password_changed_at, s.session_version, s.delivery_checked, " +
  "s.owner_wilaya, s.facebook_url, s.request_ref";

export const GRACE_DAYS = 7;

export const currentHost = cache(async (): Promise<string> => {
  return ((await headers()).get("host") ?? "").split(":")[0].toLowerCase();
});

export const getStoreByHost = cache(async (host: string): Promise<Store | null> => {
  const db = await getDb();
  return db
    .prepare(`SELECT ${STORE_COLUMNS} FROM domains d JOIN stores s ON s.id = d.store_id WHERE d.hostname = ?`)
    .bind(host)
    .first<Store>();
});

/** The store for the current request, or null */
export async function currentStore(): Promise<Store | null> {
  return getStoreByHost(await currentHost());
}

export type StoreState = "active" | "grace" | "expired" | "suspended";

/** Expired stores keep working for GRACE_DAYS so a late renewal does not cut live ads */
export function storeState(store: Pick<Store, "status" | "expires_at">, now = Date.now()): StoreState {
  if (store.status === "suspended") return "suspended";
  const exp = Date.parse(store.expires_at);
  if (Number.isNaN(exp) || now <= exp) return "active";
  return now <= exp + GRACE_DAYS * 86_400_000 ? "grace" : "expired";
}

export const isOpen = (s: StoreState) => s === "active" || s === "grace";

/**
 * True when the visitor is logged in as the seller of this store (no redirect).
 * A password change bumps session_version, which logs out every other device.
 */
export async function isSellerOf(store: Store): Promise<boolean> {
  return (await sellerSession(store)) !== null;
}

type SellerSession = Extract<Session, { role: "seller" }>;

/** The seller session for this store, or null (wrong store, logged out, or older password) */
export async function sellerSession(store: Store): Promise<SellerSession | null> {
  const s = await readSession(SELLER_COOKIE);
  return s && s.role === "seller" && s.storeId === store.id && (s.v ?? 0) === store.session_version ? s : null;
}

/**
 * First line of every seller page and server action.
 * Returns the store of the current host only if the seller session belongs to it.
 * While must_change_password = 1, everything redirects to the change-password screen
 * (only that screen and its action pass { passwordScreen: true }).
 * impersonating = the owner opened this dashboard from admin (support): banner, no forced
 * password screen, and the password can't be changed.
 */
export async function requireSeller(
  opts: { passwordScreen?: boolean } = {},
): Promise<{ store: Store; db: D1Database; host: string; impersonating: boolean }> {
  const host = await currentHost();
  const store = await getStoreByHost(host);
  if (!store) notFound();
  const session = await sellerSession(store);
  if (!session) redirect("/dashboard/login");
  const impersonating = session.imp === true;
  if (!isOpen(storeState(store)) && !impersonating) redirect("/dashboard/login?expired=1");
  if (store.must_change_password === 1 && !opts.passwordScreen && !impersonating) redirect("/dashboard/password");
  return { store, db: await getDb(), host, impersonating };
}

/** First line of every admin page and server action. Only works on ADMIN_HOST. */
export async function requireAdmin(): Promise<{ db: D1Database; env: CloudflareEnv }> {
  const env = await getEnv();
  if ((await currentHost()) !== env.ADMIN_HOST) notFound();
  const s = await readSession(ADMIN_COOKIE);
  if (!s || s.role !== "admin") redirect("/login");
  return { db: env.DB, env };
}

/** The store for the current host, or a 404 page */
export async function requireStore(): Promise<Store> {
  const store = await currentStore();
  if (!store) notFound();
  return store;
}
