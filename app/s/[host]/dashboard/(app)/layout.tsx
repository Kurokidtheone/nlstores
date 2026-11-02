import { ImpersonationBanner } from "@/components/dash/ImpersonationBanner";
import { NavBar } from "@/components/dash/NavBar";
import { RenewalBanner } from "@/components/dash/RenewalBanner";
import { storeRenewalAmount } from "@/lib/billing";
import { BANNER_DAYS, daysLeft } from "@/lib/store-state";
import { requireSeller } from "@/lib/tenant";

export default async function SellerLayout({ children }: { children: React.ReactNode }) {
  const { store, db, host, impersonating } = await requireSeller();
  const showRenewal = daysLeft(store.expires_at) <= BANNER_DAYS;
  return (
    <>
      {impersonating && <ImpersonationBanner storeName={store.name} />}
      {showRenewal && (
        <div className="px-4">
          <RenewalBanner store={store} host={host} amount={await storeRenewalAmount(db, store.id)} />
        </div>
      )}
      <main className="mx-auto max-w-2xl px-4 pb-28 pt-4">{children}</main>
      <NavBar />
    </>
  );
}
