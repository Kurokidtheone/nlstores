import Link from "next/link";
import { PageTitle } from "@/components/dash/ui";
import { listProducts } from "@/lib/catalog";
import { formatDA } from "@/lib/format";
import { mediaUrl } from "@/lib/media";
import { requireSeller } from "@/lib/tenant";
import { moveProduct } from "../../actions";

export default async function ProductsPage() {
  const { store, db } = await requireSeller();
  const products = await listProducts(db, store.id);

  if (products.length === 0) {
    return (
      <>
        <PageTitle fr="Produits" ar="المنتجات" />
        <div className="dash-card flex flex-col items-center gap-4 px-6 py-12 text-center">
          <span className="text-6xl" aria-hidden>🛍️</span>
          <p className="text-gray-600">
            Votre boutique est vide. <span className="ar block">متجرك فارغ.</span>
          </p>
          <Link href="/dashboard/products/new" className="dash-btn dash-btn-primary min-h-16 w-full text-lg">
            ➕ Ajouter votre premier produit
          </Link>
          <span className="ar -mt-2 text-gray-500">أضف منتجك الأول</span>
        </div>
      </>
    );
  }

  return (
    <>
      <PageTitle fr="Produits" ar="المنتجات">
        <Link href="/dashboard/products/new" className="dash-btn dash-btn-primary !min-h-11 text-sm">➕ Ajouter · <span className="ar">إضافة</span></Link>
      </PageTitle>
      <p className="mb-3 text-sm text-gray-500">
        L&apos;ordre ici = l&apos;ordre dans la boutique. <span className="ar block">الترتيب هنا = الترتيب في المتجر.</span>
      </p>
      <ul className="space-y-2">
        {products.map((p, i) => (
          <li key={p.id} className="dash-card flex items-center gap-2 p-2">
            <Link href={`/dashboard/products/${p.id}`} className="flex min-w-0 flex-1 items-center gap-3">
              <div className="h-16 w-16 flex-none overflow-hidden rounded-xl bg-gray-100">
                {p.images[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={mediaUrl(p.images[0])} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full items-center justify-center text-2xl" aria-hidden>📷</span>
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate font-bold">{p.name}</p>
                <p className="text-sm"><bdi>{formatDA(p.price)}</bdi></p>
                <p className="flex flex-wrap gap-1 text-xs">
                  {!p.visible && <span className="rounded-full bg-gray-200 px-2 py-0.5 font-semibold text-gray-700">Masqué · مخفي</span>}
                  {p.stock !== null && p.stock <= 0 && <span className="rounded-full bg-red-100 px-2 py-0.5 font-semibold text-red-700">Rupture · نفد</span>}
                  <span className="text-[var(--brand)] underline">Modifier · تعديل</span>
                </p>
              </div>
            </Link>
            <div className="flex flex-none flex-col gap-1">
              <form action={moveProduct}>
                <input type="hidden" name="id" value={p.id} />
                <input type="hidden" name="dir" value="up" />
                <button className="dash-icon-btn" disabled={i === 0} aria-label="Monter">▲</button>
              </form>
              <form action={moveProduct}>
                <input type="hidden" name="id" value={p.id} />
                <input type="hidden" name="dir" value="down" />
                <button className="dash-icon-btn" disabled={i === products.length - 1} aria-label="Descendre">▼</button>
              </form>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
