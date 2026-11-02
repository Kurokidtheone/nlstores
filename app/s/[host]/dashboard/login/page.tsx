import { notFound } from "next/navigation";
import { currentStore } from "@/lib/tenant";
import { LoginForm } from "./LoginForm";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ expired?: string; suspended?: string }> }) {
  const store = await currentStore();
  if (!store) notFound();
  const sp = await searchParams;
  const expired = sp.expired === "1" || sp.suspended === "1";
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-4 py-10">
      <h1 className="mb-1 text-center text-2xl font-extrabold">{store.name}</h1>
      <p className="mb-6 text-center text-gray-500">
        Espace vendeur · <span className="ar">فضاء البائع</span>
      </p>
      {expired && (
        <p className="mb-4 rounded-xl bg-amber-100 p-3 text-center text-sm font-semibold text-amber-900">
          Boutique suspendue. Contactez-nous.
          <span className="ar block">المتجر موقوف. تواصل معنا.</span>
        </p>
      )}
      <LoginForm />
    </main>
  );
}
