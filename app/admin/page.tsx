import Link from "next/link";
import { PageTitle } from "@/components/dash/ui";
import { waLink } from "@/lib/algeria/phone";
import { requireAdmin, storeState } from "@/lib/tenant";
import type { Store } from "@/lib/types";
import { adminLogout, renewStore, toggleSuspend } from "./actions";

type Row = Store & { hostnames: string | null; orders_30d: number };

const STATE = {
  active: "bg-green-100 text-green-800",
  grace: "bg-amber-100 text-amber-800",
  expired: "bg-red-100 text-red-800",
  suspended: "bg-gray-200 text-gray-700",
};

export default async function AdminHome() {
  const { db } = await requireAdmin();
  const { results } = await db
    .prepare(
      `SELECT s.*, (SELECT group_concat(hostname, ' ') FROM domains d WHERE d.store_id = s.id) AS hostnames,
              (SELECT COUNT(*) FROM orders o WHERE o.store_id = s.id AND o.created_at > datetime('now', '-30 days')) AS orders_30d
       FROM stores s ORDER BY s.expires_at`,
    )
    .all<Row>();

  return (
    <>
      <PageTitle fr="Boutiques" ar="المتاجر">
        <Link href="/stores/new" className="dash-btn dash-btn-primary !min-h-11 text-sm">➕ Nouvelle</Link>
      </PageTitle>
      <ul className="space-y-3">
        {results.map((s) => {
          const state = storeState(s);
          const days = Math.ceil((Date.parse(s.expires_at) - Date.now()) / 86_400_000);
          const remind = days <= 10;
          return (
            <li key={s.id} className="dash-card space-y-2 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-bold">{s.name}</p>
                  <p className="truncate text-sm text-gray-500">{s.hostnames}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${STATE[state]}`}>{state}</span>
              </div>
              <p className="text-sm text-gray-600">
                {s.owner_name} · <span dir="ltr">{s.owner_phone}</span> · expire le {s.expires_at.slice(0, 10)} ({days} j) · {s.orders_30d} commandes / 30 j
              </p>
              <div className="flex flex-wrap gap-2">
                <form action={renewStore}>
                  <input type="hidden" name="id" value={s.id} />
                  <button className="dash-btn dash-btn-ghost !min-h-11 text-sm">+1 an</button>
                </form>
                <form action={toggleSuspend}>
                  <input type="hidden" name="id" value={s.id} />
                  <button className="dash-btn dash-btn-danger !min-h-11 text-sm">{s.status === "active" ? "Suspendre" : "Réactiver"}</button>
                </form>
                {remind && (
                  <a
                    className="dash-btn !min-h-11 bg-[#25d366] text-sm text-white"
                    target="_blank"
                    href={waLink(s.owner_phone, `السلام عليكم، اشتراك متجركم ${s.name} ينتهي يوم ${s.expires_at.slice(0, 10)}. للتجديد تواصلوا معنا.`)}
                  >
                    Rappel WhatsApp
                  </a>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      <form action={adminLogout} className="mt-8">
        <button className="dash-btn w-full text-gray-500">Se déconnecter</button>
      </form>
    </>
  );
}
