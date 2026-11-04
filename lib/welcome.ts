// Welcome message sent to a new seller on WhatsApp, in the store language.
// The temporary password only lives in this text (it is never stored in clear).
import type { Lang } from "./types";

export type WelcomeInput = {
  lang: Lang;
  ownerName: string;
  storeName: string;
  storeUrl: string;
  dashboardUrl: string;
  helpUrl: string;
  phone: string;
  password: string;
  renewalDate: string; // ISO
  /** www.clientstore.com, when the client has a custom domain */
  customDomain?: string | null;
  /** CNAME target for custom domains (stores.<root domain>) */
  cnameTarget: string;
};

/** Unicode isolate: a Latin name inside an Arabic sentence keeps its place (invisible) */
const iso = (s: string) => `\u2068${s}\u2069`;

const dmy = (iso: string) => {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
};

export function welcomeMessage(i: WelcomeInput): string {
  const apex = i.customDomain?.replace(/^www\./, "");
  if (i.lang === "ar") {
    return [
      `السلام عليكم ${iso(i.ownerName)} 👋`,
      `مرحبا بك في ${iso("Next Level Stores")}! متجرك «${iso(i.storeName)}» جاهز ✅`,
      "",
      "🛍️ رابط متجرك:",
      i.storeUrl,
      "",
      "⚙️ لوحة التحكم:",
      i.dashboardUrl,
      // phone and password alone on their line: easy to copy, no invisible characters around them
      "📱 رقم الدخول:",
      i.phone,
      "🔑 كلمة السر المؤقتة:",
      i.password,
      "(ستختار كلمة سر جديدة عند أول دخول)",
      "",
      "🎬 فيديوهات الشرح:",
      i.helpUrl,
      "",
      `📅 اشتراكك صالح إلى غاية: ${dmy(i.renewalDate)}`,
      ...(i.customDomain
        ? [
            "",
            `🌐 لتشغيل نطاقك ${iso(apex ?? "")}:`,
            "عند الشركة التي اشتريت منها النطاق، أضف هذا السجل (DNS):",
            "النوع: CNAME",
            "الاسم: www",
            `القيمة: ${i.cnameTarget}`,
            `ثم وجّه ${iso(apex ?? "")} إلى ${iso(i.customDomain)}.`,
            "يعمل النطاق تلقائيا خلال 24 ساعة مع شهادة SSL مجانية.",
          ]
        : []),
      "",
      "لأي سؤال راسلنا هنا على واتساب. بالتوفيق في مبيعاتك! 🚀",
    ].join("\n");
  }
  return [
    `Bonjour ${i.ownerName} 👋`,
    `Bienvenue chez Next Level Stores ! Votre boutique « ${i.storeName} » est en ligne ✅`,
    "",
    "🛍️ Votre boutique :",
    i.storeUrl,
    "",
    "⚙️ Votre tableau de bord :",
    i.dashboardUrl,
    `📱 Identifiant : ${i.phone}`,
    `🔑 Mot de passe provisoire : ${i.password}`,
    "(vous choisirez votre mot de passe à la 1re connexion)",
    "",
    "🎬 Vidéos d'aide :",
    i.helpUrl,
    "",
    `📅 Abonnement valable jusqu'au : ${dmy(i.renewalDate)}`,
    ...(i.customDomain
      ? [
          "",
          `🌐 Pour activer votre domaine ${apex} :`,
          "chez votre registrar (là où vous avez acheté le domaine), ajoutez cet enregistrement DNS :",
          "Type : CNAME",
          "Nom : www",
          `Valeur : ${i.cnameTarget}`,
          `Puis redirigez ${apex} vers ${i.customDomain}.`,
          "Le domaine s'active tout seul sous 24 h, avec un certificat SSL gratuit.",
        ]
      : []),
    "",
    "Une question ? Écrivez-nous ici sur WhatsApp. Bonnes ventes ! 🚀",
  ].join("\n");
}
