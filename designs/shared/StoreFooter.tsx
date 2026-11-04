import Link from "next/link";
import { waLink } from "@/lib/algeria/phone";
import { t } from "@/lib/i18n";
import type { Store } from "@/lib/types";

/** Footer on every store page: policy link, WhatsApp, COD reminder */
export function StoreFooter({ store }: { store: Store }) {
  const lang = store.lang;
  return (
    <footer className="store-footer store-accent px-4 pb-8 pt-8 text-sm">
      <div className="mx-auto max-w-5xl space-y-3 text-center">
        <p className="store-heading text-base font-bold">{store.name}</p>
        <p className="opacity-80">{t(lang, "footer_cod")}</p>
        <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
          <Link href="/policy" className="underline underline-offset-4">
            {t(lang, "policy_title")}
          </Link>
          {store.whatsapp && (
            <a href={waLink(store.whatsapp)} target="_blank" rel="noopener" className="underline underline-offset-4">
              WhatsApp
            </a>
          )}
        </nav>
        <p className="text-xs opacity-60">© {new Date().getFullYear()} {store.name}</p>
      </div>
    </footer>
  );
}
