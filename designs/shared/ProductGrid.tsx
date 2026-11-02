import Link from "next/link";
import { formatDA } from "@/lib/format";
import { t } from "@/lib/i18n";
import { mediaUrl } from "@/lib/media";
import type { Design } from "@/designs/registry";
import type { Lang, Product } from "@/lib/types";
import { Placeholder } from "./Placeholder";

export function ProductGrid({ products, lang, design }: { products: Product[]; lang: Lang; design: Design }) {
  if (products.length === 0) return <p className="py-16 text-center text-[var(--muted)]">{t(lang, "no_products")}</p>;
  const aspect = design.options.gallery === "portrait" ? "aspect-[3/4]" : "aspect-square";
  return (
    <section className="mx-auto max-w-5xl px-4 py-6">
      <h1 className="store-heading mb-4 text-2xl font-extrabold">{t(lang, "our_products")}</h1>
      <ul className={`grid gap-3 ${design.options.gridCols === 1 ? "grid-cols-1" : "grid-cols-2"} md:grid-cols-3 lg:grid-cols-4`}>
        {products.map((p) => (
          <li key={p.id}>
            <Link href={`/p/${p.slug}`} className="store-card block overflow-hidden">
              <div className={`${aspect} overflow-hidden bg-[var(--soft)]`}>
                {p.images[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={mediaUrl(p.images[0])} alt={p.name} loading="lazy" className="h-full w-full object-cover" />
                ) : (
                  <Placeholder name={p.name} />
                )}
              </div>
              <div className="p-3">
                <h2 className="line-clamp-2 text-sm font-semibold">{p.name}</h2>
                <p className="mt-1 flex flex-wrap items-baseline gap-x-2">
                  <bdi className="store-brand font-extrabold">{formatDA(p.price, lang)}</bdi>
                  {p.old_price && <bdi className="text-xs text-[var(--muted)] line-through">{formatDA(p.old_price, lang)}</bdi>}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
