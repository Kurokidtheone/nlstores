"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/dashboard", icon: "🏠", fr: "Accueil", ar: "الرئيسية" },
  { href: "/dashboard/orders", icon: "📦", fr: "Commandes", ar: "الطلبات" },
  { href: "/dashboard/products", icon: "🛍️", fr: "Produits", ar: "المنتجات" },
  { href: "/dashboard/delivery", icon: "🚚", fr: "Livraison", ar: "التوصيل" },
  { href: "/dashboard/settings", icon: "⚙️", fr: "Réglages", ar: "الإعدادات" },
];

export function NavBar() {
  // Works with both the public path (/dashboard/x) and the rewritten one (/s/<host>/dashboard/x)
  const path = usePathname().replace(/^\/s\/[^/]+/, "");
  // The product editor has its own sticky Save bar
  if (/^\/dashboard\/products\/\d+/.test(path)) return null;
  const active = (href: string) => (href === "/dashboard" ? path === href : path.startsWith(href));
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)]">
      <ul className="mx-auto grid max-w-2xl grid-cols-5">
        {TABS.map((t) => (
          <li key={t.href}>
            <Link
              href={t.href}
              className={`flex min-h-16 flex-col items-center justify-center gap-0.5 text-[11px] leading-tight ${active(t.href) ? "font-bold text-[var(--brand)]" : "text-gray-500"}`}
            >
              <span className="text-xl" aria-hidden>{t.icon}</span>
              <span>{t.fr}</span>
              <span className="ar">{t.ar}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
