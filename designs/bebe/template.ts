import { BASE_DELIVERY, BASE_FAQ, BASE_POLICY, type StoreTemplate } from "../shared/template-base";
import { bebe } from "./index";

export const bebeTemplate: StoreTemplate = {
  design: "bebe",
  colors: { primary: bebe.palettes[0].primary, accent: bebe.palettes[0].accent },
  announcement: { ar: "👶 منتجات آمنة للأطفال — الدفع عند الاستلام", fr: "👶 Produits sûrs pour enfants — paiement à la livraison" },
  policy: BASE_POLICY,
  faq: BASE_FAQ,
  delivery: BASE_DELIVERY,
  sample: {
    ar: {
      slug: "jouet-educatif-bois",
      name: "لعبة تعليمية خشبية للأطفال",
      description: "لعبة خشبية ملونة تساعد طفلك على تعلم الأشكال والألوان.\nمناسبة من عمر سنتين.",
      price: 2500,
      old_price: 3200,
      benefits: ["خشب طبيعي وألوان آمنة", "تنمي التركيز والمهارات اليدوية", "حواف ناعمة بدون زوايا حادة", "هدية مثالية"],
      steps: ["أخرج القطع من العلبة", "العب مع طفلك في البداية", "نظفها بقطعة قماش مبللة"],
      variants: [],
    },
    fr: {
      slug: "jouet-educatif-bois",
      name: "Jouet éducatif en bois",
      description: "Un jouet en bois coloré pour apprendre les formes et les couleurs.\nDès 2 ans.",
      price: 2500,
      old_price: 3200,
      benefits: ["Bois naturel et peintures sans danger", "Développe la concentration et la motricité", "Bords arrondis, sans angles vifs", "Idée cadeau parfaite"],
      steps: ["Sortez les pièces de la boîte", "Jouez avec votre enfant au début", "Nettoyez avec un chiffon humide"],
      variants: [],
    },
  },
};
