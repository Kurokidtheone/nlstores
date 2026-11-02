// Algerian mobile numbers: 05 / 06 / 07 + 8 digits. Accepts +213 / 00213 / spaces / dashes.

export function normalizePhone(input: string): string | null {
  let d = String(input ?? "").replace(/[^\d+]/g, "");
  if (d.startsWith("+213")) d = "0" + d.slice(4);
  else if (d.startsWith("00213")) d = "0" + d.slice(5);
  else if (d.startsWith("213") && d.length === 12) d = "0" + d.slice(3);
  return /^0[567]\d{8}$/.test(d) ? d : null;
}

/** wa.me link for a local number, optional prefilled text */
export function waLink(phone: string, text?: string): string {
  const n = normalizePhone(phone);
  const intl = n ? "213" + n.slice(1) : phone.replace(/\D/g, "");
  return `https://wa.me/${intl}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}
