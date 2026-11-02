// The 69 wilayas of Algeria (58 + 11 created in 2025). Always use this list; never hardcode 58.
// TODO: verify 59–69 numbering against the Journal officiel list.

export type Wilaya = { code: number; fr: string; ar: string };

export const WILAYAS: readonly Wilaya[] = [
  { code: 1, fr: "Adrar", ar: "أدرار" },
  { code: 2, fr: "Chlef", ar: "الشلف" },
  { code: 3, fr: "Laghouat", ar: "الأغواط" },
  { code: 4, fr: "Oum El Bouaghi", ar: "أم البواقي" },
  { code: 5, fr: "Batna", ar: "باتنة" },
  { code: 6, fr: "Béjaïa", ar: "بجاية" },
  { code: 7, fr: "Biskra", ar: "بسكرة" },
  { code: 8, fr: "Béchar", ar: "بشار" },
  { code: 9, fr: "Blida", ar: "البليدة" },
  { code: 10, fr: "Bouira", ar: "البويرة" },
  { code: 11, fr: "Tamanrasset", ar: "تمنراست" },
  { code: 12, fr: "Tébessa", ar: "تبسة" },
  { code: 13, fr: "Tlemcen", ar: "تلمسان" },
  { code: 14, fr: "Tiaret", ar: "تيارت" },
  { code: 15, fr: "Tizi Ouzou", ar: "تيزي وزو" },
  { code: 16, fr: "Alger", ar: "الجزائر" },
  { code: 17, fr: "Djelfa", ar: "الجلفة" },
  { code: 18, fr: "Jijel", ar: "جيجل" },
  { code: 19, fr: "Sétif", ar: "سطيف" },
  { code: 20, fr: "Saïda", ar: "سعيدة" },
  { code: 21, fr: "Skikda", ar: "سكيكدة" },
  { code: 22, fr: "Sidi Bel Abbès", ar: "سيدي بلعباس" },
  { code: 23, fr: "Annaba", ar: "عنابة" },
  { code: 24, fr: "Guelma", ar: "قالمة" },
  { code: 25, fr: "Constantine", ar: "قسنطينة" },
  { code: 26, fr: "Médéa", ar: "المدية" },
  { code: 27, fr: "Mostaganem", ar: "مستغانم" },
  { code: 28, fr: "M'Sila", ar: "المسيلة" },
  { code: 29, fr: "Mascara", ar: "معسكر" },
  { code: 30, fr: "Ouargla", ar: "ورقلة" },
  { code: 31, fr: "Oran", ar: "وهران" },
  { code: 32, fr: "El Bayadh", ar: "البيض" },
  { code: 33, fr: "Illizi", ar: "إليزي" },
  { code: 34, fr: "Bordj Bou Arréridj", ar: "برج بوعريريج" },
  { code: 35, fr: "Boumerdès", ar: "بومرداس" },
  { code: 36, fr: "El Tarf", ar: "الطارف" },
  { code: 37, fr: "Tindouf", ar: "تندوف" },
  { code: 38, fr: "Tissemsilt", ar: "تيسمسيلت" },
  { code: 39, fr: "El Oued", ar: "الوادي" },
  { code: 40, fr: "Khenchela", ar: "خنشلة" },
  { code: 41, fr: "Souk Ahras", ar: "سوق أهراس" },
  { code: 42, fr: "Tipaza", ar: "تيبازة" },
  { code: 43, fr: "Mila", ar: "ميلة" },
  { code: 44, fr: "Aïn Defla", ar: "عين الدفلى" },
  { code: 45, fr: "Naâma", ar: "النعامة" },
  { code: 46, fr: "Aïn Témouchent", ar: "عين تموشنت" },
  { code: 47, fr: "Ghardaïa", ar: "غرداية" },
  { code: 48, fr: "Relizane", ar: "غليزان" },
  { code: 49, fr: "Timimoun", ar: "تيميمون" },
  { code: 50, fr: "Bordj Badji Mokhtar", ar: "برج باجي مختار" },
  { code: 51, fr: "Ouled Djellal", ar: "أولاد جلال" },
  { code: 52, fr: "Béni Abbès", ar: "بني عباس" },
  { code: 53, fr: "In Salah", ar: "عين صالح" },
  { code: 54, fr: "In Guezzam", ar: "عين قزام" },
  { code: 55, fr: "Touggourt", ar: "تقرت" },
  { code: 56, fr: "Djanet", ar: "جانت" },
  { code: 57, fr: "El M'Ghair", ar: "المغير" },
  { code: 58, fr: "El Meniaa", ar: "المنيعة" },
  { code: 59, fr: "Aflou", ar: "آفلو" },
  { code: 60, fr: "El Abiodh Sidi Cheikh", ar: "الأبيض سيدي الشيخ" },
  { code: 61, fr: "El Aricha", ar: "العريشة" },
  { code: 62, fr: "El Kantara", ar: "القنطرة" },
  { code: 63, fr: "Barika", ar: "بريكة" },
  { code: 64, fr: "Bou Saâda", ar: "بوسعادة" },
  { code: 65, fr: "Bir El Ater", ar: "بئر العاتر" },
  { code: 66, fr: "Ksar El Boukhari", ar: "قصر البخاري" },
  { code: 67, fr: "Ksar Chellala", ar: "قصر الشلالة" },
  { code: 68, fr: "Aïn Oussara", ar: "عين وسارة" },
  { code: 69, fr: "Messaad", ar: "مسعد" },
];

export const WILAYA_COUNT = WILAYAS.length; // 69

/**
 * Southern wilayas, for the "apply to the south" helper on the delivery page (couriers price them
 * higher). It is only a shortcut: the seller can still change any wilaya by hand afterwards.
 */
export const SOUTH_WILAYAS: readonly number[] = [
  1, 3, 7, 8, 11, 30, 32, 33, 37, 39, 47, // Adrar … Ghardaïa
  49, 50, 51, 52, 53, 54, 55, 56, 57, 58, // created in 2019
  59, 60, 62, // Aflou, El Abiodh Sidi Cheikh, El Kantara (2025)
];

export function isWilaya(code: number): boolean {
  return Number.isInteger(code) && code >= 1 && code <= WILAYA_COUNT;
}

export function wilayaName(code: number, lang: "ar" | "fr"): string {
  const w = WILAYAS[code - 1];
  return w ? `${String(w.code).padStart(2, "0")} - ${w[lang]}` : String(code);
}
