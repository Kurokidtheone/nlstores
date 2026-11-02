import { PageTitle } from "@/components/dash/ui";
import { DESIGNS } from "@/designs/registry";
import { requireSeller } from "@/lib/tenant";
import { SettingsForm } from "./SettingsForm";

export default async function SettingsPage() {
  const { store } = await requireSeller();
  return (
    <>
      <PageTitle fr="Réglages" ar="الإعدادات" />
      <SettingsForm store={store} designs={DESIGNS.map((d) => ({ id: d.id, name: d.name }))} />
    </>
  );
}
