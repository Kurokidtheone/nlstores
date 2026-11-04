// Usage: node scripts/hash-password.mjs <password>
// Prints a hash for stores.password_hash (same format as lib/auth.ts).
import { webcrypto as crypto } from "node:crypto";

const password = process.argv[2];
if (!password) {
  console.error("Usage: node scripts/hash-password.mjs <password>");
  process.exit(1);
}

const ITERATIONS = 100_000; // Cloudflare Workers maximum for PBKDF2
const salt = crypto.getRandomValues(new Uint8Array(16));
const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: ITERATIONS }, key, 256);
const b64 = (u8) => Buffer.from(u8).toString("base64");
console.log(`pbkdf2$${ITERATIONS}$${b64(salt)}$${b64(new Uint8Array(bits))}`);
