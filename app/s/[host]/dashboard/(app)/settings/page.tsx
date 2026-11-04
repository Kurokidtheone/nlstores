import Link from "next/link";
import { PageTitle } from "@/components/dash/ui";
import { requireSeller } from "@/lib/tenant";
import { SettingsForm } from "./SettingsForm";

export default async function SettingsPage() {
  const { store } = await requireSeller();
  return (
    <>
      <PageTitle fr="Réglages" ar="الإعدادات" />
      <SettingsForm store={store} />
      <div className="mt-6 grid gap-3">
        <Link href="/dashboard/password" className="dash-btn dash-btn-ghost">
          🔒 Changer le mot de passe · <span className="ar">تغيير كلمة السر</span>
        </Link>
        <Link href="/dashboard/help" className="dash-btn dash-btn-ghost">
          ❓ Aide et tutoriels · <span className="ar">مساعدة وشروحات</span>
        </Link>
      </div>
    </>
  );
}
