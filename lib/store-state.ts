// Subscription dates and states. Pure functions (no Next.js imports): used by pages, the daily
// job (lib/daily-job.ts) and the sheet sync, which also run outside a page request.
import type { Store } from "./types";

export const GRACE_DAYS = 7;
/** Expired this long: listed in admin "to delete" (never deleted automatically) */
export const DELETE_AFTER_DAYS = 60;
/** Seller banner from this many days before expiry */
export const BANNER_DAYS = 30;

const DAY = 86_400_000;
const ALGERIA_OFFSET = 60 * 60 * 1000; // UTC+1, no daylight saving

export type StoreState = "active" | "grace" | "expired" | "suspended";
export type Lifecycle = "active" | "grace" | "expired" | "to_delete";

/** Expired stores keep working for GRACE_DAYS so a late renewal does not cut live ads */
export function storeState(store: Pick<Store, "status" | "expires_at">, now = Date.now()): StoreState {
  if (store.status === "suspended") return "suspended";
  const exp = Date.parse(store.expires_at);
  if (Number.isNaN(exp) || now <= exp) return "active";
  return now <= exp + GRACE_DAYS * DAY ? "grace" : "expired";
}

export const isOpen = (s: StoreState) => s === "active" || s === "grace";

/** "YYYY-MM-DD" of a moment, in Algeria time */
export function algeriaDate(ms: number): string {
  return new Date(ms + ALGERIA_OFFSET).toISOString().slice(0, 10);
}

/** Calendar days from today (Algeria) to the expiry day: 30, 7, 0 (today), -3 (3 days ago) */
export function daysLeft(expiresAt: string, now = Date.now()): number {
  const exp = Date.parse(expiresAt);
  if (Number.isNaN(exp)) return Infinity;
  return Math.round((Date.parse(algeriaDate(exp)) - Date.parse(algeriaDate(now))) / DAY);
}

/** The expiry lifecycle the daily job writes to stores.lifecycle */
export function lifecycleOf(expiresAt: string, now = Date.now()): Lifecycle {
  const exp = Date.parse(expiresAt);
  if (Number.isNaN(exp) || now <= exp) return "active";
  if (now <= exp + GRACE_DAYS * DAY) return "grace";
  return now > exp + DELETE_AFTER_DAYS * DAY ? "to_delete" : "expired";
}

/** "02/11/2027" */
export function dmy(iso: string): string {
  return algeriaDate(Date.parse(iso)).split("-").reverse().join("/");
}
