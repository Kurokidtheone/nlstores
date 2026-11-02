import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDesign } from "@/designs/registry";
import { ProductLanding } from "@/designs/shared/ProductLanding";
import { getDeliveryPrices, getOffers, getProductBySlug } from "@/lib/catalog";
import { getDb } from "@/lib/db";
import { mediaUrl } from "@/lib/media";
import { currentStore, isSellerOf, requireStore } from "@/lib/tenant";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const store = await currentStore();
  if (!store) return {};
  const p = await getProductBySlug(await getDb(), store.id, (await params).slug);
  if (!p) return {};
  return {
    title: `${p.name} | ${store.name}`,
    description: p.description.slice(0, 160),
    openGraph: p.images[0] ? { images: [mediaUrl(p.images[0])] } : undefined,
  };
}

export default async function ProductPage({ params }: Props) {
  const store = await requireStore();
  const db = await getDb();
  const product = await getProductBySlug(db, store.id, (await params).slug);
  if (!product) notFound();
  // Hidden products are only visible to their seller (the "Preview" button in the editor)
  const previewHidden = !product.visible;
  if (previewHidden && !(await isSellerOf(store))) notFound();

  const [offers, delivery] = await Promise.all([getOffers(db, store.id, product.id), getDeliveryPrices(db, store.id)]);
  return (
    <ProductLanding
      lang={store.lang}
      design={getDesign(store.design)}
      product={product}
      offers={offers}
      delivery={delivery}
      previewHidden={previewHidden}
    />
  );
}
