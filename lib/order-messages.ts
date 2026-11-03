// WhatsApp confirmation message the seller sends to the buyer, in the store language.
import { wilayaName } from "./algeria/wilayas";
import type { Lang, Order } from "./types";

const iso = (s: string) => `⁨${s}⁩`; // keeps Latin text in place inside Arabic lines
const money = (n: number, lang: Lang) => `${n.toLocaleString("en-US")} ${lang === "ar" ? "دج" : "DA"}`;

export function orderConfirmationMessage(o: Pick<Order, "id" | "customer_name" | "product_name" | "variant" | "qty" | "total" | "wilaya" | "commune" | "delivery_type">, storeName: string, lang: Lang): string {
  const product = `${o.qty} × ${o.product_name}${o.variant ? ` (${o.variant})` : ""}`;
  if (lang === "ar") {
    return [
      `السلام عليكم ${iso(o.customer_name)} 👋`,
      `شكرا على طلبك من متجر «${iso(storeName)}» 🛍️`,
      "",
      `📦 ${iso(product)}`,
      `📍 ${wilayaName(o.wilaya, "ar")}، ${iso(o.commune)} — ${o.delivery_type === "home" ? "توصيل إلى المنزل" : "توصيل إلى المكتب"}`,
      `💰 المجموع: ${money(o.total, "ar")} (الدفع عند الاستلام)`,
      "",
      "هل تؤكد الطلب؟ أجب بـ «نعم» من فضلك ✅",
      `رقم الطلب: #${o.id}`,
    ].join("\n");
  }
  return [
    `Bonjour ${o.customer_name} 👋`,
    `Merci pour votre commande chez « ${storeName} » 🛍️`,
    "",
    `📦 ${product}`,
    `📍 ${wilayaName(o.wilaya, "fr")}, ${o.commune} — ${o.delivery_type === "home" ? "livraison à domicile" : "livraison au bureau (stop desk)"}`,
    `💰 Total : ${money(o.total, "fr")} (paiement à la livraison)`,
    "",
    "Confirmez-vous la commande ? Répondez « OUI » s'il vous plaît ✅",
    `Commande n° ${o.id}`,
  ].join("\n");
}
