// Renewal messages (reminders, thank you, seller screen), in the store language.
import { BILLING } from "./billing";
import { dmy } from "./store-state";
import type { Lang } from "./types";

export type ReminderKind = "d30" | "d7" | "d0" | "after3";

export const REMINDER_LABEL: Record<ReminderKind, string> = {
  d30: "J-30",
  d7: "J-7",
  d0: "Jour J",
  after3: "J+3 (expirée)",
};

const iso = (s: string) => `⁨${s}⁩`; // keeps a Latin name in place inside Arabic text
const money = (n: number, lang: Lang) => `${n.toLocaleString("en-US")} ${lang === "ar" ? "دج" : "DA"}`;
const DAY = 86_400_000;

/** Payment details block (CCP + BaridiMob), each value alone on its line so it copies cleanly */
export function paymentLines(lang: Lang): string[] {
  const { ccp, baridimob } = BILLING;
  return lang === "ar"
    ? ["💳 الدفع عبر CCP:", ccp.account, `المفتاح: ${ccp.key}`, `باسم: ${iso(ccp.holder)}`, "", "📱 أو BaridiMob (RIP):", baridimob.rip]
    : ["💳 Paiement CCP :", ccp.account, `Clé : ${ccp.key}`, `Au nom de : ${ccp.holder}`, "", "📱 Ou BaridiMob (RIP) :", baridimob.rip];
}

/** daysLeft = today's real value (a reminder created late never says "30 days" when it's 20) */
export type ReminderInput = { lang: Lang; ownerName: string; storeName: string; storeUrl: string; expiresAt: string; daysLeft: number; amount: number };

export function reminderMessage(r: ReminderInput): string {
  const end = dmy(r.expiresAt);
  const closes = dmy(new Date(Date.parse(r.expiresAt) + 7 * DAY).toISOString());
  const d = r.daysLeft;
  if (r.lang === "ar") {
    const head =
      d > 0
        ? `اشتراك متجرك «${iso(r.storeName)}» ينتهي يوم ${end} (${d === 1 ? "غدا" : `بعد ${d} ${d <= 10 ? "أيام" : "يوما"}`}).`
        : d === 0
          ? `اشتراك متجرك «${iso(r.storeName)}» ينتهي اليوم ${end}.`
          : `انتهى اشتراك متجرك «${iso(r.storeName)}» يوم ${end}. سيتوقف المتجر عن العمل يوم ${closes} إذا لم يتم التجديد.`;
    return [
      `السلام عليكم ${iso(r.ownerName)} 👋`,
      head,
      "",
      `🔄 التجديد لمدة سنة: ${money(r.amount, "ar")}`,
      "",
      ...paymentLines("ar"),
      "",
      "📸 أرسل لنا صورة الوصل هنا وسنجدد اشتراكك فورا.",
      r.storeUrl,
    ].join("\n");
  }
  const head =
    d > 0
      ? `L'abonnement de votre boutique « ${r.storeName} » se termine le ${end} (${d === 1 ? "demain" : `dans ${d} jours`}).`
      : d === 0
        ? `L'abonnement de votre boutique « ${r.storeName} » se termine aujourd'hui, le ${end}.`
        : `L'abonnement de votre boutique « ${r.storeName} » a pris fin le ${end}. Sans renouvellement, la boutique sera désactivée le ${closes}.`;
  return [
    `Bonjour ${r.ownerName} 👋`,
    head,
    "",
    `🔄 Renouvellement 1 an : ${money(r.amount, "fr")}`,
    "",
    ...paymentLines("fr"),
    "",
    "📸 Envoyez-nous la photo du reçu ici et nous renouvelons tout de suite.",
    r.storeUrl,
  ].join("\n");
}

export function thankYouMessage(m: { lang: Lang; ownerName: string; storeName: string; expiresAt: string; amount: number }): string {
  const end = dmy(m.expiresAt);
  return m.lang === "ar"
    ? [`شكرا ${iso(m.ownerName)} 🙏`, `تم تجديد اشتراك متجرك «${iso(m.storeName)}» إلى غاية ${end} ✅`, `المبلغ المستلم: ${money(m.amount, "ar")}`, "", "بالتوفيق في مبيعاتك! 🚀"].join("\n")
    : [`Merci ${m.ownerName} 🙏`, `Votre boutique « ${m.storeName} » est renouvelée jusqu'au ${end} ✅`, `Montant reçu : ${money(m.amount, "fr")}`, "", "Bonnes ventes ! 🚀"].join("\n");
}

/** Prefilled message from the seller to us ("I want to renew") */
export function sellerRenewRequest(lang: Lang, storeName: string, host: string): string {
  return lang === "ar"
    ? `السلام عليكم، أريد تجديد اشتراك متجري «${iso(storeName)}» (${host}).`
    : `Bonjour, je veux renouveler l'abonnement de ma boutique « ${storeName} » (${host}).`;
}
