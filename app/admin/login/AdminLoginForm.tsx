"use client";
import { useActionState } from "react";
import { Bi, FieldError } from "@/components/dash/ui";
import { SubmitButton } from "@/components/dash/SubmitButton";
import { adminLogin, type AdminState } from "../actions";

export function AdminLoginForm() {
  const [state, action] = useActionState<AdminState, FormData>(adminLogin, {});
  return (
    <form action={action} className="dash-card space-y-4 p-5">
      <label className="block space-y-1">
        <Bi fr="Mot de passe admin" ar="كلمة سر المدير" />
        <input name="password" type="password" className="dash-input" autoComplete="current-password" required />
      </label>
      <FieldError msg={state.error} />
      <SubmitButton>Se connecter</SubmitButton>
    </form>
  );
}
