// Validation of the admin "new store" screen. Pure functions: the server re-checks everything.
import { DESIGNS } from "@/designs/registry";
import { isWilaya } from "./algeria/wilayas";
import { normalizePhone } from "./algeria/phone";
import { PAYMENT_METHODS, type PaymentMethod } from "./plans";
import { LIMITS, toInt } from "./products";
import type { Lang } from "./types";

export const RESERVED_SLUGS = ["admin", "www", "api", "stores", "app", "mail", "demo-admin", "support", "help"];
export const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{0,30}[a-z0-9])?$/;
export const STAGING_KEY_RE = /^staging\/[a-f0-9-]{36}\.(webp|jpg|png)$/;
export const RECEIPT_KEY_RE = /^receipts\/[a-f0-9-]{36}\.(webp|jpg|png)$/;
export const QUICK_PRODUCTS = 5;
export const QUICK_PHOTOS = 6;

export type QuickProduct = { name: string; price: number; old_price: number | null; photos: string[] };

export type NewStore = {
  client: { name: string; phone: string; wilaya: number; facebook: string | null; request_ref: string | null };
  store: { name: string; slug: string; design: string; lang: Lang; custom_domain: string | null };
  payment: { amount: number; method: PaymentMethod; receipt_key: string | null; start: string };
  products: QuickProduct[];
};

export type Errors = Record<string, string>;

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const str = (v: unknown, max = 500) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "");

/** "https://www.Boutique.com/x" -> "www.boutique.com" (custom domains always live on www) */
export function normalizeCustomDomain(raw: string): string | null {
  const apex = raw
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/[/?#].*$/, "")
    .replace(/^www\./, "");
  if (!apex) return null;
  return /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/.test(apex) ? `www.${apex}` : "invalid";
}

export function slugProblem(slug: string): string | null {
  if (!SLUG_RE.test(slug)) return "Lettres a-z, chiffres et tirets (2 à 32)";
  if (slug.length < 2) return "2 caractères minimum";
  if (RESERVED_SLUGS.includes(slug)) return "Nom réservé";
  return null;
}

export function validateNewStore(raw: unknown, rootDomain: string): { ok: true; value: NewStore } | { ok: false; errors: Errors } {
  const e: Errors = {};
  const o = isObj(raw) ? raw : {};
  const c = isObj(o.client) ? o.client : {};
  const s = isObj(o.store) ? o.store : {};
  const p = isObj(o.payment) ? o.payment : {};

  // Client
  const clientName = str(c.name, 80);
  if (clientName.length < 2) e["client.name"] = "Nom du client obligatoire";
  const phone = normalizePhone(str(c.phone, 20));
  if (!phone) e["client.phone"] = "Téléphone invalide (05 / 06 / 07 + 8 chiffres)";
  const wilaya = Number(c.wilaya);
  if (!isWilaya(wilaya)) e["client.wilaya"] = "Choisissez la wilaya";
  const facebook = str(c.facebook, 300) || null;
  if (facebook) {
    try {
      const u = new URL(facebook);
      if (!/^https?:$/.test(u.protocol) || !/(^|\.)(facebook\.com|fb\.com|fb\.me)$/.test(u.hostname)) throw new Error();
    } catch {
      e["client.facebook"] = "Lien Facebook invalide (https://facebook.com/…)";
    }
  }
  const requestRef = str(c.request_ref, 20).toUpperCase() || null;
  if (requestRef && !/^[A-Z0-9-]{2,20}$/.test(requestRef)) e["client.request_ref"] = "Ex. ST-0042";

  // Store
  const storeName = str(s.name, 60);
  if (storeName.length < 2) e["store.name"] = "Nom de la boutique obligatoire";
  const slug = str(s.slug, 40).toLowerCase();
  const slugErr = slugProblem(slug);
  if (slugErr) e["store.slug"] = slugErr;
  const design = str(s.design, 20);
  if (!DESIGNS.some((d) => d.id === design)) e["store.design"] = "Choisissez un design";
  const lang: Lang = s.lang === "fr" ? "fr" : "ar";
  const domainRaw = str(s.custom_domain, 255);
  const customDomain = domainRaw ? normalizeCustomDomain(domainRaw) : null;
  if (customDomain === "invalid") e["store.custom_domain"] = "Domaine invalide (ex. maboutique.com)";
  else if (customDomain && (customDomain.endsWith(`.${rootDomain}`) || customDomain === `www.${rootDomain}`))
    e["store.custom_domain"] = "C'est notre domaine : laissez vide pour un sous-domaine";

  // Payment
  const amount = toInt(p.amount);
  if (amount === null || Number.isNaN(amount) || amount < 1000 || amount > 1_000_000) e["payment.amount"] = "Montant invalide (DA)";
  const method = str(p.method, 20) as PaymentMethod;
  if (!PAYMENT_METHODS.some((m) => m.id === method)) e["payment.method"] = "Choisissez le moyen de paiement";
  const receipt = str(p.receipt_key, 80) || null;
  if (receipt && !RECEIPT_KEY_RE.test(receipt)) e["payment.receipt_key"] = "Reçu invalide";
  const start = str(p.start, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || Number.isNaN(Date.parse(`${start}T00:00:00Z`))) e["payment.start"] = "Date invalide";

  // Quick products (rows left completely empty are ignored)
  const products: QuickProduct[] = [];
  const rows = Array.isArray(o.products) ? o.products.slice(0, QUICK_PRODUCTS) : [];
  rows.forEach((r, i) => {
    const row = isObj(r) ? r : {};
    const name = str(row.name, LIMITS.name);
    const price = toInt(row.price);
    const old = toInt(row.old_price);
    const photos = Array.isArray(row.photos) ? row.photos.filter((k): k is string => typeof k === "string") : [];
    if (!name && price === null && old === null && photos.length === 0) return;
    const key = `products.${i}`;
    if (name.length < 2) e[key] = `Produit ${i + 1} : nom obligatoire`;
    else if (price === null || Number.isNaN(price) || price < 1 || price > LIMITS.maxPrice) e[key] = `Produit ${i + 1} : prix invalide`;
    else if (old !== null && (Number.isNaN(old) || old <= price)) e[key] = `Produit ${i + 1} : l'ancien prix doit être plus élevé`;
    else if (photos.length > QUICK_PHOTOS || new Set(photos).size !== photos.length || photos.some((k) => !STAGING_KEY_RE.test(k)))
      e[key] = `Produit ${i + 1} : photos invalides (${QUICK_PHOTOS} max.)`;
    else products.push({ name, price, old_price: old, photos });
  });

  if (Object.keys(e).length) return { ok: false, errors: e };
  return {
    ok: true,
    value: {
      client: { name: clientName, phone: phone!, wilaya, facebook, request_ref: requestRef },
      store: { name: storeName, slug, design, lang, custom_domain: customDomain },
      payment: { amount: amount!, method, receipt_key: receipt, start },
      products,
    },
  };
}
