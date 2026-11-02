import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Pixels } from "@/components/Pixels";
import { StoreHeader } from "@/designs/shared/StoreHeader";
import { dirOf, t } from "@/lib/i18n";
import { currentStore, isOpen, storeState } from "@/lib/tenant";

export async function generateMetadata(): Promise<Metadata> {
  const store = await currentStore();
  return { title: store?.name ?? "Boutique" };
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

  return (
    <div
      dir={dirOf(lang)}
      lang={lang}
      data-design={store.design}
      className="store"
      style={{ "--brand": store.primary_color } as React.CSSProperties}
    >
      <StoreHeader store={store} />
      {children}
      <Pixels metaId={store.meta_pixel_id} tiktokId={store.tiktok_pixel_id} />
    </div>
  );
}
