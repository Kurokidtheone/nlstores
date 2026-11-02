// What every new store starts with. Each design's template.ts (designs/<id>/template.ts)
// builds on this. Every text exists in Arabic AND French: a missing one fails typecheck.
import { SOUTH_WILAYAS, WILAYAS } from "@/lib/algeria/wilayas";
import { DEFAULT_POLICY } from "@/lib/policy";
import type { FaqItem, Lang, VariantGroup } from "@/lib/types";

export type L<T> = Record<Lang, T>;

export type SampleProduct = {
  slug: string;
  name: string;
  description: string;
  price: number;
  old_price: number | null;
  benefits: string[];
  steps: string[];
  variants: VariantGroup[];
};

export type StoreTemplate = {
  design: string;
  colors: { primary: string; accent: string };
  announcement: L<string>;
  policy: L<string>;
  faq: L<FaqItem[]>;
  delivery: { home: number; desk: number; southHome: number; southDesk: number };
  /** shown as "Replace this sample product" until the seller edits it */
  sample: L<SampleProduct>;
};

export const BASE_DELIVERY: StoreTemplate["delivery"] = { home: 600, desk: 400, southHome: 900, southDesk: 600 };

export const BASE_POLICY: L<string> = DEFAULT_POLICY;

export const BASE_FAQ: L<FaqItem[]> = {
  ar: [
    { q: "كم تستغرق مدة التوصيل؟", a: "من 2 إلى 5 أيام عمل حسب ولايتك. نوصل إلى جميع الولايات الـ 69." },
    { q: "هل الدفع عند الاستلام؟", a: "نعم، تدفع فقط عندما تستلم طلبك، ويمكنك فحص المنتج أمام عامل التوصيل." },
    { q: "هل يمكنني الاستبدال أو الإرجاع؟", a: "نعم، إذا وصلك المنتج معيبا أو غير مطابق تواصل معنا خلال 48 ساعة ونستبدله لك." },
  ],
  fr: [
    { q: "Quel est le délai de livraison ?", a: "2 à 5 jours ouvrables selon votre wilaya. Nous livrons dans les 69 wilayas." },
    { q: "Le paiement se fait-il à la livraison ?", a: "Oui, vous payez seulement à la réception, et vous pouvez vérifier le produit devant le livreur." },
    { q: "Puis-je échanger ou retourner ?", a: "Oui : produit défectueux ou non conforme, contactez-nous sous 48 heures et nous l'échangeons." },
  ],
};

/** 69 rows: southern wilayas get the higher prices */
export function deliveryRows(d: StoreTemplate["delivery"]): { wilaya: number; home: number; desk: number }[] {
  const south = new Set(SOUTH_WILAYAS);
  return WILAYAS.map((w) => (south.has(w.code) ? { wilaya: w.code, home: d.southHome, desk: d.southDesk } : { wilaya: w.code, home: d.home, desk: d.desk }));
}
