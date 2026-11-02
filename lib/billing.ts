// ⚠️ YOUR PAYMENT DETAILS — edit this file (on GitHub: open it, ✏️, Commit changes).
// Used in renewal reminders, the seller renewal banner/screen and the thank-you message.
import { SUPPORT_WHATSAPP } from "./help";

export const BILLING = {
  /** yearly renewal price in DA */
  renewal: { standard: 8_000, custom_domain: 13_000 },
  ccp: { holder: "NOM PRÉNOM", account: "0000000000", key: "00" },
  baridimob: { rip: "00799999 0000000000 00" },
  /** where sellers send the receipt photo */
  whatsapp: SUPPORT_WHATSAPP,
} as const;

export const renewalAmount = (hasCustomDomain: boolean) => (hasCustomDomain ? BILLING.renewal.custom_domain : BILLING.renewal.standard);

/** 8,000 DA, or 13,000 DA for a store with a custom .com domain */
export async function storeRenewalAmount(db: D1Database, storeId: number): Promise<number> {
  const d = await db.prepare("SELECT 1 FROM domains WHERE store_id = ? AND kind = 'custom' LIMIT 1").bind(storeId).first();
  return renewalAmount(!!d);
}
