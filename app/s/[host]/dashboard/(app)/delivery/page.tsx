import { PageTitle } from "@/components/dash/ui";
import { getDeliveryPrices } from "@/lib/catalog";
import { requireSeller } from "@/lib/tenant";
import { DeliveryForm } from "./DeliveryForm";

export default async function DeliveryPage() {
  const { store, db } = await requireSeller();
  const prices = await getDeliveryPrices(db, store.id);
  return (
    <>
      <PageTitle fr="Prix de livraison" ar="أسعار التوصيل" />
      <DeliveryForm prices={prices} />
    </>
  );
}
