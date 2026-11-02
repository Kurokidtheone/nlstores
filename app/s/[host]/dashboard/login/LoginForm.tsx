"use client";
import { useActionState } from "react";
import { Bi, FieldError } from "@/components/dash/ui";
import { SubmitButton } from "@/components/dash/SubmitButton";
import { login, type LoginState } from "../actions";

export function LoginForm() {
  const [state, action] = useActionState<LoginState, FormData>(login, {});
  return (
    <form action={action} className="dash-card space-y-4 p-5">
      <label className="block space-y-1">
        <Bi fr="Téléphone" ar="رقم الهاتف" />
        <input name="phone" className="dash-input" dir="ltr" inputMode="tel" autoComplete="username" required />
      </label>
      <label className="block space-y-1">
        <Bi fr="Mot de passe" ar="كلمة السر" />
        <input name="password" type="password" className="dash-input" autoComplete="current-password" required />
      </label>
      <FieldError msg={state.error} />
      <SubmitButton>
        Se connecter · <span className="ar">دخول</span>
      </SubmitButton>
    </form>
  );
}
