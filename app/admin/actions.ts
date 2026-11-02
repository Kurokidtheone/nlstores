"use server";
// Owner panel actions. Every action (except login) starts with requireAdmin().
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { DESIGNS, getDesign } from "@/designs/registry";
import { normalizePhone } from "@/lib/algeria/phone";
import { ADMIN_COOKIE, endSession, hashPassword, safeEqual, startSession } from "@/lib/auth";
import { createCustomHostname } from "@/lib/cloudflare-domains";
import { getEnv } from "@/lib/db";
import { currentHost, requireAdmin } from "@/lib/tenant";
import type { Msg } from "@/lib/types";

export type AdminState = { error?: Msg; ok?: string };

export async function adminLogin(_prev: AdminState, form: FormData): Promise<AdminState> {
  const env = await getEnv();
  if ((await currentHost()) !== env.ADMIN_HOST) notFound();
  const password = String(form.get("password") ?? "");
  if (!env.ADMIN_PASSWORD || !safeEqual(password, env.ADMIN_PASSWORD)) return { error: { fr: "Mot de passe incorrect", ar: "كلمة السر غير صحيحة" } };
  await startSession(ADMIN_COOKIE, { role: "admin" });
  redirect("/");
}

export async function adminLogout() {
  await endSession(ADMIN_COOKIE);
  redirect("/login");
}

const addYear = (from: string) => {
  const base = Math.max(Date.now(), Date.parse(from) || 0);
  const d = new Date(base);
  d.setUTCFullYear(d.getUTCFullYear() + 1);
  return d.toISOString();
};

export async function createStore(_prev: AdminState, form: FormData): Promise<AdminState> {
  const { db, env } = await requireAdmin();
  const name = String(form.get("name") ?? "").replace(/\s+/g, " ").trim();
  const slug = String(form.get("slug") ?? "").trim().toLowerCase();
  const phone = normalizePhone(String(form.get("owner_phone") ?? ""));
  const ownerName = String(form.get("owner_name") ?? "").trim().slice(0, 80);
  const password = String(form.get("password") ?? "");
  const lang = form.get("lang") === "fr" ? "fr" : "ar";
  const design = String(form.get("design"));
  const custom = String(form.get("custom_domain") ?? "").trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");

  if (name.length < 2) return { error: { fr: "Nom obligatoire", ar: "الاسم إجباري" } };
  if (!/^[a-z0-9](?:[a-z0-9-]{0,30}[a-z0-9])?$/.test(slug) || ["admin", "www", "api"].includes(slug))
    return { error: { fr: "Sous-domaine invalide (a-z, 0-9, -)", ar: "النطاق الفرعي غير صالح" } };
  if (!phone) return { error: { fr: "Téléphone invalide", ar: "رقم الهاتف غير صالح" } };
  if (password.length < 8) return { error: { fr: "Mot de passe : 8 caractères min.", ar: "كلمة السر: 8 أحرف على الأقل" } };
  if (!DESIGNS.some((d) => d.id === design)) return { error: { fr: "Design inconnu", ar: "تصميم غير معروف" } };
  if (custom && !/^(?:[a-z0-9-]+\.)+[a-z]{2,}$/.test(custom)) return { error: { fr: "Domaine personnalisé invalide", ar: "النطاق غير صالح" } };

  const hostname = `${slug}.${env.ROOT_DOMAIN}`;
  const taken = await db
    .prepare("SELECT 1 FROM stores WHERE slug = ? UNION SELECT 1 FROM domains WHERE hostname IN (?, ?)")
    .bind(slug, hostname, custom || hostname)
    .first();
  if (taken) return { error: { fr: "Sous-domaine ou domaine déjà utilisé", ar: "النطاق مستعمل" } };

  const row = await db
    .prepare(
      `INSERT INTO stores (slug, name, lang, design, primary_color, whatsapp, owner_name, owner_phone, password_hash, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
    )
    .bind(slug, name, lang, design, getDesign(design).defaultColor, phone, ownerName, phone, await hashPassword(password), addYear(""))
    .first<{ id: number }>();
  const storeId = row!.id;
  await db.prepare("INSERT INTO domains (hostname, store_id, kind) VALUES (?, ?, 'subdomain')").bind(hostname, storeId).run();

  let note = "";
  if (custom) {
    const cf = await createCustomHostname(env, custom);
    await db
      .prepare("INSERT INTO domains (hostname, store_id, kind, cf_hostname_id) VALUES (?, ?, 'custom', ?)")
      .bind(custom, storeId, cf.ok ? cf.id : null)
      .run();
    note = cf.ok ? ` + ${custom} (SSL en cours)` : ` — ${custom} ajouté, mais Cloudflare : ${cf.error}`;
  }
  revalidatePath("/admin");
  return { ok: `Boutique créée : https://${hostname}${note}` };
}

export async function renewStore(form: FormData) {
  const { db } = await requireAdmin();
  const id = Number(form.get("id"));
  const store = await db.prepare("SELECT expires_at FROM stores WHERE id = ?").bind(id).first<{ expires_at: string }>();
  if (!store) return;
  await db.prepare("UPDATE stores SET expires_at = ?, status = 'active' WHERE id = ?").bind(addYear(store.expires_at), id).run();
  revalidatePath("/admin");
}

export async function toggleSuspend(form: FormData) {
  const { db } = await requireAdmin();
  const id = Number(form.get("id"));
  await db
    .prepare("UPDATE stores SET status = CASE status WHEN 'active' THEN 'suspended' ELSE 'active' END WHERE id = ?")
    .bind(id)
    .run();
  revalidatePath("/admin");
}
