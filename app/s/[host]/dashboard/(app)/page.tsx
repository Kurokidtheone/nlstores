import Link from "next/link";
import { Bi, PageTitle } from "@/components/dash/ui";
import { formatDA } from "@/lib/format";
import { getStats } from "@/lib/orders";
import { requireSeller } from "@/lib/tenant";
import type { Store } from "@/lib/types";
import { logout } from "../actions";

type Step = { done: boolean; fr: string; ar: string; href: string };

async function setupSteps(db: D1Database, store: Store): Promise<Step[]> {
  const products = await db.prepare("SELECT COUNT(*) AS n FROM products WHERE store_id = ? AND is_sample = 0").bind(store.id).first<{ n: number }>();
  return [
    { done: !!store.logo_key, fr: "Ajouter votre logo", ar: "أضف شعارك", href: "/dashboard/settings" },
    { done: (products?.n ?? 0) > 0, fr: "Ajouter au moins un produit", ar: "أضف منتجا واحدا على الأقل", href: "/dashboard/products" },
    { done: store.delivery_checked === 1, fr: "Vérifier les prix de livraison", ar: "راجع أسعار التوصيل", href: "/dashboard/delivery" },
    { done: !!(store.meta_pixel_id || store.tiktok_pixel_id), fr: "Ajouter un Pixel (Meta ou TikTok)", ar: "أضف بيكسل (ميتا أو تيك توك)", href: "/dashboard/settings" },
    { done: !!store.password_changed_at, fr: "Changer le mot de passe", ar: "غيّر كلمة السر", href: "/dashboard/password" },
  ];
}

export default async function DashboardHome({ searchParams }: { searchParams: Promise<{ password?: string }> }) {
  const { store, db } = await requireSeller();
  const [s, steps] = await Promise.all([getStats(db, store.id), setupSteps(db, store)]);
  const doneCount = steps.filter((x) => x.done).length;
  const passwordChanged = (await searchParams).password === "changed";
  const cards = [
    { fr: "Aujourd'hui", ar: "اليوم", v: s.today, href: "/dashboard/orders" },
    { fr: "À appeler", ar: "للاتصال", v: s.pending, href: "/dashboard/orders?s=new" },
    { fr: "Confirmées", ar: "مؤكدة", v: s.confirmed, href: "/dashboard/orders?s=confirmed" },
    { fr: "Livrées", ar: "تم التوصيل", v: s.delivered, href: "/dashboard/orders?s=delivered" },
  ];
  return (
    <>
      <PageTitle fr={store.name} ar="لوحة التحكم" />
      {passwordChanged && (
        <p className="mb-4 rounded-xl bg-green-100 p-3 text-center font-semibold text-green-800">
          Mot de passe changé ✓ · <span className="ar">تم تغيير كلمة السر</span>
        </p>
      )}

      {doneCount < steps.length && (
        <section className="dash-card mb-4 space-y-3 border-2 border-indigo-200 p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg">
              <Bi fr="🚀 Préparer ma boutique" ar="تجهيز متجري" className="[&>span:first-child]:font-extrabold" />
            </h2>
            <span className="flex-none rounded-full bg-indigo-100 px-3 py-1 text-sm font-bold text-indigo-800">
              {doneCount}/{steps.length}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-gray-200" aria-hidden>
            <div className="h-full rounded-full bg-[var(--brand)]" style={{ width: `${(doneCount / steps.length) * 100}%` }} />
          </div>
          <ul className="space-y-2">
            {steps.map((step) => (
              <li key={step.fr}>
                <Link
                  href={step.href}
                  className={`flex min-h-14 items-center gap-3 rounded-xl border px-3 py-2 ${step.done ? "border-green-200 bg-green-50 text-gray-500" : "border-gray-200 bg-white"}`}
                >
                  <span
                    className={`flex h-7 w-7 flex-none items-center justify-center rounded-full text-sm font-bold ${step.done ? "bg-green-600 text-white" : "border-2 border-gray-300"}`}
                    aria-label={step.done ? "Fait" : "À faire"}
                  >
                    {step.done ? "✓" : ""}
                  </span>
                  <Bi fr={step.fr} ar={step.ar} className={step.done ? "line-through" : ""} />
                  {!step.done && <span className="ms-auto text-xl text-gray-400" aria-hidden>›</span>}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="grid grid-cols-2 gap-3">
        {cards.map((c) => (
          <Link key={c.fr} href={c.href} className="dash-card p-4">
            <p className="text-3xl font-black">{c.v}</p>
            <Bi fr={c.fr} ar={c.ar} className="text-sm text-gray-600" />
          </Link>
        ))}
      </div>
      <div className="dash-card mt-3 p-4">
        <Bi fr="Chiffre d'affaires livré" ar="رقم الأعمال (المسلَّم)" className="text-sm text-gray-600" />
        <p className="mt-1 text-2xl font-black"><bdi>{formatDA(s.revenue)}</bdi></p>
      </div>
      <div className="mt-6 grid gap-3">
        <Link href="/dashboard/orders?s=new" className="dash-btn dash-btn-primary">
          📞 Appeler les nouvelles commandes · <span className="ar">اتصل بالطلبات الجديدة</span>
        </Link>
        <a href="/" target="_blank" className="dash-btn dash-btn-ghost">
          👁️ Voir ma boutique · <span className="ar">شاهد متجري</span>
        </a>
        <Link href="/dashboard/help" className="dash-btn dash-btn-ghost">
          ❓ Aide et support · <span className="ar">مساعدة ودعم</span>
        </Link>
        <form action={logout}>
          <button className="dash-btn w-full text-gray-500">Se déconnecter · <span className="ar">خروج</span></button>
        </form>
      </div>
      <p className="mt-4 text-center text-xs text-gray-400">
        Abonnement jusqu&apos;au {store.expires_at.slice(0, 10)} · <span className="ar">الاشتراك إلى غاية</span>
      </p>
    </>
  );
}
