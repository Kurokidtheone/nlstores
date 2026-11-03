import Link from "next/link";
import { PageTitle } from "@/components/dash/ui";
import { listProducts } from "@/lib/catalog";
import { orderConfirmationMessage } from "@/lib/order-messages";
import { ORDER_FILTERS, findOrders, parseOrderFilter } from "@/lib/order-query";
import { requireSeller } from "@/lib/tenant";
import { STATUS } from "@/lib/order-status";
import { OrdersList, type ProductInfo } from "./OrdersList";

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ s?: string; q?: string }> }) {
  const { store, db } = await requireSeller();
  const filter = parseOrderFilter(await searchParams);
  const [orders, products, offers] = await Promise.all([
    findOrders(db, store.id, filter),
    listProducts(db, store.id),
    db.prepare("SELECT product_id, qty FROM offers WHERE store_id = ? ORDER BY qty").bind(store.id).all<{ product_id: number; qty: number }>(),
  ]);
  // For the edit sheet: each product's variant groups and allowed quantities (1 + offers)
  const productInfo: Record<number, ProductInfo> = {};
  for (const p of products) productInfo[p.id] = { variants: p.variants, qtys: [1, ...offers.results.filter((o) => o.product_id === p.id).map((o) => o.qty)] };
  const href = (s: string, q = filter.q) => {
    const sp = new URLSearchParams();
    if (s !== "all") sp.set("s", s);
    if (q) sp.set("q", q);
    return `/dashboard/orders${sp.size ? `?${sp}` : ""}`;
  };
  const exportHref = href(filter.status).replace("/dashboard/orders", "/dashboard/orders/export");

  return (
    <>
      <PageTitle fr="Commandes" ar="الطلبات">
        <a href={exportHref} className="dash-btn dash-btn-ghost !min-h-11 text-sm" download>
          ⬇️ CSV
        </a>
      </PageTitle>
      <form action="/dashboard/orders" className="mb-3 flex gap-2" role="search">
        {filter.status !== "all" && <input type="hidden" name="s" value={filter.status} />}
        <input
          name="q"
          defaultValue={filter.q}
          dir="auto"
          inputMode="search"
          placeholder="Téléphone, nom ou n° · الهاتف، الاسم أو الرقم"
          className="dash-input"
          aria-label="Rechercher une commande"
        />
        <button className="dash-btn dash-btn-primary flex-none !px-4" aria-label="Rechercher">🔍</button>
      </form>
      {filter.q && (
        <p className="mb-2 text-sm text-gray-600">
          {orders.length} résultat(s) pour « {filter.q} » · <Link href={href(filter.status, "")} className="underline">effacer</Link>
        </p>
      )}
      <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {ORDER_FILTERS.map((f) => (
          <Link
            key={f}
            href={href(f)}
            className={`flex-none rounded-full border px-4 py-2 text-sm font-semibold ${filter.status === f ? "border-[var(--brand)] bg-[var(--brand)] text-white" : "border-gray-300 bg-white"}`}
          >
            {f === "all" ? "Toutes · الكل" : `${STATUS[f].fr} · ${STATUS[f].ar}`}
          </Link>
        ))}
      </div>
      {orders.length === 0 ? (
        <p className="py-12 text-center text-gray-500">Aucune commande · <span className="ar">لا توجد طلبات</span></p>
      ) : (
        <OrdersList
          orders={orders}
          products={productInfo}
          messages={Object.fromEntries(orders.map((o) => [o.id, orderConfirmationMessage(o, store.name, store.lang)]))}
          lang={store.lang}
        />
      )}
    </>
  );
}
