"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

type Latest = { id: number; customer_name: string; product_name: string; total: number } | null;
const POLL_MS = 30_000;

/**
 * New order alert while the dashboard is open: polls every 30 s (no websockets),
 * then sound + browser notification + banner, and refreshes the page data.
 * Browsers only allow sound and notifications after a tap: hence the "Activer" button.
 */
export function OrderNotifier({ storeId }: { storeId: number }) {
  const router = useRouter();
  const lastId = useRef<number | null>(null);
  const audio = useRef<AudioContext | null>(null);
  const [fresh, setFresh] = useState<NonNullable<Latest>[]>([]);
  const [askAlerts, setAskAlerts] = useState(false);
  const key = `nls-last-order-${storeId}`;

  const beep = useCallback(() => {
    const ctx = audio.current;
    if (!ctx) return;
    // Two short rising tones, no sound file needed
    [880, 1320].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      osc.connect(gain).connect(ctx.destination);
      const t = ctx.currentTime + i * 0.18;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.3, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
      osc.start(t);
      osc.stop(t + 0.17);
    });
  }, []);

  const check = useCallback(async () => {
    try {
      const res = await fetch("/api/seller/latest-order", { cache: "no-store" });
      if (!res.ok) return;
      const { latest } = (await res.json()) as { latest: Latest };
      const id = latest?.id ?? 0;
      if (lastId.current === null) {
        // First check: remember where we are (a reload does not alert again for the same orders)
        const saved = Number(sessionStorage.getItem(key) ?? NaN);
        lastId.current = Number.isFinite(saved) ? saved : id;
      }
      if (latest && id > lastId.current) {
        lastId.current = id;
        setFresh((f) => [latest, ...f].slice(0, 3));
        beep();
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification("🛍️ Nouvelle commande · طلب جديد", {
            body: `#${latest.id} · ${latest.customer_name} · ${latest.product_name} · ${latest.total.toLocaleString("en-US")} DA`,
            tag: `order-${latest.id}`,
          });
        }
        router.refresh();
      }
      sessionStorage.setItem(key, String(lastId.current));
    } catch {
      // offline: try again at the next tick
    }
  }, [beep, key, router]);

  useEffect(() => {
    setAskAlerts(localStorage.getItem("nls-alerts") !== "on" || ("Notification" in window && Notification.permission === "default"));
    check();
    const timer = setInterval(check, POLL_MS);
    // Unlock sound for this page once alerts were enabled before (any tap)
    const unlock = () => {
      if (!audio.current && localStorage.getItem("nls-alerts") === "on") audio.current = new AudioContext();
    };
    document.addEventListener("pointerdown", unlock, { once: true });
    return () => {
      clearInterval(timer);
      document.removeEventListener("pointerdown", unlock);
    };
  }, [check]);

  async function enable() {
    audio.current ??= new AudioContext();
    await audio.current.resume().catch(() => {});
    if ("Notification" in window && Notification.permission === "default") await Notification.requestPermission().catch(() => {});
    localStorage.setItem("nls-alerts", "on");
    setAskAlerts(false);
    beep(); // test sound
  }

  return (
    <>
      {askAlerts && (
        <div className="mx-auto mt-3 flex max-w-2xl items-center justify-between gap-3 rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-3">
          <p className="text-sm">
            🔔 Alerte son + notification à chaque nouvelle commande
            <span className="ar block text-gray-600">تنبيه بالصوت عند كل طلب جديد</span>
          </p>
          <button type="button" onClick={enable} className="dash-btn dash-btn-primary !min-h-11 flex-none text-sm">
            Activer · <span className="ar">تفعيل</span>
          </button>
        </div>
      )}
      {fresh.length > 0 && (
        <div className="fixed inset-x-0 top-2 z-50 px-4" role="alert" data-testid="new-order-alert">
          <div className="mx-auto max-w-2xl rounded-2xl bg-green-600 p-4 text-white shadow-xl">
            <p className="font-bold">🛍️ Nouvelle commande · طلب جديد</p>
            <p className="text-sm" dir="auto">
              #{fresh[0].id} · {fresh[0].customer_name} · {fresh[0].product_name} · {fresh[0].total.toLocaleString("en-US")} DA
            </p>
            <div className="mt-2 flex gap-2">
              <Link href="/dashboard/orders?s=new" onClick={() => setFresh([])} className="rounded-xl bg-white px-3 py-2 text-sm font-bold text-green-700">
                Voir · <span className="ar">عرض</span>
              </Link>
              <button type="button" onClick={() => setFresh([])} className="rounded-xl px-3 py-2 text-sm">
                Fermer · <span className="ar">إغلاق</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
