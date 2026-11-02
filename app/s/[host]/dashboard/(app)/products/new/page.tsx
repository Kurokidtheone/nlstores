import Link from "next/link";
import { PageTitle } from "@/components/dash/ui";
import { requireSeller } from "@/lib/tenant";
import { NewProductForm } from "./NewProductForm";

export default async function NewProductPage() {
  await requireSeller();
  return (
    <>
      <Link href="/dashboard/products" className="mb-3 inline-block text-sm text-gray-600">← Produits · المنتجات</Link>
      <PageTitle fr="Nouveau produit" ar="منتج جديد" />
      <NewProductForm />
    </>
  );
}
