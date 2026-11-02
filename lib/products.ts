// Product model helpers shared by the server (validation, DB rows) and the editor (slugify, limits).
// No server-only imports here: the editor imports it too.
import { SECTION_KEYS, type FaqItem, type Msg, type Offer, type Product, type SectionKey, type Sections, type VariantGroup } from "./types";
import { videoEmbed } from "./video";

export const LIMITS = {
  name: 120,
  slug: 80,
  description: 5000,
  maxPrice: 10_000_000,
  maxStock: 1_000_000,
  images: 10,
  groups: 5,
  groupName: 40,
  options: 30,
  optionName: 40,
  offers: 6,
  offerQty: 50,
  listItems: 12,
  line: 160,
  step: 300,
  faqQ: 200,
  faqA: 800,
  reviews: 12,
} as const;

export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, LIMITS.slug)
    .replace(/-+$/, "");
}

export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const EMPTY_SECTIONS: Sections = { benefits: [], steps: [], reviews: [], faq: [], hide: [] };

const strArr = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);

/** Tolerant reader for the sections JSON column (old or partial data never crashes a page) */
export function readSections(v: unknown): Sections {
  const o = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
  return {
    benefits: strArr(o.benefits),
    steps: strArr(o.steps),
    reviews: strArr(o.reviews),
    faq: Array.isArray(o.faq)
      ? o.faq
          .filter((f): f is FaqItem => !!f && typeof f === "object" && typeof f.q === "string" && typeof f.a === "string")
          .map((f) => ({ q: f.q, a: f.a }))
      : [],
    hide: strArr(o.hide).filter((k): k is SectionKey => (SECTION_KEYS as readonly string[]).includes(k)),
  };
}

export function readVariants(v: unknown): VariantGroup[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter((g) => g && typeof g === "object" && typeof g.name === "string")
    .map((g) => ({ name: g.name as string, options: strArr(g.options) }));
}

function json(text: unknown): unknown {
  if (typeof text !== "string") return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

export type ProductRow = Record<string, unknown>;

export function rowToProduct(r: ProductRow): Product {
  return {
    id: Number(r.id),
    store_id: Number(r.store_id),
    slug: String(r.slug),
    name: String(r.name),
    description: String(r.description ?? ""),
    price: Number(r.price),
    old_price: r.old_price == null ? null : Number(r.old_price),
    stock: r.stock == null ? null : Number(r.stock),
    images: strArr(json(r.images)),
    video_url: (r.video_url as string | null) ?? null,
    variants: readVariants(json(r.variants)),
    sections: readSections(json(r.sections)),
    visible: Number(r.visible) === 1,
    sort: Number(r.sort ?? 0),
    is_sample: Number(r.is_sample ?? 0) === 1,
  };
}

// ---------- editor payload validation (server side) ----------

export type ProductInput = {
  name: string;
  slug: string;
  description: string;
  price: number;
  old_price: number | null;
  stock: number | null;
  visible: boolean;
  images: string[];
  video_url: string | null;
  variants: VariantGroup[];
  offers: Offer[];
  sections: Sections;
};

export type FieldErrors = Partial<Record<string, Msg>>;

export function storeKeyRe(storeId: number): RegExp {
  return new RegExp(`^stores/${storeId}/[a-z0-9-]{8,64}\\.(webp|jpg|png)$`);
}

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const clean = (v: unknown) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim() : "");
const cleanMultiline = (v: unknown) =>
  typeof v === "string" ? v.replace(/\r\n?/g, "\n").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim() : "";

/** Integer DA from a number or a string like "5 200" / "5,200". Empty -> null. Invalid -> NaN. */
export function toInt(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return Number.isInteger(v) ? v : NaN;
  if (typeof v !== "string") return NaN;
  const s = v.replace(/[\s,.  ]/g, "");
  if (s === "") return null;
  return /^\d+$/.test(s) ? Number(s) : NaN;
}

