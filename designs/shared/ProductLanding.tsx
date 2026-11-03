import { formatDA } from "@/lib/format";
import { t } from "@/lib/i18n";
import { mediaUrl } from "@/lib/media";
import type { Design } from "@/designs/registry";
import type { DeliveryPrice, Lang, Offer, Product, SectionKey } from "@/lib/types";
import { Gallery } from "./Gallery";
import { OrderForm } from "./OrderForm";
import { StickyCta } from "./StickyCta";
import { TrustStrip } from "./TrustStrip";
import { VideoEmbed } from "./VideoEmbed";

type Props = {
  lang: Lang;
  design: Design;
  product: Product;
  offers: Offer[];
  delivery: DeliveryPrice[];
  previewHidden?: boolean;
};

/** The product landing page shared by every design. Each section honours sections.hide. */
export function ProductLanding({ lang, design, product: p, offers, delivery, previewHidden }: Props) {
  const tr = (k: Parameters<typeof t>[1]) => t(lang, k);
  const show = (k: SectionKey) => !p.sections.hide.includes(k);
  const discount = p.old_price ? Math.round((1 - p.price / p.old_price) * 100) : 0;
  const formFirst = design.options.layout === "formFirst";
  const framed = design.options.hero === "framed";

  const description = p.description ? <p className="store-description whitespace-pre-line leading-relaxed text-[var(--muted)]">{p.description}</p> : null;
  const benefits =
    show("benefits") && p.sections.benefits.length > 0 ? (
      <section className="px-4 pt-6">
        <h2 className="store-heading store-section-title mb-3 text-xl font-extrabold">{tr("benefits")}</h2>
        <ul className="store-card store-benefits space-y-2 p-4">
          {p.sections.benefits.map((b, i) => (
            <li key={i} className="flex gap-2">
              <span className="store-brand font-black" aria-hidden>✓</span>
              <span>{b}</span>
            </li>
          ))}
        </ul>
      </section>
    ) : null;
  const orderForm = (
    <section className="px-4 pt-6">
      <OrderForm lang={lang} product={{ id: p.id, price: p.price, variants: p.variants, stock: p.stock }} offers={offers} delivery={delivery} />
    </section>
  );

  return (
    <article className="mx-auto max-w-xl pb-6">
      {previewHidden && <p className="bg-amber-100 px-4 py-2 text-center text-sm font-semibold text-amber-900">{tr("preview_hidden")}</p>}

      <div className={`store-hero px-4 pt-4 ${framed ? "store-hero-framed" : ""}`}>
        <div className="relative">
          <Gallery images={p.images} name={p.name} portrait={design.options.gallery === "portrait"} />
          {framed && discount > 0 && <span className="store-hero-badge store-accent absolute start-3 top-3 rounded-full px-3 py-1 text-sm font-bold" dir="ltr">-{discount}%</span>}
        </div>
      </div>

      <header className="store-product-head space-y-3 px-4 pt-4">
        <h1 className="store-heading store-product-title text-2xl font-extrabold leading-tight">{p.name}</h1>
        <p className="store-price-row flex flex-wrap items-baseline gap-x-3">
          <bdi className="store-price store-brand text-3xl font-black">{formatDA(p.price, lang)}</bdi>
          {p.old_price && <bdi className="store-old-price text-lg text-[var(--muted)] line-through">{formatDA(p.old_price, lang)}</bdi>}
          {!framed && discount > 0 && <span className="store-accent rounded-full px-2 py-0.5 text-sm font-bold" dir="ltr">-{discount}%</span>}
        </p>
        <TrustStrip lang={lang} />
        {!formFirst && description}
      </header>

      {!formFirst && benefits}
      {orderForm}
      {formFirst && p.description && <div className="px-4 pt-6">{description}</div>}
      {formFirst && benefits}

      {p.video_url && (
        <section className="px-4 pt-6">
          <VideoEmbed url={p.video_url} title={p.name} />
        </section>
      )}

      {show("steps") && p.sections.steps.length > 0 && (
        <section className="px-4 pt-6">
          <h2 className="store-heading store-section-title mb-3 text-xl font-extrabold">{tr("how_to_use")}</h2>
          <ol className="space-y-2">
            {p.sections.steps.map((s, i) => (
              <li key={i} className="store-card flex items-start gap-3 p-3">
                <span className="store-btn flex h-8 w-8 flex-none items-center justify-center rounded-full text-sm">{i + 1}</span>
                <span className="pt-1">{s}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {show("reviews") && p.sections.reviews.length > 0 && (
        <section className="px-4 pt-6">
          <h2 className="store-heading store-section-title mb-3 text-xl font-extrabold">{tr("reviews")}</h2>
          <div className="grid grid-cols-2 gap-2">
            {p.sections.reviews.map((k) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={k} src={mediaUrl(k)} alt="" loading="lazy" decoding="async" width={300} height={400} className="store-img h-auto w-full border border-[var(--line)]" />
            ))}
          </div>
        </section>
      )}

      {show("faq") && p.sections.faq.length > 0 && (
        <section className="px-4 pt-6">
          <h2 className="store-heading store-section-title mb-3 text-xl font-extrabold">{tr("faq")}</h2>
          <div className="space-y-2">
            {p.sections.faq.map((f, i) => (
              <details key={i} className="store-card group p-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-semibold">
                  {f.q}
                  <span className="store-brand text-xl transition group-open:rotate-45">+</span>
                </summary>
                <p className="mt-2 whitespace-pre-line text-[var(--muted)]">{f.a}</p>
              </details>
            ))}
          </div>
        </section>
      )}

      <StickyCta>
        <a href="#order" className="store-btn mx-auto flex min-h-14 max-w-xl items-center justify-center gap-2 text-lg">
          {tr("order_now")} · <bdi>{formatDA(p.price, lang)}</bdi>
        </a>
      </StickyCta>
    </article>
  );
}
