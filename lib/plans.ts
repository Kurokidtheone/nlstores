// Yearly prices in DA, used to prefill the payment amount in admin.
export const PLANS = {
  standard: { fr: "Boutique (sous-domaine)", amount: 20_000 },
  custom_domain: { fr: "Boutique + domaine .com", amount: 25_000 },
} as const;

export const planAmount = (hasCustomDomain: boolean) => (hasCustomDomain ? PLANS.custom_domain.amount : PLANS.standard.amount);

export const PAYMENT_METHODS = [
  { id: "ccp", fr: "CCP" },
  { id: "baridimob", fr: "BaridiMob" },
  { id: "chargily", fr: "Chargily" },
  { id: "cash", fr: "Espèces" },
] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number]["id"];

/** start + 1 year, as an ISO date at midnight UTC */
export function plusOneYear(startIsoDate: string): string {
  const d = new Date(`${startIsoDate}T00:00:00Z`);
  d.setUTCFullYear(d.getUTCFullYear() + 1);
  return d.toISOString();
}