export function validateProductInput(
  raw: unknown,
  storeId: number,
): { ok: true; value: ProductInput } | { ok: false; errors: FieldErrors } {
  const e: FieldErrors = {};
  const o = isObj(raw) ? raw : {};

  const name = clean(o.name);
  if (name.length < 2) e.name = { fr: "Le nom est obligatoire (2 caractères min.)", ar: "الاسم إجباري (حرفان على الأقل)" };
  else if (name.length > LIMITS.name) e.name = { fr: `${LIMITS.name} caractères maximum`, ar: `${LIMITS.name} حرفا كحد أقصى` };

  const slug = clean(o.slug).toLowerCase();
  if (!slug || slug.length > LIMITS.slug || !SLUG_RE.test(slug))
    e.slug = { fr: "Lien invalide : lettres a-z, chiffres et tirets", ar: "رابط غير صالح: حروف لاتينية وأرقام وشرطات فقط" };

  const description = cleanMultiline(o.description);
  if (description.length > LIMITS.description)
    e.description = { fr: `${LIMITS.description} caractères maximum`, ar: `${LIMITS.description} حرف كحد أقصى` };

  const price = toInt(o.price);
  if (price === null || Number.isNaN(price) || price < 1 || price > LIMITS.maxPrice)
    e.price = { fr: "Prix invalide (nombre entier en DA)", ar: "سعر غير صالح (رقم صحيح بالدينار)" };

  const old_price = toInt(o.old_price);
  if (old_price !== null && (Number.isNaN(old_price) || old_price > LIMITS.maxPrice))
    e.old_price = { fr: "Ancien prix invalide", ar: "السعر القديم غير صالح" };
  else if (old_price !== null && price !== null && !Number.isNaN(price) && old_price <= price)
    e.old_price = { fr: "L'ancien prix doit être plus élevé que le prix", ar: "يجب أن يكون السعر القديم أعلى من السعر" };

  const stock = toInt(o.stock);
  if (stock !== null && (Number.isNaN(stock) || stock < 0 || stock > LIMITS.maxStock))
    e.stock = { fr: "Stock invalide (nombre entier, 0 ou plus)", ar: "المخزون غير صالح (رقم صحيح 0 أو أكثر)" };

  const visible = o.visible === true;

  // Photos: only this store's uploads
  const keyRe = storeKeyRe(storeId);
  const images = Array.isArray(o.images) ? o.images : [];
  if (images.length > LIMITS.images || images.some((k) => typeof k !== "string" || !keyRe.test(k)) || new Set(images).size !== images.length)
    e.images = { fr: `Photos invalides (${LIMITS.images} max.)`, ar: `صور غير صالحة (${LIMITS.images} كحد أقصى)` };

  const videoRaw = clean(o.video_url);
  const video_url = videoRaw === "" ? null : videoRaw;
  if (video_url && (video_url.length > 500 || !videoEmbed(video_url)))
    e.video_url = { fr: "Lien vidéo non reconnu (YouTube ou Facebook)", ar: "رابط الفيديو غير معروف (يوتيوب أو فيسبوك)" };

  // Variants
  const variants: VariantGroup[] = [];
  const rawGroups = Array.isArray(o.variants) ? o.variants : null;
  if (!rawGroups || rawGroups.length > LIMITS.groups) {
    e.variants = { fr: `${LIMITS.groups} groupes maximum`, ar: `${LIMITS.groups} مجموعات كحد أقصى` };
  } else {
    const groupNames = new Set<string>();
    for (const g of rawGroups) {
      const gName = clean(isObj(g) ? g.name : "");
      const opts = (isObj(g) && Array.isArray(g.options) ? g.options : []).map(clean);
      if (!gName || gName.length > LIMITS.groupName) {
        e.variants = { fr: "Chaque groupe a besoin d'un nom (ex. Couleur)", ar: "كل مجموعة تحتاج اسما (مثلا اللون)" };
        break;
      }
      if (groupNames.has(gName.toLowerCase())) {
        e.variants = { fr: `Groupe en double : ${gName}`, ar: `مجموعة مكررة: ${gName}` };
        break;
      }
      groupNames.add(gName.toLowerCase());
      if (opts.length === 0 || opts.length > LIMITS.options || opts.some((x) => !x || x.length > LIMITS.optionName)) {
        e.variants = { fr: `« ${gName} » : ajoutez au moins une option, sans case vide`, ar: `«${gName}»: أضف خيارا واحدا على الأقل، بدون خانة فارغة` };
        break;
      }
      if (new Set(opts.map((x) => x.toLowerCase())).size !== opts.length) {
        e.variants = { fr: `« ${gName} » : option en double`, ar: `«${gName}»: خيار مكرر` };
        break;
      }
      variants.push({ name: gName, options: opts });
    }
  }

  // Offers
  const offers: Offer[] = [];
  const rawOffers = Array.isArray(o.offers) ? o.offers : null;
  if (!rawOffers || rawOffers.length > LIMITS.offers) {
    e.offers = { fr: `${LIMITS.offers} offres maximum`, ar: `${LIMITS.offers} عروض كحد أقصى` };
  } else {
    const seen = new Set<number>();
    for (const r of rawOffers) {
      const qty = toInt(isObj(r) ? r.qty : null);
      const total = toInt(isObj(r) ? r.total_price : null);
      if (qty === null || Number.isNaN(qty) || qty < 2 || qty > LIMITS.offerQty) {
        e.offers = { fr: `Quantité entre 2 et ${LIMITS.offerQty}`, ar: `الكمية بين 2 و ${LIMITS.offerQty}` };
        break;
      }
      if (seen.has(qty)) {
        e.offers = { fr: `Deux offres pour la quantité ${qty}`, ar: `عرضان لنفس الكمية ${qty}` };
        break;
      }
      seen.add(qty);
      if (total === null || Number.isNaN(total) || total < 1) {
        e.offers = { fr: `Prix total manquant pour ${qty} pièces`, ar: `السعر الإجمالي ناقص لـ ${qty} قطع` };
        break;
      }
      if (price !== null && !Number.isNaN(price) && total >= price * qty) {
        e.offers = {
          fr: `${qty} pièces : le total doit être inférieur à ${price * qty} DA (${qty} × ${price})`,
          ar: `${qty} قطع: يجب أن يكون المجموع أقل من ${price * qty} دج`,
        };
        break;
      }
      offers.push({ qty, total_price: total });
    }
    offers.sort((a, b) => a.qty - b.qty);
  }

  // Landing sections
  const s = isObj(o.sections) ? o.sections : {};
  const lines = (v: unknown, max: number, key: string, label: Msg): string[] => {
    const arr = Array.isArray(v) ? v.map(clean).filter(Boolean) : [];
    if (arr.length > LIMITS.listItems || arr.some((x) => x.length > max))
      e[key] = { fr: `${label.fr} : ${LIMITS.listItems} lignes max., ${max} caractères par ligne`, ar: `${label.ar}: ${LIMITS.listItems} أسطر كحد أقصى` };
    return arr;
  };
  const benefits = lines(s.benefits, LIMITS.line, "benefits", { fr: "Avantages", ar: "المميزات" });
  const steps = lines(s.steps, LIMITS.step, "steps", { fr: "Mode d'emploi", ar: "طريقة الاستعمال" });
  const reviews = Array.isArray(s.reviews) ? s.reviews : [];
  if (reviews.length > LIMITS.reviews || reviews.some((k) => typeof k !== "string" || !keyRe.test(k)) || new Set(reviews).size !== reviews.length)
    e.reviews = { fr: `Avis invalides (${LIMITS.reviews} captures max.)`, ar: `آراء غير صالحة (${LIMITS.reviews} صور كحد أقصى)` };
  const faq: FaqItem[] = [];
  const rawFaq = Array.isArray(s.faq) ? s.faq : [];
  for (const f of rawFaq) {
    const q = clean(isObj(f) ? f.q : "");
    const a = cleanMultiline(isObj(f) ? f.a : "");
    if (!q && !a) continue;
    if (!q || !a) {
      e.faq = { fr: "Chaque question a besoin d'une réponse", ar: "كل سؤال يحتاج جوابا" };
      break;
    }
    if (q.length > LIMITS.faqQ || a.length > LIMITS.faqA) {
      e.faq = { fr: "Question ou réponse trop longue", ar: "السؤال أو الجواب طويل جدا" };
      break;
    }
    faq.push({ q, a });
  }
  if (faq.length > LIMITS.listItems) e.faq = { fr: `${LIMITS.listItems} questions maximum`, ar: `${LIMITS.listItems} أسئلة كحد أقصى` };
  const hide = (Array.isArray(s.hide) ? s.hide : []).filter((k): k is SectionKey => (SECTION_KEYS as readonly unknown[]).includes(k));

  if (Object.keys(e).length) return { ok: false, errors: e };
  return {
    ok: true,
    value: {
      name,
      slug,
      description,
      price: price as number,
      old_price,
      stock,
      visible,
      images: images as string[],
      video_url,
      variants,
      offers,
      sections: { benefits, steps, reviews: reviews as string[], faq, hide: [...new Set(hide)] },
    },
  };
}
