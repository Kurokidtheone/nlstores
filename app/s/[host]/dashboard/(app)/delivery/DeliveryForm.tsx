"use client";
import { useActionState, useRef } from "react";
import { Bi, FieldError } from "@/components/dash/ui";
import { SubmitButton } from "@/components/dash/SubmitButton";
import { WILAYAS } from "@/lib/algeria/wilayas";
import type { DeliveryPrice } from "@/lib/types";
import { saveDelivery, type SimpleState } from "../../actions";

export function DeliveryForm({ prices }: { prices: DeliveryPrice[] }) {
  const [state, action] = useActionState<SimpleState, FormData>(saveDelivery, {});
  const form = useRef<HTMLFormElement>(null);
  const fillAll = (type: "home" | "desk") => {
    const v = prompt(type === "home" ? "Prix domicile pour toutes les wilayas (DA)" : "Prix stop desk pour toutes les wilayas (DA)");
    if (v === null) return;
    form.current?.querySelectorAll<HTMLInputElement>(`input[name^="${type}_"]`).forEach((i) => (i.value = v.replace(/\D/g, "")));
  };
  return (
    <form ref={form} action={action} className="space-y-3">
      <p className="text-sm text-gray-600">
        Laissez vide = pas de livraison. <span className="ar block">اترك الخانة فارغة = لا يوجد توصيل.</span>
      </p>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => fillAll("home")} className="dash-btn dash-btn-ghost text-sm">Tout domicile · الكل</button>
        <button type="button" onClick={() => fillAll("desk")} className="dash-btn dash-btn-ghost text-sm">Tout stop desk · الكل</button>
      </div>
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
        <SubmitButton>Enregistrer · <span className="ar">حفظ</span></SubmitButton>
      </div>
    </form>
  );
}
