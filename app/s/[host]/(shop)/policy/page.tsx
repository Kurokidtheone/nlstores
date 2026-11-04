import type { Metadata } from "next";
import { t } from "@/lib/i18n";
import { policyText } from "@/lib/policy";
import { currentStore, requireStore } from "@/lib/tenant";

export async function generateMetadata(): Promise<Metadata> {
  const store = await currentStore();
  return store ? { title: `${t(store.lang, "policy_title")} | ${store.name}` } : {};
}

/** Delivery & returns policy, edited by the seller in Settings (default text while empty) */
export default async function PolicyPage() {
  const store = await requireStore();
  return (
    <main className="mx-auto max-w-xl px-4 py-8">
      <h1 className="store-heading mb-4 text-2xl font-extrabold">{t(store.lang, "policy_title")}</h1>
      <div className="store-card whitespace-pre-line p-5 leading-relaxed">{policyText(store.policy, store.lang)}</div>
    </main>
  );
}
