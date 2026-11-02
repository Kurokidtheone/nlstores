import Link from "next/link";
import { Bi, PageTitle } from "@/components/dash/ui";
import { formatDA } from "@/lib/format";
import { getStats } from "@/lib/orders";
import { requireSeller } from "@/lib/tenant";
import { logout } from "../actions";

export default async function DashboardHome() {
  const { store, db } = await requireSeller();
  const s = await getStats(db, store.id);
  const cards = [
    { fr: "Aujourd'hui", ar: "اليوم", v: s.today, href: "/dashboard/orders" },
    { fr: "À appeler", ar: "للاتصال", v: s.pending, href: "/dashboard/orders?s=new" },
    { fr: "Confirmées", ar: "مؤكدة", v: s.confirmed, href: "/dashboard/orders?s=confirmed" },
    { fr: "Livrées", ar: "تم التوصيل", v: s.delivered, href: "/dashboard/orders?s=delivered" },
  ];
  return (
    <>
      <PageTitle fr={store.name} ar="لوحة التحكم" />
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
