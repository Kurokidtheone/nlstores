import { endImpersonation } from "@/app/s/[host]/dashboard/actions";

/** Shown on every dashboard page while the owner is viewing a store from admin (support) */
export function ImpersonationBanner({ storeName }: { storeName: string }) {
  return (
    <div className="sticky top-0 z-40 flex items-center justify-between gap-3 bg-red-600 px-4 py-2 text-sm font-bold text-white" role="status">
      <span>🛠️ Vous êtes connecté en tant qu&apos;admin · {storeName}</span>
      <form action={endImpersonation}>
        <button className="rounded-lg bg-white px-3 py-1.5 text-red-700">Quitter</button>
      </form>
    </div>
  );
}
