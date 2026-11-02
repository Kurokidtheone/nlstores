import { NavBar } from "@/components/dash/NavBar";
import { requireSeller, storeState } from "@/lib/tenant";

export default async function SellerLayout({ children }: { children: React.ReactNode }) {
  const { store } = await requireSeller();
  return (
    <>
      {storeState(store) === "grace" && (
        <p className="bg-amber-100 px-4 py-2 text-center text-sm font-semibold text-amber-900">
          Abonnement expiré : renouvelez sous 7 jours · <span className="ar">انتهى الاشتراك: جدد خلال 7 أيام</span>
        </p>
      )}
      <main className="mx-auto max-w-2xl px-4 pb-28 pt-4">{children}</main>
      <NavBar />
    </>
  );
}
