import Link from "next/link";
import { requireSeller } from "@/lib/tenant";
import { logout } from "../actions";
import { PasswordForm } from "./PasswordForm";

// Outside the (app) group on purpose: no nav bar, so a forced change cannot be skipped.
export default async function PasswordPage() {
  const { store } = await requireSeller({ passwordScreen: true });
  const forced = store.must_change_password === 1;
  return (
    <main className="mx-auto max-w-sm px-4 py-8">
      {!forced && (
        <Link href="/dashboard/settings" className="mb-4 inline-block text-sm text-gray-600">← Réglages · الإعدادات</Link>
      )}
      <h1 className="mb-1 text-2xl font-extrabold">Changer le mot de passe</h1>
      <p className="ar mb-5 text-lg text-gray-600">تغيير كلمة السر</p>
      {forced && (
        <p className="mb-4 rounded-xl bg-amber-100 p-3 text-sm font-semibold text-amber-900">
          Pour la sécurité de votre boutique, choisissez votre propre mot de passe avant de continuer.
          <span className="ar mt-1 block">لأمان متجرك، اختر كلمة سر خاصة بك قبل المتابعة.</span>
        </p>
      )}
      <PasswordForm />
      <form action={logout} className="mt-6">
        <button className="dash-btn w-full text-gray-500">Se déconnecter · <span className="ar">خروج</span></button>
      </form>
    </main>
  );
}
