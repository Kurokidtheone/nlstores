// Storefront text in Arabic and French. Arabic pages are RTL; wrap prices in <bdi>.
import type { Lang } from "./types";

const dict = {
  order_now: { ar: "اطلب الآن", fr: "Commander maintenant" },
  order_form_title: { ar: "للطلب املأ المعلومات التالية", fr: "Pour commander, remplissez ce formulaire" },
  full_name: { ar: "الاسم الكامل", fr: "Nom complet" },
  phone: { ar: "رقم الهاتف", fr: "Téléphone" },
  wilaya: { ar: "الولاية", fr: "Wilaya" },
  choose_wilaya: { ar: "اختر الولاية", fr: "Choisir la wilaya" },
  commune: { ar: "البلدية", fr: "Commune" },
  address: { ar: "العنوان (اختياري)", fr: "Adresse (facultatif)" },
  delivery_type: { ar: "طريقة التوصيل", fr: "Livraison" },
  home: { ar: "إلى المنزل", fr: "À domicile" },
  desk: { ar: "إلى مكتب التوصيل", fr: "Au bureau (stop desk)" },
  not_delivered: { ar: "غير متوفر", fr: "Indisponible" },
  quantity: { ar: "الكمية", fr: "Quantité" },
  pieces: { ar: "قطع", fr: "pièces" },
  piece: { ar: "قطعة", fr: "pièce" },
  save: { ar: "وفر", fr: "Économisez" },
  products_price: { ar: "سعر المنتج", fr: "Produits" },
  delivery_price: { ar: "التوصيل", fr: "Livraison" },
  total: { ar: "المجموع", fr: "Total" },
  confirm_order: { ar: "تأكيد الطلب", fr: "Confirmer la commande" },
  sending: { ar: "جاري الإرسال…", fr: "Envoi…" },
  cod: { ar: "الدفع عند الاستلام", fr: "Paiement à la livraison" },
  choose: { ar: "اختر", fr: "Choisir" },
  required: { ar: "هذه الخانة إجبارية", fr: "Champ obligatoire" },
  phone_invalid: { ar: "رقم الهاتف غير صحيح (05 / 06 / 07)", fr: "Numéro invalide (05 / 06 / 07)" },
  error_generic: { ar: "حدث خطأ، حاول مرة أخرى", fr: "Erreur, réessayez" },
  out_of_stock: { ar: "نفد المخزون", fr: "Rupture de stock" },
  benefits: { ar: "المميزات", fr: "Avantages" },
  how_to_use: { ar: "طريقة الاستعمال", fr: "Mode d'emploi" },
  reviews: { ar: "آراء الزبائن", fr: "Avis clients" },
  faq: { ar: "الأسئلة الشائعة", fr: "Questions fréquentes" },
  our_products: { ar: "منتجاتنا", fr: "Nos produits" },
  thank_you_title: { ar: "شكرا! تم استلام طلبك", fr: "Merci ! Commande reçue" },
  thank_you_text: { ar: "سنتصل بك قريبا لتأكيد الطلب. أبق هاتفك مفتوحا.", fr: "Nous vous appelons bientôt pour confirmer. Gardez votre téléphone allumé." },
  order_number: { ar: "رقم الطلب", fr: "Commande n°" },
  back_to_store: { ar: "العودة إلى المتجر", fr: "Retour à la boutique" },
  whatsapp_us: { ar: "راسلنا على واتساب", fr: "Écrivez-nous sur WhatsApp" },
  store_unavailable: { ar: "المتجر غير متوفر حاليا", fr: "Boutique momentanément indisponible" },
  no_products: { ar: "لا توجد منتجات بعد", fr: "Aucun produit pour le moment" },
  preview_hidden: { ar: "معاينة: هذا المنتج مخفي عن الزبائن", fr: "Aperçu : ce produit est masqué aux clients" },
} as const;

export type TKey = keyof typeof dict;

export function t(lang: Lang, key: TKey): string {
  return dict[key][lang];
}

export const dirOf = (lang: Lang) => (lang === "ar" ? "rtl" : "ltr");
