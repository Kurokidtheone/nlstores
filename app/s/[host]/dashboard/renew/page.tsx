import Link from "next/link";
import { ImpersonationBanner } from "@/components/dash/ImpersonationBanner";
import { waLink } from "@/lib/algeria/phone";
import { BILLING, storeRenewalAmount } from "@/lib/billing";
import { formatDA } from "@/lib/format";
import { sellerRenewRequest } from "@/lib/renewal";
import { dmy, storeState } from "@/lib/store-state";
import { requireSeller } from "@/lib/tenant";
import { logout } from "../actions";

// Renewal screen. Shown INSTEAD of the dashboard once the store is expired (after the 7-day
// grace), and reachable from the renewal banner before that. Outside (app): no nav bar.
export default async function RenewPage() {
  const { store, db, host, impersonating } = await requireSeller({ renewScreen: true });
  const amount = await storeRenewalAmount(db, store.id);
  const expired = storeState(store) === "expired";
  const { ccp, baridimob } = BILLING;
  const row = (label: string, ar: string, value: string) => (
    <div className="flex items-center justify-between gap-3 border-b border-gray-100 py-2 last:border-0">
      <span className="text-sm text-gray-600">
        {label} · <span className="ar">{ar}</span>
      </span>
      <span className="select-all font-mono font-bold" dir="ltr">{value}</span>
    </div>
  );
  return (
    <>
      {impersonating && <ImpersonationBanner storeName={store.name} />}
      <main className="mx-auto max-w-md space-y-4 px-4 py-8">
        {!expired && (
          <Link href="/dashboard" className="inline-block text-sm text-gray-600">← Tableau de bord · لوحة التحكم</Link>
        )}
        <div className={`rounded-2xl p-4 ${expired ? "bg-red-100 text-red-900" : "bg-amber-100 text-amber-900"}`}>
          <h1 className="text-xl font-extrabold">
            {expired ? "Votre boutique est désactivée" : "Renouveler mon abonnement"}
          </h1>
          <p className="ar text-lg">{expired ? "متجرك متوقف" : "تجديد اشتراكي"}</p>
          <p className="mt-2 text-sm">
            {store.name} · fin le <b>{dmy(store.expires_at)}</b> · <span className="ar">انتهى في</span>
          </p>
          {expired && (
            <p className="mt-1 text-sm">
              Vos produits et commandes sont gardés : tout revient dès le renouvellement.
              <span className="ar block">منتجاتك وطلباتك محفوظة: يعود كل شيء بعد التجديد.</span>
            </p>
          )}
        </div>
        <section className="dash-card space-y-1 p-4">
          <p className="text-sm text-gray-600">Renouvellement 1 an · <span className="ar">التجديد لسنة</span></p>
          <p className="text-3xl font-black"><bdi>{formatDA(amount)}</bdi></p>
        </section>
        <section className="dash-card p-4">
          <h2 className="mb-1 font-bold">💳 CCP</h2>
          {row("Compte", "الحساب", ccp.account)}
          {row("Clé", "المفتاح", ccp.key)}
          {row("Nom", "الاسم", ccp.holder)}
          <h2 className="mb-1 mt-4 font-bold">📱 BaridiMob</h2>
          {row("RIP", "RIP", baridimob.rip)}
        </section>
        <p className="text-center text-sm text-gray-600">
          Après le paiement, envoyez la photo du reçu sur WhatsApp.
          <span className="ar block">بعد الدفع، أرسل صورة الوصل على واتساب.</span>
        </p>
        <a
          href={waLink(BILLING.whatsapp, sellerRenewRequest(store.lang, store.name, host))}
          target="_blank"
          rel="noopener"
          className="dash-btn min-h-14 w-full bg-[#25d366] text-lg text-white"
        >
          💬 Envoyer le reçu · <span className="ar">أرسل الوصل</span>
        </a>
        {!impersonating && (
          <form action={logout}>
            <button className="dash-btn w-full text-gray-500">Se déconnecter · <span className="ar">خروج</span></button>
          </form>
        )}
      </main>
    </>
  );
}
