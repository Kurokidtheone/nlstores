"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "📅 Aujourd'hui" },
  { href: "/stores", label: "🏪 Boutiques" },
  { href: "/stores/new", label: "➕ Nouvelle" },
];

export function AdminNav({ logout }: { logout: () => Promise<void> }) {
  const path = usePathname().replace(/^\/admin/, "") || "/";
  return (
    <nav className="sticky top-0 z-30 border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-3xl items-center gap-1 overflow-x-auto px-2 py-2">
        {LINKS.map((l) => {
          const on = l.href === "/" ? path === "/" : l.href === "/stores" ? path === "/stores" : path.startsWith(l.href);
          return (
            <Link key={l.href} href={l.href} className={`flex-none rounded-xl px-3 py-2 text-sm font-semibold ${on ? "bg-[var(--brand)] text-white" : "text-gray-700"}`}>
              {l.label}
            </Link>
          );
        })}
        <form action={logout} className="ms-auto flex-none">
          <button className="rounded-xl px-3 py-2 text-sm text-gray-500">Quitter</button>
        </form>
      </div>
    </nav>
  );
}
