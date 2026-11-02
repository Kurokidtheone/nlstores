"use client";
import { useActionState, useState } from "react";
import { SubmitButton } from "@/components/dash/SubmitButton";
import { Bi, FieldError } from "@/components/dash/ui";
import { changePassword, type PasswordState } from "../actions";

export function PasswordForm() {
  const [state, action] = useActionState<PasswordState, FormData>(changePassword, {});
  const [show, setShow] = useState(false);
  const [next, setNext] = useState("");
  const type = show ? "text" : "password";
  const field = (name: string, fr: string, ar: string, auto: string, extra?: React.ReactNode) => (
    <div>
      <label className="block space-y-1">
        <Bi fr={fr} ar={ar} />
        <input
          name={name}
          type={type}
          autoComplete={auto}
          required
          className="dash-input"
          aria-invalid={state.field === name}
          onChange={name === "new" ? (e) => setNext(e.target.value) : undefined}
        />
      </label>
      {extra}
      {state.field === name && <FieldError msg={state.error} />}
    </div>
  );
  return (
    <form action={action} className="dash-card space-y-4 p-5">
      {field("current", "Mot de passe actuel", "كلمة السر الحالية", "current-password")}
      {field(
        "new",
        "Nouveau mot de passe (8 caractères min.)",
        "كلمة السر الجديدة (8 أحرف على الأقل)",
        "new-password",
        next && (
          <p className={`mt-1 text-xs font-semibold ${next.length >= 8 ? "text-green-700" : "text-amber-700"}`}>
            {next.length}/8 {next.length >= 8 ? "✓" : ""}
          </p>
        ),
      )}
      {field("confirm", "Répétez le nouveau mot de passe", "أعد كتابة كلمة السر الجديدة", "new-password")}
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} className="h-5 w-5" />
        Afficher · <span className="ar">إظهار</span>
      </label>
      {state.error && !state.field && <FieldError msg={state.error} />}
      <SubmitButton>
        Enregistrer · <span className="ar">حفظ</span>
      </SubmitButton>
      <p className="text-center text-xs text-gray-500">
        Vos autres appareils seront déconnectés. <span className="ar block">سيتم الخروج من أجهزتك الأخرى.</span>
      </p>
    </form>
  );
}
