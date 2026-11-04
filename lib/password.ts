// Temporary passwords given to new sellers (they must change it at first login).
// No 0/O, 1/l/I: easy to read in a WhatsApp message and to type on a phone.
const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

export function temporaryPassword(length = 8): string {
  const out: string[] = [];
  const max = 256 - (256 % ALPHABET.length); // no modulo bias
  while (out.length < length) {
    for (const b of crypto.getRandomValues(new Uint8Array(length * 2))) {
      if (b < max && out.length < length) out.push(ALPHABET[b % ALPHABET.length]);
    }
  }
  return out.join("");
}
