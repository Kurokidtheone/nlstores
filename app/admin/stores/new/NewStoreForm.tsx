"use client";
import { useActionState } from "react";
import { Bi, FieldError } from "@/components/dash/ui";
import { SubmitButton } from "@/components/dash/SubmitButton";
import { createStore, type AdminState } from "../../actions";

export function NewStoreForm({ rootDomain, designs }: { rootDomain: string; designs: { id: string; name: string }[] }) {
  const [state, action] = useActionState<AdminState, FormData>(createStore, {});
  return (
    <form action={action} className="dash-card space-y-4 p-4">
      <label className="block space-y-1">
        <Bi fr="Nom de la boutique" ar="اسم المتجر" />
        <input name="name" className="dash-input" required />
      </label>
      <label className="block space-y-1">
        <Bi fr="Sous-domaine" ar="النطاق الفرعي" />
        <div className="flex items-center gap-2" dir="ltr">
          <input name="slug" className="dash-input" placeholder="maboutique" autoCapitalize="off" required />
          <span className="flex-none text-sm text-gray-500">.{rootDomain}</span>
        </div>
      </label>
      <label className="block space-y-1">
        <Bi fr="Nom du vendeur" ar="اسم البائع" />
        <input name="owner_name" className="dash-input" />
      </label>
      <label className="block space-y-1">
        <Bi fr="Téléphone du vendeur (identifiant)" ar="هاتف البائع (للدخول)" />
        <input name="owner_phone" className="dash-input" dir="ltr" inputMode="tel" required />
      </label>
      <label className="block space-y-1">
        <Bi fr="Mot de passe (8 caractères min.)" ar="كلمة السر" />
        <input name="password" className="dash-input" minLength={8} required />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block space-y-1">
          <Bi fr="Langue" ar="اللغة" />
          <select name="lang" className="dash-input">
            <option value="ar">العربية</option>
            <option value="fr">Français</option>
          </select>
        </label>
        <label className="block space-y-1">
          <Bi fr="Design" ar="التصميم" />
          <select name="design" className="dash-input">
            {designs.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </label>
      </div>
      <label className="block space-y-1">
        <Bi fr="Domaine personnalisé (facultatif, +5 000 DA)" ar="نطاق خاص (اختياري)" />
        <input name="custom_domain" className="dash-input" dir="ltr" placeholder="www.clientstore.com" autoCapitalize="off" />
      </label>
      <FieldError msg={state.error} />
      {state.ok && <p className="rounded-xl bg-green-100 p-3 font-semibold text-green-800">{state.ok}</p>}
      <SubmitButton>Créer la boutique (1 an)</SubmitButton>
    </form>
  );
}
