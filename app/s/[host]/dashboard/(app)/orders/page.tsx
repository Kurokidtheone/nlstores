import Link from "next/link";
import { PageTitle } from "@/components/dash/ui";
import { wilayaName } from "@/lib/algeria/wilayas";
import { formatDA } from "@/lib/format";
import { requireSeller } from "@/lib/tenant";
import type { Order, OrderStatus } from "@/lib/types";
import { blockOrderPhone, markNoAnswer, setOrderStatus } from "../../actions";

const STATUS: Record<OrderStatus, { fr: string; ar: string; cls: string }> = {
  new: { fr: "Nouvelle", ar: "جديدة", cls: "bg-blue-100 text-blue-800" },
  no_answer: { fr: "Pas de réponse", ar: "لا يرد", cls: "bg-amber-100 text-amber-800" },
  confirmed: { fr: "Confirmée", ar: "مؤكدة", cls: "bg-green-100 text-green-800" },
  shipped: { fr: "Expédiée", ar: "تم الإرسال", cls: "bg-indigo-100 text-indigo-800" },
  delivered: { fr: "Livrée", ar: "تم التوصيل", cls: "bg-emerald-100 text-emerald-800" },
  returned: { fr: "Retour", ar: "مرتجع", cls: "bg-gray-200 text-gray-700" },
  cancelled: { fr: "Annulée", ar: "ملغاة", cls: "bg-red-100 text-red-800" },
};
const FILTERS: (OrderStatus | "all")[] = ["all", "new", "no_answer", "confirmed", "shipped", "delivered", "returned", "cancelled"];
const NEXT: Partial<Record<OrderStatus, OrderStatus[]>> = {
  new: ["confirmed", "cancelled"],
  no_answer: ["confirmed", "cancelled"],
  confirmed: ["shipped", "cancelled"],
  shipped: ["delivered", "returned"],
};

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ s?: string }> }) {
  const { store, db } = await requireSeller();
  const s = (await searchParams).s;
  const filter = (FILTERS as string[]).includes(s ?? "") ? (s as OrderStatus | "all") : "all";
  const where = filter === "all" ? "" : filter === "new" ? "AND status IN ('new', 'no_answer')" : "AND status = ?";
  const stmt = db.prepare(`SELECT * FROM orders WHERE store_id = ? ${where} ORDER BY id DESC LIMIT 100`);
  const { results: orders } = await (where.includes("?") ? stmt.bind(store.id, filter) : stmt.bind(store.id)).all<Order>();

  return (
    <>
      <PageTitle fr="Commandes" ar="الطلبات" />
      <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {FILTERS.map((f) => (
          <Link
            key={f}
            href={f === "all" ? "/dashboard/orders" : `/dashboard/orders?s=${f}`}
            className={`flex-none rounded-full border px-4 py-2 text-sm font-semibold ${filter === f ? "border-[var(--brand)] bg-[var(--brand)] text-white" : "border-gray-300 bg-white"}`}
          >
            {f === "all" ? "Toutes · الكل" : `${STATUS[f].fr} · ${STATUS[f].ar}`}
          </Link>
        ))}
      </div>
      {orders.length === 0 && <p className="py-12 text-center text-gray-500">Aucune commande · <span className="ar">لا توجد طلبات</span></p>}
      <ul className="space-y-3">
        {orders.map((o) => (
          <li key={o.id} className="dash-card space-y-3 p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-lg font-bold">{o.customer_name}</p>
                <p className="text-sm text-gray-500">#{o.id} · {o.created_at.slice(5, 16)}</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${STATUS[o.status].cls}`}>
                {STATUS[o.status].fr}
                {o.status === "no_answer" && ` ×${o.no_answer_count}`}
              </span>
            </div>
            {o.is_duplicate === 1 && <p className="rounded-lg bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-800">⚠️ Doublon (même numéro &lt; 24 h) · <span className="ar">طلب مكرر</span></p>}
            <p className="text-sm">
              {o.qty} × {o.product_name}
              {o.variant && <span className="text-gray-500"> ({o.variant})</span>}
            </p>
            <p className="text-sm text-gray-600">
              {wilayaName(o.wilaya, "fr")} · {o.commune} · {o.delivery_type === "home" ? "Domicile" : "Stop desk"}
              {o.address && <> · {o.address}</>}
            </p>
            <p className="text-xl font-black"><bdi>{formatDA(o.total)}</bdi></p>
            <div className="grid grid-cols-2 gap-2">
              <a href={`tel:${o.phone}`} className="dash-btn dash-btn-primary col-span-2" dir="ltr">📞 {o.phone}</a>
              {(o.status === "new" || o.status === "no_answer") && (
                <form action={markNoAnswer}>
                  <input type="hidden" name="id" value={o.id} />
                  <button className="dash-btn dash-btn-ghost w-full text-sm">🔕 Pas de réponse</button>
                </form>
              )}
              {(NEXT[o.status] ?? []).map((st) => (
                <form key={st} action={setOrderStatus}>
                  <input type="hidden" name="id" value={o.id} />
                  <input type="hidden" name="status" value={st} />
                  <button className={`dash-btn w-full text-sm ${st === "cancelled" || st === "returned" ? "dash-btn-danger" : "dash-btn-ghost"}`}>
                    {STATUS[st].fr}
                  </button>
                </form>
              ))}
            </div>
            {(o.status === "new" || o.status === "no_answer" || o.status === "cancelled") && (
              <form action={blockOrderPhone}>
                <input type="hidden" name="id" value={o.id} />
                <button className="w-full text-center text-xs text-red-700 underline">Bloquer ce numéro (fausse commande) · حظر الرقم</button>
              </form>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}
