import Link from "next/link";
import { waLink } from "@/lib/algeria/phone";
import { BILLING } from "@/lib/billing";
import { formatDA } from "@/lib/format";
import { sellerRenewRequest } from "@/lib/renewal";
import { BANNER_DAYS, daysLeft, dmy } from "@/lib/store-state";
import type { Store } from "@/lib/types";

/** From 30 days before expiry: end date, amount, WhatsApp button to renew */
export function RenewalBanner({ store, host, amount }: { store: Store; host: string; amount: number }) {
  const days = daysLeft(store.expires_at);
  if (store.status === "suspended" || days > BANNER_DAYS) return null;
  const urgent = days <= 7;
  const when =
    days > 0
      ? { fr: `Votre abonnement se termine le ${dmy(store.expires_at)} (dans ${days} j)`, ar: `ينتهي اشتراكك يوم ${dmy(store.expires_at)} (بعد ${days} يوم)` }
      : days === 0
        ? { fr: "Votre abonnement se termine aujourd'hui", ar: "ينتهي اشتراكك اليوم" }
        : { fr: `Abonnement terminé le ${dmy(store.expires_at)} : renouvelez avant la fermeture`, ar: `انتهى الاشتراك يوم ${dmy(store.expires_at)}: جدد قبل غلق المتجر` };
  return (
    <section
      className={`mx-auto mt-3 max-w-2xl rounded-2xl border-2 p-4 ${urgent ? "border-red-300 bg-red-50 text-red-900" : "border-amber-300 bg-amber-50 text-amber-900"}`}
      data-testid="renewal-banner"
    >
      <p className="font-bold">⏳ {when.fr}</p>
      <p className="ar text-sm">{when.ar}</p>
      <p className="mt-1 text-sm">
        Renouvellement 1 an : <bdi className="font-bold">{formatDA(amount)}</bdi> · <span className="ar">التجديد لسنة</span>
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <a
          href={waLink(BILLING.whatsapp, sellerRenewRequest(store.lang, store.name, host))}
          target="_blank"
          rel="noopener"
          className="dash-btn bg-[#25d366] !min-h-12 text-sm text-white"
        >
          💬 Renouveler · <span className="ar">جدد</span>
        </a>
        <Link href="/dashboard/renew" className="dash-btn dash-btn-ghost !min-h-12 text-sm">
          Comment payer · <span className="ar">طريقة الدفع</span>
        </Link>
      </div>
    </section>
  );
}
