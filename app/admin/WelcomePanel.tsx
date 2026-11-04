"use client";
import { useState } from "react";
import { waLink } from "@/lib/algeria/phone";
import type { Welcome } from "./actions";

const DOMAIN_STATUS: Record<string, { label: string; cls: string }> = {
  active: { label: "actif", cls: "bg-green-100 text-green-800" },
  pending: { label: "en attente", cls: "bg-amber-100 text-amber-800" },
  to_retry: { label: "à réessayer", cls: "bg-red-100 text-red-800" },
};

/** Ready-to-send welcome message: Copy + Send on WhatsApp (wa.me to the client) */
export function WelcomePanel({ welcome, title }: { welcome: Welcome; title: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(welcome.message);
    } catch {
      // Old browsers / no permission: select the text so the admin can copy by hand
      const el = document.getElementById(`welcome-${welcome.storeId}`);
      if (el) window.getSelection()?.selectAllChildren(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }
  const d = welcome.domain;
  return (
    <section className="dash-card space-y-4 border-2 border-green-300 p-4">
      <h2 className="text-xl font-extrabold">{title}</h2>
      <a href={welcome.storeUrl} target="_blank" rel="noopener" className="block break-all font-semibold text-[var(--brand)] underline">
        {welcome.storeUrl}
      </a>
      {d && (
        <p className="flex flex-wrap items-center gap-2 text-sm">
          Domaine <b>{d.hostname}</b>
          <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${DOMAIN_STATUS[d.status]?.cls ?? ""}`}>{DOMAIN_STATUS[d.status]?.label ?? d.status}</span>
          {d.status === "to_retry" && <span className="w-full text-xs text-red-700">Cloudflare : {d.error}. La boutique marche déjà sur le sous-domaine ; « Vérifier maintenant » dans la liste pour réessayer.</span>}
        </p>
      )}
      <div>
        <p className="mb-1 text-sm font-semibold text-gray-600">
          Message de bienvenue ({welcome.lang === "ar" ? "arabe" : "français"})
        </p>
        <div
          id={`welcome-${welcome.storeId}`}
          dir={welcome.lang === "ar" ? "rtl" : "ltr"}
          className="max-h-96 overflow-auto whitespace-pre-wrap break-words rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm leading-relaxed [unicode-bidi:plaintext]"
          data-testid="welcome-message"
        >
          {welcome.message}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={copy} className="dash-btn dash-btn-ghost">
          {copied ? "Copié ✓" : "📋 Copier"}
        </button>
        <a href={waLink(welcome.phone, welcome.message)} target="_blank" rel="noopener" className="dash-btn bg-[#25d366] text-white">
          💬 WhatsApp
        </a>
      </div>
      <p className="text-center text-xs text-gray-500">
        Le mot de passe provisoire n&apos;est enregistré nulle part : envoyez ce message maintenant.
      </p>
    </section>
  );
}
