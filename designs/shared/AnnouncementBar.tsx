import type { Store } from "@/lib/types";

/** One short line at the very top of every store page (Settings -> Bandeau d'annonce) */
export function AnnouncementBar({ store }: { store: Pick<Store, "announcement" | "announcement_on"> }) {
  if (store.announcement_on !== 1 || !store.announcement.trim()) return null;
  return <p className="store-accent px-4 py-2 text-center text-sm font-semibold leading-snug">{store.announcement}</p>;
}
