import { redirect } from "next/navigation";
import { getDesign } from "@/designs/registry";
import { ProductGrid } from "@/designs/shared/ProductGrid";
import { listProducts } from "@/lib/catalog";
import { getDb } from "@/lib/db";
import { requireStore } from "@/lib/tenant";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

// Home: a store with one product opens straight on its landing page, otherwise the catalog.
export default async function StoreHome({ searchParams }: Props) {
  const store = await requireStore();
  const products = await listProducts(await getDb(), store.id, { visibleOnly: true });
  if (products.length === 1) {
    // keep ?preview_design=… from Settings on the way to the product page
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(await searchParams)) if (k.startsWith("preview_") && typeof v === "string") q.set(k, v);
    redirect(`/p/${products[0].slug}${q.size ? `?${q}` : ""}`);
  }
  return <ProductGrid products={products} lang={store.lang} design={getDesign(store.design)} />;
}
