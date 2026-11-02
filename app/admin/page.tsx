import Link from "next/link";
import { PageTitle } from "@/components/dash/ui";
import { BILLING } from "@/lib/billing";
import { formatDA } from "@/lib/format";
import { REMINDER_LABEL, reminderMessage, type ReminderKind } from "@/lib/renewal";
import { sheetConfigured } from "@/lib/sheet-sync";
import { algeriaDate, daysLeft, dmy, lifecycleOf, storeState } from "@/lib/store-state";
import { requireAdmin } from "@/lib/tenant";
import type { Lang } from "@/lib/types";
import { DailyJobButton, DeleteStoreItem, ReminderItem, SheetActions } from "./TodayParts";

type S = { id: number; slug: string; name: string; owner_name: string; owner_phone: string; lang: Lang; status: "active" | "suspended"; expires_at: string; custom: number };
type R = S & { rid: number; kind: ReminderKind; created_at: string };

// Admin home: what to do today (reminders to send, stores to delete) + key numbers
export default async function Today() {
  const { db, env } = await requireAdmin();
  const now = Date.now();
  const month = algeriaDate(now).slice(0, 7);
  const monthStartUtc = new Date(Date.parse(`${month}-01T00:00:00Z`) - 3_600_000).toISOString().slice(0, 19).replace("T", " ");
  const storeCols = `s.id, s.slug, s.name, s.owner_name, s.owner_phone, s.lang, s.status, s.expires_at,
    EXISTS (SELECT 1 FROM domains d WHERE d.store_id = s.id AND d.kind = 'custom') AS custom`;

  const [{ results: stores }, { results: reminders }, revenue, queue, lastJob] = await Promise.all([
    db.prepare(`SELECT ${storeCols} FROM stores s`).all<S>(),
    db
      .prepare(`SELECT r.id AS rid, r.kind, r.created_at, ${storeCols} FROM renewal_reminders r JOIN stores s ON s.id = r.store_id WHERE r.status = 'pending' ORDER BY s.expires_at`)
      .all<R>(),
    db.prepare("SELECT COALESCE(SUM(amount), 0) AS n FROM payments WHERE created_at >= ?").bind(monthStartUtc).first<{ n: number }>(),
    db.prepare("SELECT COUNT(*) AS n, MAX(last_error) AS err FROM sheet_sync_queue").first<{ n: number; err: string | null }>(),
    db.prepare("SELECT created_at FROM admin_log WHERE action = 'daily_job' ORDER BY id DESC LIMIT 1").first<{ created_at: string }>(),
  ]);

  const live = stores.filter((s) => s.status !== "suspended");
  const counters = [
    { label: "Boutiques actives", value: live.filter((s) => ["active", "grace"].includes(storeState(s))).length },
    { label: "Renouvellements ce mois", value: live.filter((s) => algeriaDate(Date.parse(s.expires_at)).slice(0, 7) === month).length },
    { label: "Expirées", value: stores.filter((s) => ["expired", "to_delete"].includes(lifecycleOf(s.expires_at))).length },
    { label: "Encaissé ce mois", value: formatDA(revenue?.n ?? 0) },
  ];
  const toDelete = stores.filter((s) => lifecycleOf(s.expires_at) === "to_delete");
  const storeUrl = (slug: string) => `https://${slug}.${env.ROOT_DOMAIN}`;

  return (
    <>
      <PageTitle fr="Aujourd'hui" ar="اليوم" />
      <div className="grid grid-cols-2 gap-3">
        {counters.map((c) => (
          <div key={c.label} className="dash-card p-4">
            <p className="text-2xl font-black" data-testid={`counter-${c.label}`}><bdi>{c.value}</bdi></p>
            <p className="text-sm text-gray-600">{c.label}</p>
          </div>
        ))}
      </div>

      <h2 className="mb-2 mt-6 text-lg font-extrabold">📣 Rappels de renouvellement ({reminders.length})</h2>
      {reminders.length === 0 ? (
        <p className="dash-card p-4 text-sm text-gray-500">Rien à envoyer aujourd&apos;hui ✓</p>
      ) : (
        <ul className="space-y-3">
          {reminders.map((r) => {
            const d = daysLeft(r.expires_at, now);
            const amount = r.custom ? BILLING.renewal.custom_domain : BILLING.renewal.standard;
            return (
              <ReminderItem
                key={r.rid}
                id={r.rid}
                title={r.name}
                subtitle={`${r.owner_name} · ${r.owner_phone} · fin ${dmy(r.expires_at)} (${d >= 0 ? `J-${d}` : `J+${-d}`}) · ${formatDA(amount)}`}
                label={REMINDER_LABEL[r.kind]}
                lang={r.lang}
                phone={r.owner_phone}
                message={reminderMessage({ lang: r.lang, ownerName: r.owner_name || r.name, storeName: r.name, storeUrl: storeUrl(r.slug), expiresAt: r.expires_at, daysLeft: d, amount })}
              />
            );
          })}
        </ul>
      )}

      {toDelete.length > 0 && (
        <>
          <h2 className="mb-2 mt-6 text-lg font-extrabold">🗑️ À supprimer ({toDelete.length})</h2>
          <p className="mb-2 text-sm text-gray-500">Expirées depuis plus de 60 jours. Rien n&apos;est supprimé sans votre confirmation.</p>
          <ul className="space-y-3">
            {toDelete.map((s) => (
              <DeleteStoreItem key={s.id} id={s.id} slug={s.slug} name={s.name} detail={`${s.owner_name} · ${s.owner_phone} · expirée le ${dmy(s.expires_at)}`} />
            ))}
          </ul>
        </>
      )}

      <h2 className="mb-2 mt-6 text-lg font-extrabold">📊 Google Sheet</h2>
      <section className="dash-card space-y-3 p-4">
        <p className="text-sm">
          {sheetConfigured(env) ? "✅ Connecté" : "⚪ Non connecté (SHEET_WEBHOOK_URL / SHEET_SECRET)"} ·{" "}
          <b data-testid="sheet-pending">{queue?.n ?? 0}</b> en attente de relance
        </p>
        {queue?.err && <p className="text-xs text-red-700">Dernière erreur : {queue.err}</p>}
        <SheetActions />
      </section>

      <h2 className="mb-2 mt-6 text-lg font-extrabold">⚙️ Tâche quotidienne</h2>
      <section className="dash-card space-y-2 p-4">
        <p className="text-sm text-gray-600">
          Chaque jour à 08:00 (heure d&apos;Algérie). Dernière exécution : {lastJob ? `${lastJob.created_at} UTC` : "jamais"}.
        </p>
        <DailyJobButton />
      </section>
      <p className="mt-6 text-center text-sm">
        <Link href="/stores" className="underline">Toutes les boutiques →</Link>
      </p>
    </>
  );
}
