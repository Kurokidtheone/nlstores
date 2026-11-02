"use client";
import { useActionState } from "react";
import { Bi, FieldError } from "@/components/dash/ui";
import { SubmitButton } from "@/components/dash/SubmitButton";
import type { Store } from "@/lib/types";
import { saveSettings, type SimpleState } from "../../actions";

export function SettingsForm({ store, designs }: { store: Store; designs: { id: string; name: string }[] }) {
  const [state, action] = useActionState<SimpleState, FormData>(saveSettings, {});
  return (
    <form action={action} className="space-y-4">
      <div className="dash-card space-y-4 p-4">
        <label className="block space-y-1">
          <Bi fr="Nom de la boutique" ar="اسم المتجر" />
          <input name="name" defaultValue={store.name} className="dash-input" required />
        </label>
        <label className="block space-y-1">
          <Bi fr="Langue de la boutique" ar="لغة المتجر" />
          <select name="lang" defaultValue={store.lang} className="dash-input">
            <option value="ar">العربية</option>
            <option value="fr">Français</option>
          </select>
        </label>
        <label className="block space-y-1">
          <Bi fr="Design" ar="التصميم" />
          <select name="design" defaultValue={store.design} className="dash-input">
            {designs.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </label>
        <label className="flex items-center justify-between gap-3">
          <Bi fr="Couleur principale" ar="اللون الرئيسي" />
          <input name="primary_color" type="color" defaultValue={store.primary_color} className="h-12 w-20 rounded-xl border border-gray-300" />
        </label>
      </div>
      <div className="dash-card space-y-4 p-4">
        <label className="block space-y-1">
          <Bi fr="WhatsApp (facultatif)" ar="واتساب (اختياري)" />
          <input name="whatsapp" defaultValue={store.whatsapp ?? ""} className="dash-input" dir="ltr" inputMode="tel" />
        </label>
        <label className="block space-y-1">
          <Bi fr="ID Pixel Meta (Facebook)" ar="معرف بيكسل ميتا" />
          <input name="meta_pixel_id" defaultValue={store.meta_pixel_id ?? ""} className="dash-input" dir="ltr" inputMode="numeric" />
        </label>
        <label className="block space-y-1">
          <Bi fr="ID Pixel TikTok" ar="معرف بيكسل تيك توك" />
          <input name="tiktok_pixel_id" defaultValue={store.tiktok_pixel_id ?? ""} className="dash-input" dir="ltr" />
        </label>
      </div>
      <FieldError msg={state.error} />
      {state.ok && <p className="rounded-xl bg-green-100 p-2 text-center font-semibold text-green-800">Enregistré ✓ · تم الحفظ</p>}
      <SubmitButton>Enregistrer · <span className="ar">حفظ</span></SubmitButton>
    </form>
  );
}
