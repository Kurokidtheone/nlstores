"use client";
import { useState, useTransition } from "react";
import { resendWelcome, type Welcome } from "./actions";
import { WelcomePanel } from "./WelcomePanel";

/** New temporary password + welcome message (the old password stops working) */
export function ResendWelcome({ storeId, storeName }: { storeId: number; storeName: string }) {
  const [welcome, setWelcome] = useState<Welcome | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const run = () => {
    if (!confirm(`Renvoyer le message de bienvenue à « ${storeName} » ?\n\nUn NOUVEAU mot de passe provisoire est créé : l'ancien ne marchera plus et le vendeur est déconnecté.`)) return;
    start(async () => {
      const res = await resendWelcome(storeId);
      if (res.ok) setWelcome(res.welcome);
      else setError(res.error);
    });
  };
  return (
    <div className="w-full space-y-2">
      <button type="button" onClick={run} disabled={pending} className="dash-btn dash-btn-ghost w-full !min-h-11 text-sm">
        {pending ? "…" : "✉️ Renvoyer le message de bienvenue"}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {welcome && <WelcomePanel welcome={welcome} title="Nouveau mot de passe provisoire" />}
    </div>
  );
}
