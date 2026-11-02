import { notFound } from "next/navigation";
import { getOffers, getProductById } from "@/lib/catalog";
import { requireSeller } from "@/lib/tenant";
import { ProductEditor } from "./ProductEditor";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { store, db } = await requireSeller();
  const id = Number((await params).id);
  const product = Number.isInteger(id) ? await getProductById(db, store.id, id) : null;
  if (!product) notFound();
  const offers = await getOffers(db, store.id, product.id);
  return <ProductEditor key={product.id} product={product} offers={offers} />;
}
