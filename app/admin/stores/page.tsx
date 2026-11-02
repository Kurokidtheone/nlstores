import Link from "next/link";
import { PageTitle } from "@/components/dash/ui";
import { wilayaName } from "@/lib/algeria/wilayas";
import { formatDA } from "@/lib/format";
import { requireAdmin, storeState } from "@/lib/tenant";
import type { Store } from "@/lib/types";
import { renewalAmount } from "@/lib/billing";
import { lifecycleOf } from "@/lib/store-state";
import { checkDomain, toggleSuspend } from "../actions";
import { RenewPanel } from "../RenewPanel";
import { ResendWelcome } from "../ResendWelcome";

type Row = Store & { orders_30d: number; pay_amount: number | null; pay_method: string | null; pay_receipt: string | null; pay_date: string | null };
type DomainRow = { store_id: number; hostname: string; kind: string; status: string; last_error: string | null; checked_at: string | null };

const STATE = {
  active: "bg-green-100 text-green-800",
  grace: "bg-amber-100 text-amber-800",
  expired: "bg-red-100 text-red-800",
  suspended: "bg-gray-200 text-gray-700",
};
const DOMAIN = {
  active: { label: "actif", cls: "bg-green-100 text-green-800" },
  pending: { label: "en attente", cls: "bg-amber-100 text-amber-800" },
  to_retry: { label: "à réessayer", cls: "bg-red-100 text-red-800" },
} as Record<string, { label: string; cls: string }>;
const METHOD: Record<string, string> = { ccp: "CCP", baridimob: "BaridiMob", chargily: "Chargily", cash: "Espèces" };

export default async function AdminStores() {
  const { db } = await requireAdmin();
  const [{ results: stores }, { results: domains }] = await Promise.all([
    db
      .prepare(
        `SELECT s.*,
                (SELECT COUNT(*) FROM orders o WHERE o.store_id = s.id AND o.created_at > datetime('now', '-30 days')) AS orders_30d,
                p.amount AS pay_amount, p.method AS pay_method, p.receipt_key AS pay_receipt, p.created_at AS pay_date
         FROM stores s
         LEFT JOIN payments p ON p.id = (SELECT id FROM payments WHERE store_id = s.id ORDER BY created_at DESC, id DESC LIMIT 1)
         ORDER BY s.expires_at`,
      )
      .all<Row>(),
    db.prepare("SELECT store_id, hostname, kind, status, last_error, checked_at FROM domains ORDER BY kind DESC").all<DomainRow>(),
  ]);

  return (
    <>
      <PageTitle fr="Boutiques" ar="المتاجر">
        <Link href="/stores/new" className="dash-btn dash-btn-primary !min-h-11 text-sm">➕ Nouvelle</Link>
      </PageTitle>
      <ul className="space-y-3">
        {stores.map((s) => {
          const state = storeState(s);
          const days = Math.ceil((Date.parse(s.expires_at) - Date.now()) / 86_400_000);
          const own = domains.filter((d) => d.store_id === s.id);
          return (
            <li key={s.id} className="dash-card space-y-3 p-4" data-testid={`store-${s.slug}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-bold">
                    {s.name} {s.request_ref && <span className="text-xs font-normal text-gray-500">· {s.request_ref}</span>}
                  </p>
                  <p className="text-sm text-gray-600">
                    {s.owner_name} · <span dir="ltr">{s.owner_phone}</span>
                    {s.owner_wilaya ? ` · ${wilayaName(s.owner_wilaya, "fr")}` : ""}
                    {s.facebook_url && (
                      <>
                        {" · "}
                        <a href={s.facebook_url} target="_blank" rel="noopener" className="underline">Facebook</a>
                      </>
                    )}
                  </p>
                </div>
                <span className={`flex-none rounded-full px-3 py-1 text-xs font-bold ${STATE[state]}`}>
                  {state === "expired" && lifecycleOf(s.expires_at) === "to_delete" ? "à supprimer" : state}
                </span>
              </div>

              <ul className="space-y-1 text-sm">
                {own.map((d) => (
                  <li key={d.hostname} className="flex flex-wrap items-center gap-2">
                    <span className="break-all font-mono text-xs">{d.hostname}</span>
                    {d.kind === "custom" && (
                      <>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${DOMAIN[d.status]?.cls ?? ""}`} data-testid="domain-status">{DOMAIN[d.status]?.label ?? d.status}</span>
                        {d.status !== "active" && (
                          <form action={checkDomain}>
                            <input type="hidden" name="hostname" value={d.hostname} />
                            <button className="rounded-lg border border-gray-300 px-2 py-1 text-xs font-semibold">↻ Vérifier maintenant</button>
                          </form>
                        )}
                        {d.last_error && <span className="w-full text-xs text-gray-500">{d.last_error}{d.checked_at ? ` (${d.checked_at.slice(5, 16)})` : ""}</span>}
                      </>
                    )}
                  </li>
                ))}
              </ul>

              <p className="text-sm text-gray-600">
                Expire le {s.expires_at.slice(0, 10)} ({days} j) · {s.orders_30d} commandes / 30 j
                {s.pay_amount && (
                  <>
                    {" · "}payé <bdi>{formatDA(s.pay_amount)}</bdi> ({METHOD[s.pay_method ?? ""] ?? s.pay_method})
                    {s.pay_receipt && (
                      <>
                        {" · "}
                        <a href={`/api/admin/media/${s.pay_receipt}`} target="_blank" rel="noopener" className="underline">reçu</a>
                      </>
                    )}
                  </>
                )}
              </p>

              <div className="grid grid-cols-2 gap-2">
                <form method="post" action="/impersonate" target="_blank" className="col-span-2">
                  <input type="hidden" name="store_id" value={s.id} />
                  <button className="dash-btn dash-btn-primary w-full !min-h-11 text-sm">🛠️ Ouvrir le tableau de bord (support)</button>
                </form>
                <div className="col-span-2">
                  <ResendWelcome storeId={s.id} storeName={s.name} />
                </div>
                <div className="col-span-2">
                  <RenewPanel storeId={s.id} storeName={s.name} amount={renewalAmount(own.some((d) => d.kind === "custom"))} />
                </div>
                <form action={toggleSuspend} className="col-span-2">
                  <input type="hidden" name="id" value={s.id} />
                  <button className="dash-btn dash-btn-danger w-full !min-h-11 text-sm">{s.status === "active" ? "Suspendre" : "Réactiver"}</button>
                </form>
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
