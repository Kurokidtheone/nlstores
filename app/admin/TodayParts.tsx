"use client";
import { useState, useTransition } from "react";
import type { DailyReport } from "@/lib/daily-job";
import type { Lang } from "@/lib/types";
import { deleteStore, markReminderSent, retrySheetNow, runDailyJobNow, syncAllToSheet } from "./actions";
import { MessageBox } from "./MessageBox";

/** A reminder: the message + WhatsApp button; sending marks it as sent */
export function ReminderItem(p: { id: number; title: string; subtitle: string; label: string; message: string; phone: string; lang: Lang }) {
  const [, start] = useTransition();
  const [sent, setSent] = useState(false);
  return (
    <li className={`dash-card space-y-2 p-4 ${sent ? "opacity-50" : ""}`} data-testid="reminder">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-bold">{p.title}</p>
          <p className="text-sm text-gray-600">{p.subtitle}</p>
        </div>
        <span className="flex-none rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900">{sent ? "envoyé ✓" : p.label}</span>
      </div>
      <MessageBox
        message={p.message}
        phone={p.phone}
        lang={p.lang}
        onSend={() => {
          setSent(true);
          start(() => markReminderSent(p.id));
        }}
      />
    </li>
  );
}

export function DailyJobButton() {
  const [report, setReport] = useState<DailyReport | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="space-y-2">
      <button type="button" disabled={pending} onClick={() => start(async () => setReport(await runDailyJobNow()))} className="dash-btn dash-btn-ghost w-full">
        {pending ? "Tâche en cours…" : "▶️ Lancer la tâche quotidienne maintenant"}
      </button>
      {report && (
        <div className="rounded-xl bg-gray-50 p-3 text-sm" data-testid="job-report">
          <p className="font-semibold">Terminé à {report.ranAt.slice(11, 16)} UTC</p>
          <p>Changements de statut : {report.lifecycleChanges.length ? report.lifecycleChanges.map((c) => `${c.name} (${c.from} → ${c.to})`).join(", ") : "aucun"}</p>
          <p>Nouveaux rappels : {report.remindersCreated} · À supprimer : {report.toDelete}</p>
          <p>
            Google Sheet : {report.sheet.retried} relancé(s), {report.sheet.synced} synchronisé(s)
            {report.sheet.result && !report.sheet.result.ok && ` — ${report.sheet.result.error}`}
          </p>
        </div>
      )}
    </div>
  );
}

export function SheetActions() {
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={pending}
          className="dash-btn dash-btn-primary !min-h-11 text-sm"
          onClick={() =>
            start(async () => {
              const r = await syncAllToSheet();
              setMsg(r.ok ? `✅ ${r.count} boutique(s) envoyée(s) au Google Sheet` : `❌ ${r.error}`);
            })
          }
        >
          🔄 Tout synchroniser
        </button>
        <button
          type="button"
          disabled={pending}
          className="dash-btn dash-btn-ghost !min-h-11 text-sm"
          onClick={() =>
            start(async () => {
              const r = await retrySheetNow();
              setMsg(r.result.ok ? `✅ ${r.retried} relancé(s)` : `❌ ${r.result.error}`);
            })
          }
        >
          ↻ Relancer la file
        </button>
      </div>
      <a href="/export" className="dash-btn dash-btn-ghost w-full !min-h-11 text-sm">⬇️ Export CSV</a>
      {msg && <p className="text-sm font-semibold" data-testid="sheet-msg">{msg}</p>}
    </div>
  );
}

export function DeleteStoreItem({ id, slug, name, detail }: { id: number; slug: string; name: string; detail: string }) {
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();
  if (done) return <li className="dash-card p-4 text-sm text-gray-500">« {name} » supprimée.</li>;
  return (
    <li className="dash-card space-y-2 border-red-200 p-4" data-testid={`to-delete-${slug}`}>
      <p className="font-bold">{name}</p>
      <p className="text-sm text-gray-600">{detail}</p>
      <label className="block text-sm">
        Pour supprimer définitivement (photos, produits, commandes), tapez <b className="font-mono">{slug}</b> :
        <input className="dash-input mt-1" value={typed} onChange={(e) => setTyped(e.target.value)} autoCapitalize="off" aria-label={`Confirmer ${slug}`} />
      </label>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <button
        type="button"
        disabled={pending || typed.trim() !== slug}
        className="dash-btn w-full !min-h-11 bg-red-600 text-sm text-white"
        onClick={() =>
          start(async () => {
            const r = await deleteStore(id, typed);
            if (r.ok) setDone(true);
            else setError(r.error ?? "Erreur");
          })
        }
      >
        🗑️ Supprimer définitivement
      </button>
    </li>
  );
}
