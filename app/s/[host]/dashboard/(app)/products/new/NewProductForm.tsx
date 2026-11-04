"use client";
import { useActionState } from "react";
import { Bi, FieldError } from "@/components/dash/ui";
import { SubmitButton } from "@/components/dash/SubmitButton";
import { createProduct, type CreateState } from "../../../actions";

export function NewProductForm() {
  const [state, action] = useActionState<CreateState, FormData>(createProduct, {});
  return (
    <form action={action} className="dash-card space-y-4 p-4">
      <label className="block space-y-1">
        <Bi fr="Nom du produit" ar="اسم المنتج" />
        <input name="name" className="dash-input" required autoFocus aria-invalid={!!state.errors?.name} />
        <FieldError msg={state.errors?.name} />
      </label>
      <label className="block space-y-1">
        <Bi fr="Prix (DA)" ar="السعر (دج)" />
        <input name="price" className="dash-input" inputMode="numeric" required aria-invalid={!!state.errors?.price} />
        <FieldError msg={state.errors?.price} />
      </label>
      <p className="text-sm text-gray-500">
        Ensuite : photos, offres, variantes… <span className="ar block">بعد ذلك: الصور، العروض، الخيارات…</span>
      </p>
      <SubmitButton>Continuer · <span className="ar">متابعة</span></SubmitButton>
    </form>
  );
}
