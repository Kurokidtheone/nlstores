"use client";
import { useMemo, useState } from "react";
import { WILAYAS } from "@/lib/algeria/wilayas";
import { normalizePhone } from "@/lib/algeria/phone";
import { formatDA } from "@/lib/format";
import { t, type TKey } from "@/lib/i18n";
import { CommuneSelect } from "./CommuneSelect";
import type { DeliveryPrice, Lang, Offer, VariantGroup } from "@/lib/types";

type Props = {
  lang: Lang;
  product: { id: number; price: number; variants: VariantGroup[]; stock: number | null };
  offers: Offer[];
  delivery: DeliveryPrice[];
};

// Totals shown here are only a preview; /api/orders recomputes everything from the database.
export function OrderForm({ lang, product, offers, delivery }: Props) {
  const tr = (k: TKey) => t(lang, k);
  const [qty, setQty] = useState(1);
  const [variant, setVariant] = useState<Record<string, string>>({});
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [wilaya, setWilaya] = useState(0);
  const [commune, setCommune] = useState("");
  const [website, setWebsite] = useState(""); // honeypot: hidden, only bots fill it
  const [address, setAddress] = useState("");
  const [deliveryType, setDeliveryType] = useState<"home" | "desk">("home");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);

  const soldOut = product.stock !== null && product.stock <= 0;
  const choices = useMemo(
    () => [{ qty: 1, total_price: product.price }, ...offers].filter((o) => product.stock === null || o.qty <= product.stock),
    [offers, product.price, product.stock],
  );
  const productsTotal = choices.find((c) => c.qty === qty)?.total_price ?? product.price;
  const dp = wilaya ? delivery[wilaya - 1] : null;
  const deliveryPrice = dp ? (deliveryType === "home" ? dp.home_price : dp.desk_price) : null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (product.variants.some((g) => !variant[g.name])) errs.variant = tr("required");
    if (name.trim().length < 2) errs.name = tr("required");
    if (!normalizePhone(phone)) errs.phone = tr("phone_invalid");
    if (!wilaya) errs.wilaya = tr("required");
    if (commune.trim().length < 2) errs.commune = tr("required");
    if (wilaya && deliveryPrice == null) errs.delivery_type = tr("not_delivered");
    setErrors(errs);
    if (Object.keys(errs).length) {
      document.querySelector<HTMLElement>(`[data-field="${Object.keys(errs)[0]}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_id: product.id, qty, variant, delivery_type: deliveryType, name, phone, wilaya, commune, address, website }),
      });
      const data = (await res.json()) as { ok: boolean; orderId?: number; error?: TKey; field?: string };
      if (data.ok && data.orderId) {
        window.location.href = `/thank-you?o=${data.orderId}`;
        return;
      }
      setErrors({ [data.field ?? "form"]: tr(data.error ?? "error_generic") });
    } catch {
      setErrors({ form: tr("error_generic") });
    }
    setSending(false);
  }

  const err = (k: string) => errors[k] && <p className="mt-1 text-sm font-medium text-red-600">{errors[k]}</p>;

  return (
    <form id="order" onSubmit={submit} noValidate className="store-card scroll-mt-20 space-y-4 p-4">
      <h2 className="store-heading text-center text-lg font-extrabold">{tr("order_form_title")}</h2>

      {product.variants.map((g) => (
        <fieldset key={g.name} data-field="variant">
          <legend className="mb-2 text-sm font-semibold">{g.name}</legend>
          <div className="flex flex-wrap gap-2">
            {g.options.map((o) => (
              <button
                key={o}
                type="button"
                aria-pressed={variant[g.name] === o}
                onClick={() => setVariant((v) => ({ ...v, [g.name]: o }))}
                className="store-option min-h-11 rounded-xl border border-[var(--line)] bg-white px-4 text-sm font-semibold"
              >
                <bdi>{o}</bdi>
              </button>
            ))}
          </div>
        </fieldset>
      ))}
      {err("variant")}

      {choices.length > 1 && (
        <fieldset>
          <legend className="mb-2 text-sm font-semibold">{tr("quantity")}</legend>
          <div className="space-y-2">
            {choices.map((c) => {
              const saving = product.price * c.qty - c.total_price;
              return (
                <label key={c.qty} className="store-option flex min-h-12 cursor-pointer items-center justify-between gap-3 rounded-xl border border-[var(--line)] bg-white px-4 py-2">
                  <span className="flex items-center gap-3">
                    <input type="radio" name="qty" checked={qty === c.qty} onChange={() => setQty(c.qty)} className="h-5 w-5 accent-[var(--brand)]" />
                    <span className="font-semibold">
                      {c.qty} {c.qty === 1 ? tr("piece") : tr("pieces")}
                    </span>
                    {saving > 0 && (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-bold text-green-700">
                        {tr("save")} <bdi>{formatDA(saving, lang)}</bdi>
                      </span>
                    )}
                  </span>
                  <bdi className="font-extrabold">{formatDA(c.total_price, lang)}</bdi>
                </label>
              );
            })}
          </div>
        </fieldset>
      )}

      <div data-field="name">
        <label className="mb-1 block text-sm font-semibold" htmlFor="o-name">{tr("full_name")}</label>
        <input id="o-name" className="store-input" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
        {err("name")}
      </div>
      <div data-field="phone">
        <label className="mb-1 block text-sm font-semibold" htmlFor="o-phone">{tr("phone")}</label>
        <input id="o-phone" className="store-input" dir="ltr" inputMode="tel" autoComplete="tel" placeholder="05 / 06 / 07 …" value={phone} onChange={(e) => setPhone(e.target.value)} />
        {err("phone")}
      </div>
      <div data-field="wilaya">
        <label className="mb-1 block text-sm font-semibold" htmlFor="o-wilaya">{tr("wilaya")}</label>
        <select id="o-wilaya" className="store-input" value={wilaya} onChange={(e) => setWilaya(Number(e.target.value))}>
          <option value={0}>{tr("choose_wilaya")}</option>
          {WILAYAS.map((w) => (
            <option key={w.code} value={w.code}>
              {String(w.code).padStart(2, "0")} - {w[lang]}
            </option>
          ))}
        </select>
        {err("wilaya")}
      </div>
      <div data-field="commune">
        <label className="mb-1 block text-sm font-semibold" htmlFor="o-commune">{tr("commune")}</label>
        <CommuneSelect id="o-commune" lang={lang} wilaya={wilaya} value={commune} onChange={setCommune} invalid={!!errors.commune} />
        {err("commune")}
      </div>
      <div>
        <label className="mb-1 block text-sm font-semibold" htmlFor="o-address">{tr("address")}</label>
        <input id="o-address" className="store-input" autoComplete="street-address" value={address} onChange={(e) => setAddress(e.target.value)} />
      </div>

      <fieldset data-field="delivery_type">
        <legend className="mb-2 text-sm font-semibold">{tr("delivery_type")}</legend>
        <div className="grid grid-cols-2 gap-2">
          {(["home", "desk"] as const).map((type) => {
            const price = dp ? (type === "home" ? dp.home_price : dp.desk_price) : null;
            return (
              <label key={type} className="store-option flex min-h-14 cursor-pointer flex-col justify-center rounded-xl border border-[var(--line)] bg-white px-3 py-2 text-sm">
                <span className="flex items-center gap-2 font-semibold">
                  <input type="radio" name="delivery" checked={deliveryType === type} onChange={() => setDeliveryType(type)} className="h-4 w-4 accent-[var(--brand)]" />
                  {tr(type)}
                </span>
                {dp && (
                  <span className="text-[var(--muted)]">{price == null ? tr("not_delivered") : <bdi>{formatDA(price, lang)}</bdi>}</span>
                )}
              </label>
            );
          })}
        </div>
        {err("delivery_type")}
      </fieldset>

      <dl className="store-soft space-y-1 rounded-xl p-3 text-sm">
        <div className="flex justify-between">
          <dt>{tr("products_price")}</dt>
          <dd><bdi>{formatDA(productsTotal, lang)}</bdi></dd>
        </div>
        <div className="flex justify-between">
          <dt>{tr("delivery_price")}</dt>
          <dd>{deliveryPrice == null ? "—" : <bdi>{formatDA(deliveryPrice, lang)}</bdi>}</dd>
        </div>
        <div className="flex justify-between border-t border-[var(--line)] pt-1 text-base font-extrabold">
          <dt>{tr("total")}</dt>
          <dd className="store-brand"><bdi>{formatDA(productsTotal + (deliveryPrice ?? 0), lang)}</bdi></dd>
        </div>
      </dl>

      <div aria-hidden="true" style={{ position: "absolute", left: "-10000px", width: 1, height: 1, overflow: "hidden" }}>
        <label>
          Website
          <input name="website" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
        </label>
      </div>
      {err("form")}
      <button type="submit" disabled={sending || soldOut} className="store-btn store-pulse min-h-14 w-full text-lg">
        {soldOut ? tr("out_of_stock") : sending ? tr("sending") : tr("confirm_order")}
      </button>
      <p className="text-center text-xs text-[var(--muted)]">🚚 {tr("cod")}</p>
    </form>
  );
}
