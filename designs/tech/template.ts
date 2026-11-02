import { BASE_DELIVERY, BASE_FAQ, BASE_POLICY, type StoreTemplate } from "../shared/template-base";
import { tech } from "./index";

export const techTemplate: StoreTemplate = {
  design: "tech",
  colors: { primary: tech.palettes[0].primary, accent: tech.palettes[0].accent },
  announcement: { ar: "✅ افحص المنتج قبل الدفع — التوصيل إلى 69 ولاية", fr: "✅ Vérifiez le produit avant de payer — livraison 69 wilayas" },
  policy: BASE_POLICY,
  faq: BASE_FAQ,
  delivery: BASE_DELIVERY,
  sample: {
    ar: {
      slug: "ecouteurs-sans-fil",
      name: "سماعات لاسلكية بلوتوث",
      description: "سماعات لاسلكية بصوت نقي وبطارية تدوم طويلا، مع علبة شحن.\nتعمل مع كل الهواتف.",
      price: 3900,
      old_price: 5500,
      benefits: ["صوت نقي وباس قوي", "بطارية حتى 20 ساعة مع العلبة", "اتصال سريع بالبلوتوث", "ميكروفون للمكالمات"],
      steps: ["افتح العلبة لتشغيل السماعات", "فعّل البلوتوث في هاتفك واختر السماعات", "أعد السماعات إلى العلبة لشحنها"],
      variants: [],
    },
    fr: {
      slug: "ecouteurs-sans-fil",
      name: "Écouteurs sans fil Bluetooth",
      description: "Des écouteurs sans fil au son clair, avec une longue autonomie et un boîtier de charge.\nCompatibles avec tous les téléphones.",
      price: 3900,
      old_price: 5500,
      benefits: ["Son clair et basses puissantes", "Jusqu'à 20 h d'autonomie avec le boîtier", "Connexion Bluetooth rapide", "Micro pour les appels"],
      steps: ["Ouvrez le boîtier pour allumer les écouteurs", "Activez le Bluetooth et choisissez les écouteurs", "Rangez-les dans le boîtier pour les recharger"],
      variants: [],
    },
  },
};
