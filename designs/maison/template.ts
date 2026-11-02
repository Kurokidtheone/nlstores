import { BASE_DELIVERY, BASE_FAQ, BASE_POLICY, type StoreTemplate } from "../shared/template-base";
import { maison } from "./index";

export const maisonTemplate: StoreTemplate = {
  design: "maison",
  colors: { primary: maison.palettes[0].primary, accent: maison.palettes[0].accent },
  announcement: { ar: "🚚 التوصيل إلى 69 ولاية — الدفع عند الاستلام", fr: "🚚 Livraison dans les 69 wilayas — paiement à la livraison" },
  policy: BASE_POLICY,
  faq: BASE_FAQ,
  delivery: BASE_DELIVERY,
  sample: {
    ar: {
      slug: "set-casseroles",
      name: "طقم أواني طهي غير لاصقة 6 قطع",
      description: "طقم أواني طهي بطبقة غير لاصقة، يطبخ بسرعة وبزيت أقل.\nيصلح لجميع أنواع المواقد ويغسل بسهولة.",
      price: 8900,
      old_price: 11900,
      benefits: ["طبقة غير لاصقة: طبخ بزيت أقل", "يسخن بسرعة وبالتساوي", "مقابض لا تسخن", "يصلح لجميع المواقد"],
      steps: ["اغسل الأواني قبل أول استعمال", "سخن على نار متوسطة", "استعمل ملعقة خشبية أو سيليكون"],
      variants: [],
    },
    fr: {
      slug: "set-casseroles",
      name: "Set de casseroles antiadhésives 6 pièces",
      description: "Un set de casseroles avec revêtement antiadhésif : cuisson rapide, moins d'huile.\nCompatible avec tous les feux, se lave facilement.",
      price: 8900,
      old_price: 11900,
      benefits: ["Antiadhésif : cuisinez avec moins d'huile", "Chauffe vite et uniformément", "Poignées qui ne chauffent pas", "Compatible avec tous les feux"],
      steps: ["Lavez avant la première utilisation", "Chauffez à feu moyen", "Utilisez une spatule en bois ou silicone"],
      variants: [],
    },
  },
};
