// Passwords: PBKDF2-SHA256 (Web Crypto, works on Workers). Sessions: HMAC-signed cookie.
import { cookies } from "next/headers";
import { getEnv } from "./db";

const ITERATIONS = 100_000; // Workers maximum
const enc = new TextEncoder();

const b64 = (u8: Uint8Array) => btoa(String.fromCharCode(...u8));
const unb64 = (s: string): Uint8Array<ArrayBuffer> => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const b64url = (s: string) => btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const unb64url = (s: string) => atob(s.replace(/-/g, "+").replace(/_/g, "/"));

async function pbkdf2(password: string, salt: Uint8Array<ArrayBuffer>, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, key, 256);
  return new Uint8Array(bits);
}

function equal(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return `pbkdf2$${ITERATIONS}$${b64(salt)}$${b64(await pbkdf2(password, salt, ITERATIONS))}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [algo, iter, salt, hash] = stored.split("$");
  if (algo !== "pbkdf2" || !iter || !salt || !hash) return false;
  return equal(await pbkdf2(password, unb64(salt), Number(iter)), unb64(hash));
}

/** Constant-time string compare (admin password) */
export function safeEqual(a: string, b: string): boolean {
  return equal(enc.encode(a), enc.encode(b));
}

// ---------- sessions ----------

export const SELLER_COOKIE = "nls_seller";
export const ADMIN_COOKIE = "nls_admin";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

/**
 * v = stores.session_version at login time (a password change invalidates older sessions).
 * imp = admin "open dashboard as this store" (support): short session, banner, no password change.
 */
export type Session = { role: "seller"; storeId: number; v?: number; imp?: boolean; exp: number } | { role: "admin"; exp: number };
type NewSession = { role: "seller"; storeId: number; v: number; imp?: boolean } | { role: "admin" };

async function hmac(data: string): Promise<string> {
  const secret = (await getEnv()).SESSION_SECRET;
  if (!secret || secret.length < 16) throw new Error("SESSION_SECRET is missing or too short");
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(data)));
  return b64url(String.fromCharCode(...sig));
}

async function sign(session: Session): Promise<string> {
  const body = b64url(JSON.stringify(session));
  return `${body}.${await hmac(body)}`;
}

async function verify(token: string | undefined): Promise<Session | null> {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  if (!safeEqual(sig, await hmac(body))) return null;
  try {
    const s = JSON.parse(unb64url(body)) as Session;
    return s.exp > Date.now() / 1000 ? s : null;
  } catch {
    return null;
  }
}

export async function startSession(cookie: string, session: NewSession, maxAge = MAX_AGE): Promise<void> {
  const token = await sign({ ...session, exp: Math.floor(Date.now() / 1000) + maxAge } as Session);
  (await cookies()).set(cookie, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  });
}

// ---------- short signed tokens (impersonation links) ----------
// Signed over "tok:" + body, so a token can never be used as a session cookie, nor the reverse.

export type ImpersonationToken = { purpose: "impersonate"; storeId: number; nonce: string; exp: number };

export async function signToken(payload: Omit<ImpersonationToken, "exp">, ttlSeconds: number): Promise<string> {
  const body = b64url(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + ttlSeconds }));
  return `${body}.${await hmac(`tok:${body}`)}`;
}

export async function verifyToken(token: string | null): Promise<ImpersonationToken | null> {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig || !safeEqual(sig, await hmac(`tok:${body}`))) return null;
  try {
    const t = JSON.parse(unb64url(body)) as ImpersonationToken;
    return t.purpose === "impersonate" && t.exp > Date.now() / 1000 ? t : null;
  } catch {
    return null;
  }
}

export async function readSession(cookie: string): Promise<Session | null> {
  return verify((await cookies()).get(cookie)?.value);
}

export async function endSession(cookie: string): Promise<void> {
  (await cookies()).delete(cookie);
}
