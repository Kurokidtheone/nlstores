import { BASE_DELIVERY, BASE_FAQ, BASE_POLICY, type StoreTemplate } from "../shared/template-base";
import { style } from "./index";

const SIZE_EXCHANGE = {
  ar: "\n\nاستبدال المقاس\n- إذا لم يناسبك المقاس، نستبدله لك مجانا خلال 7 أيام (المنتج غير مستعمل وبملصقه).",
  fr: "\n\nÉchange de taille\n- La taille ne va pas ? Échange gratuit sous 7 jours (article non porté, avec son étiquette).",
};

export const styleTemplate: StoreTemplate = {
  design: "style",
  colors: { primary: style.palettes[0].primary, accent: style.palettes[0].accent },
  announcement: { ar: "🔁 استبدال المقاس مجانا خلال 7 أيام", fr: "🔁 Échange de taille gratuit sous 7 jours" },
  policy: { ar: BASE_POLICY.ar + SIZE_EXCHANGE.ar, fr: BASE_POLICY.fr + SIZE_EXCHANGE.fr },
  faq: BASE_FAQ,
  delivery: BASE_DELIVERY,
  sample: {
    ar: {
      slug: "robe-ete",
      name: "فستان صيفي خفيف",
      description: "فستان صيفي من قماش خفيف ومريح، مناسب للخرجات اليومية.\nمتوفر بعدة مقاسات.",
      price: 4500,
      old_price: 5900,
      benefits: ["قماش خفيف لا يسبب الحرارة", "قصة مريحة تناسب كل الأجسام", "سهل الغسل ولا يحتاج كي", "استبدال المقاس مجانا"],
      steps: ["اختاري مقاسك من الجدول", "اغسليه بالماء البارد", "جففيه في الظل"],
      variants: [{ name: "المقاس", options: ["S", "M", "L", "XL"] }],
    },
    fr: {
      slug: "robe-ete",
      name: "Robe d'été fluide",
      description: "Une robe d'été en tissu léger et confortable, idéale pour tous les jours.\nDisponible en plusieurs tailles.",
      price: 4500,
      old_price: 5900,
      benefits: ["Tissu léger et respirant", "Coupe confortable pour toutes les silhouettes", "Lavage facile, sans repassage", "Échange de taille gratuit"],
      steps: ["Choisissez votre taille", "Lavage à l'eau froide", "Séchage à l'ombre"],
      variants: [{ name: "Taille", options: ["S", "M", "L", "XL"] }],
    },
  },
};
