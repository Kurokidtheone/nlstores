import Link from "next/link";
import { PurchaseEvent } from "@/components/Pixels";
import { waLink } from "@/lib/algeria/phone";
import { getDb } from "@/lib/db";
import { formatDA } from "@/lib/format";
import { t } from "@/lib/i18n";
import { requireStore } from "@/lib/tenant";

type Props = { searchParams: Promise<{ o?: string }> };

export default async function ThankYou({ searchParams }: Props) {
  const store = await requireStore();
  const lang = store.lang;
  const id = Number((await searchParams).o);
  // Value for the Purchase event comes from the database, scoped to this store
  const order = Number.isInteger(id)
    ? await (await getDb())
        .prepare("SELECT id, total, product_name FROM orders WHERE id = ? AND store_id = ? AND created_at > datetime('now', '-1 hour')")
        .bind(id, store.id)
        .first<{ id: number; total: number; product_name: string }>()
    : null;

  return (
    <main className="mx-auto max-w-md px-4 py-10 text-center">
      <div className="store-card space-y-4 p-6">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl">✓</div>
        <h1 className="store-heading text-2xl font-extrabold">{t(lang, "thank_you_title")}</h1>
        <p className="text-[var(--muted)]">{t(lang, "thank_you_text")}</p>
        {order && (
          <p className="store-soft rounded-xl p-3 font-semibold">
            {t(lang, "order_number")} <bdi>#{order.id}</bdi> · <bdi>{formatDA(order.total, lang)}</bdi>
          </p>
        )}
        {store.whatsapp && (
          <a href={waLink(store.whatsapp)} className="flex min-h-12 items-center justify-center rounded-xl bg-[#25d366] font-bold text-white">
            {t(lang, "whatsapp_us")}
          </a>
        )}
        <Link href="/" className="block text-sm underline">
          {t(lang, "back_to_store")}
        </Link>
      </div>
      {order && <PurchaseEvent orderId={order.id} value={order.total} />}
    </main>
  );
}
