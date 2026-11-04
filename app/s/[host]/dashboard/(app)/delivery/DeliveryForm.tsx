"use client";
import { useActionState, useRef, useState } from "react";
import { Bi, FieldError } from "@/components/dash/ui";
import { SubmitButton } from "@/components/dash/SubmitButton";
import { SOUTH_WILAYAS, WILAYAS, WILAYA_COUNT } from "@/lib/algeria/wilayas";
import type { DeliveryPrice } from "@/lib/types";
import { saveDelivery, type SimpleState } from "../../actions";

const SOUTH = new Set(SOUTH_WILAYAS);

export function DeliveryForm({ prices }: { prices: DeliveryPrice[] }) {
  const [state, action] = useActionState<SimpleState, FormData>(saveDelivery, {});
  const form = useRef<HTMLFormElement>(null);
  const [home, setHome] = useState("");
  const [desk, setDesk] = useState("");
  const [applied, setApplied] = useState<string | null>(null);

  /** Fills the table (not saved until "Enregistrer"). Empty helper box = that column is left as is. */
  function apply(scope: "all" | "south") {
    const codes = WILAYAS.map((w) => w.code).filter((c) => scope === "all" || SOUTH.has(c));
    const set = (type: "home" | "desk", value: string) => {
      if (!value) return;
      for (const c of codes) {
        const input = form.current?.elements.namedItem(`${type}_${c}`);
        if (input instanceof HTMLInputElement) input.value = value;
      }
    };
    set("home", home);
    set("desk", desk);
    setApplied(
      scope === "all"
        ? `Appliqué aux ${WILAYA_COUNT} wilayas · طُبق على ${WILAYA_COUNT} ولاية`
        : `Appliqué aux ${codes.length} wilayas du Sud · طُبق على ${codes.length} ولاية في الجنوب`,
    );
  }

  const nothing = !home && !desk;

  return (
    <form ref={form} action={action} className="space-y-3">
      <section className="dash-card space-y-3 p-4">
        <h2 className="text-lg">
          <Bi fr="⚡ Remplissage rapide" ar="تعبئة سريعة" className="[&>span:first-child]:font-extrabold" />
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <label className="block space-y-1">
            <Bi fr="Domicile (DA)" ar="المنزل (دج)" className="text-sm" />
            <input value={home} onChange={(e) => setHome(e.target.value.replace(/\D/g, ""))} inputMode="numeric" placeholder="700" className="dash-input" />
          </label>
          <label className="block space-y-1">
            <Bi fr="Stop desk (DA)" ar="المكتب (دج)" className="text-sm" />
            <input value={desk} onChange={(e) => setDesk(e.target.value.replace(/\D/g, ""))} inputMode="numeric" placeholder="450" className="dash-input" />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" disabled={nothing} onClick={() => apply("all")} className="dash-btn dash-btn-primary !px-2 text-sm leading-tight">
            <span>
              Toutes les {WILAYA_COUNT} wilayas
              <span className="ar block font-normal">كل الولايات</span>
            </span>
          </button>
          <button type="button" disabled={nothing} onClick={() => apply("south")} className="dash-btn dash-btn-ghost !px-2 text-sm leading-tight">
            <span>
              Wilayas du Sud ({SOUTH_WILAYAS.length})
              <span className="ar block font-normal">ولايات الجنوب</span>
            </span>
          </button>
        </div>
        <details className="text-xs text-gray-500">
          <summary className="cursor-pointer">Quelles wilayas du Sud ? · <span className="ar">ما هي ولايات الجنوب؟</span></summary>
          <p className="mt-1">{SOUTH_WILAYAS.map((c) => `${String(c).padStart(2, "0")} ${WILAYAS[c - 1].fr}`).join(" · ")}</p>
        </details>
        <p className="text-xs text-gray-500">
          Astuce : d&apos;abord « Toutes », puis « Sud » avec un prix plus élevé, puis corrigez une wilaya à la main si besoin.
          <span className="ar block">نصيحة: أولا «كل الولايات»، ثم «الجنوب» بسعر أعلى، ثم عدّل أي ولاية يدويا.</span>
        </p>
        {applied && (
          <p role="status" className="rounded-xl bg-amber-50 p-2 text-center text-sm font-semibold text-amber-900">
            {applied}
            <span className="block font-normal">N&apos;oubliez pas d&apos;enregistrer · لا تنس الحفظ</span>
          </p>
        )}
      </section>

      <p className="text-sm text-gray-600">
        Laissez vide = pas de livraison. <span className="ar block">اترك الخانة فارغة = لا يوجد توصيل.</span>
      </p>
      <div className="dash-card divide-y divide-gray-100">
        <div className="grid grid-cols-[1fr_6rem_6rem] gap-2 px-3 py-2 text-xs text-gray-500">
          <span>Wilaya</span>
          <Bi fr="Domicile" ar="المنزل" />
          <Bi fr="Stop desk" ar="المكتب" />
        </div>
        {WILAYAS.map((w) => {
          const p = prices[w.code - 1];
          return (
            <div key={w.code} className="grid grid-cols-[1fr_6rem_6rem] items-center gap-2 px-3 py-2">
              <span className="text-sm">
                <b>{String(w.code).padStart(2, "0")}</b> {w.fr}
                {SOUTH.has(w.code) && <span className="ms-1 text-xs text-amber-700">· Sud</span>}
                <span className="ar block text-xs text-gray-500">{w.ar}</span>
              </span>
              <input name={`home_${w.code}`} defaultValue={p.home_price ?? ""} inputMode="numeric" className="dash-input !min-h-11 !px-2" aria-label={`Domicile ${w.fr}`} />
              <input name={`desk_${w.code}`} defaultValue={p.desk_price ?? ""} inputMode="numeric" className="dash-input !min-h-11 !px-2" aria-label={`Stop desk ${w.fr}`} />
            </div>
          );
        })}
      </div>
      <div className="sticky bottom-20 space-y-2">
        <FieldError msg={state.error} />
        {state.ok && <p className="rounded-xl bg-green-100 p-2 text-center font-semibold text-green-800">Enregistré ✓ · تم الحفظ</p>}
        <SubmitButton className="dash-btn dash-btn-primary w-full shadow-lg">💾 Enregistrer · <span className="ar">حفظ</span></SubmitButton>
      </div>
    </form>
  );
}
