import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { storeFontVars } from "@/app/fonts/fonts";
import { Pixels } from "@/components/Pixels";
import { DESIGNS } from "@/designs/registry";
import { AnnouncementBar } from "@/designs/shared/AnnouncementBar";
import { StoreFooter } from "@/designs/shared/StoreFooter";
import { StoreHeader } from "@/designs/shared/StoreHeader";
import { dirOf, t } from "@/lib/i18n";
import { mediaUrl } from "@/lib/media";
import { currentStore, isOpen, isSellerOf, storeState } from "@/lib/tenant";
import type { Store } from "@/lib/types";

export async function generateMetadata(): Promise<Metadata> {
  const store = await currentStore();
  if (!store) return { title: "Boutique" };
  return { title: store.name, icons: store.logo_key ? { icon: mediaUrl(store.logo_key) } : undefined };
}

/**
 * ?preview_design=<id>&preview_colors=<hex>,<hex> from Settings (set as a header by middleware.ts).
 * Applied only for the logged-in seller of this store; nothing is saved.
 */
async function designPreview(store: Store): Promise<Pick<Store, "design" | "primary_color" | "accent_color"> | null> {
  const raw = (await headers()).get("x-nls-preview");
  if (!raw) return null;
  const [design, colors] = raw.split(";");
  if (!DESIGNS.some((d) => d.id === design) || !(await isSellerOf(store))) return null;
  const [primary, accent] = colors ? colors.split(",").map((c) => `#${c}`) : [store.primary_color, store.accent_color];
  return { design, primary_color: primary, accent_color: accent };
}

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const store = await currentStore();
  if (!store) notFound();
  const lang = store.lang;

  if (!isOpen(storeState(store))) {
    return (
      <main dir={dirOf(lang)} lang={lang} className="flex min-h-dvh items-center justify-center p-6 text-center">
        <p className="text-lg font-semibold text-gray-600">{t(lang, "store_unavailable")}</p>
      </main>
    );
  }

  const preview = await designPreview(store);
  const look = preview ?? store;

  return (
    <div
      dir={dirOf(lang)}
      lang={lang}
      data-design={look.design}
      className={`store flex flex-col ${storeFontVars}`}
      style={{ "--brand": look.primary_color, "--accent": look.accent_color } as React.CSSProperties}
    >
      {preview && <p className="bg-amber-300 px-4 py-2 text-center text-sm font-bold text-amber-950">👁️ {t(lang, "preview_design")}</p>}
      <AnnouncementBar store={store} />
      <StoreHeader store={store} />
      <div className="flex-1">{children}</div>
      <StoreFooter store={store} />
      <Pixels metaId={store.meta_pixel_id} tiktokId={store.tiktok_pixel_id} />
    </div>
  );
}
