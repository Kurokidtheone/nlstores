import Link from "next/link";
import { formatDA } from "@/lib/format";
import { t } from "@/lib/i18n";
import { mediaUrl } from "@/lib/media";
import type { Design } from "@/designs/registry";
import type { Lang, Product } from "@/lib/types";
import { Placeholder } from "./Placeholder";

type Props = { products: Product[]; lang: Lang; design: Design; storeName?: string };

export function ProductGrid({ products, lang, design, storeName }: Props) {
  if (products.length === 0) return <p className="py-16 text-center text-[var(--muted)]">{t(lang, "no_products")}</p>;
  const aspect = design.options.gallery === "portrait" ? "aspect-[3/4]" : "aspect-square";
  return (
    <>
      {design.options.homeHero && storeName && (
        <section className="store-home-hero px-4 pt-4">
          <div className="store-home-hero-inner rounded-[var(--radius)] px-6 py-10 text-center">
            <h1 className="store-heading text-3xl font-extrabold leading-tight">{storeName}</h1>
            <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-[var(--muted)]">{t(lang, "home_promise")}</p>
            <a href="#products" className="store-btn mt-5 inline-flex min-h-12 items-center justify-center px-8">{t(lang, "shop_now")}</a>
          </div>
        </section>
      )}
      <section id="products" className="mx-auto max-w-5xl scroll-mt-16 px-4 py-6">
        <h2 className="store-heading store-section-title mb-4 text-2xl font-extrabold">{t(lang, "our_products")}</h2>
        <ul className={`grid gap-3 ${design.options.gridCols === 1 ? "grid-cols-1" : "grid-cols-2"} md:grid-cols-3 lg:grid-cols-4`}>
          {products.map((p, i) => {
            const discount = p.old_price ? Math.round((1 - p.price / p.old_price) * 100) : 0;
            return (
              <li key={p.id}>
                <Link href={`/p/${p.slug}`} className="store-card store-product-card block overflow-hidden">
                  <div className={`relative ${aspect} overflow-hidden bg-[var(--soft)]`}>
                    {p.images[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={mediaUrl(p.images[0])}
                        alt={p.name}
                        width={400}
                        height={400}
                        loading={i < 2 ? "eager" : "lazy"}
                        decoding="async"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Placeholder name={p.name} />
                    )}
                    {discount > 0 && <span className="store-accent absolute start-2 top-2 rounded-full px-2 py-0.5 text-xs font-bold" dir="ltr">-{discount}%</span>}
                  </div>
                  <div className="p-3">
                    <h3 className="line-clamp-2 text-sm font-semibold">{p.name}</h3>
                    <p className="mt-1 flex flex-wrap items-baseline gap-x-2">
                      <bdi className="store-brand text-lg font-extrabold">{formatDA(p.price, lang)}</bdi>
                      {p.old_price && <bdi className="text-xs text-[var(--muted)] line-through">{formatDA(p.old_price, lang)}</bdi>}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}
