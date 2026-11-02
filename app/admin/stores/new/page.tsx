import Link from "next/link";
import { PageTitle } from "@/components/dash/ui";
import { DESIGNS } from "@/designs/registry";
import { requireAdmin } from "@/lib/tenant";
import { NewStoreForm } from "./NewStoreForm";

export default async function NewStorePage() {
  const { env } = await requireAdmin();
  return (
    <>
      <Link href="/" className="mb-3 inline-block text-sm text-gray-600">← Boutiques</Link>
      <PageTitle fr="Nouvelle boutique" ar="متجر جديد" />
      <NewStoreForm rootDomain={env.ROOT_DOMAIN} designs={DESIGNS.map((d) => ({ id: d.id, name: d.name }))} />
    </>
  );
}
