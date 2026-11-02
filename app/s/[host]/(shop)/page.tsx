import { redirect } from "next/navigation";
import { getDesign } from "@/designs/registry";
import { ProductGrid } from "@/designs/shared/ProductGrid";
import { listProducts } from "@/lib/catalog";
import { getDb } from "@/lib/db";
import { requireStore } from "@/lib/tenant";

// Home: a store with one product opens straight on its landing page, otherwise the catalog.
export default async function StoreHome() {
  const store = await requireStore();
  const products = await listProducts(await getDb(), store.id, { visibleOnly: true });
  if (products.length === 1) redirect(`/p/${products[0].slug}`);
  return <ProductGrid products={products} lang={store.lang} design={getDesign(store.design)} />;
}
