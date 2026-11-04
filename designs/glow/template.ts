import { BASE_DELIVERY, BASE_FAQ, BASE_POLICY, type StoreTemplate } from "../shared/template-base";
import { glow } from "./index";

export const glowTemplate: StoreTemplate = {
  design: "glow",
  colors: { primary: glow.palettes[0].primary, accent: glow.palettes[0].accent },
  announcement: { ar: "🎁 هدية مع كل طلب — الدفع عند الاستلام", fr: "🎁 Un cadeau avec chaque commande — paiement à la livraison" },
  policy: BASE_POLICY,
  faq: BASE_FAQ,
  delivery: BASE_DELIVERY,
  sample: {
    ar: {
      slug: "serum-vitamine-c",
      name: "سيروم فيتامين C للبشرة",
      description: "سيروم خفيف بفيتامين C يمنح بشرتك إشراقة طبيعية ويوحد لونها.\nمناسب لجميع أنواع البشرة، للاستعمال صباحا ومساء.",
      price: 2900,
      old_price: 3900,
      benefits: ["يوحد لون البشرة ويقلل البقع الداكنة", "ترطيب يدوم طوال اليوم", "نتيجة واضحة من الأسبوع الثاني", "مناسب للبشرة الحساسة"],
      steps: ["نظفي وجهك وجففيه", "ضعي 3 قطرات على الوجه والرقبة", "دلكي بلطف حتى يمتص"],
      variants: [],
    },
    fr: {
      slug: "serum-vitamine-c",
      name: "Sérum Éclat Vitamine C",
      description: "Un sérum léger à la vitamine C qui donne de l'éclat et unifie le teint.\nConvient à tous les types de peau, matin et soir.",
      price: 2900,
      old_price: 3900,
      benefits: ["Unifie le teint et atténue les taches", "Hydratation toute la journée", "Résultat visible dès la 2ᵉ semaine", "Convient aux peaux sensibles"],
      steps: ["Nettoyez et séchez le visage", "Appliquez 3 gouttes sur le visage et le cou", "Massez doucement jusqu'à absorption"],
      variants: [],
    },
  },
};
