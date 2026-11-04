import { t } from "@/lib/i18n";
import type { Lang } from "@/lib/types";

const ICONS = {
  // banknote, truck, eye: inline SVG, no icon library
  cod: "M3 7h18v10H3zM7 12h.01M17 12h.01M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  truck: "M3 6h11v9H3zM14 9h4l3 3v3h-7M7 18.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM17 18.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z",
  check: "M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
};

/** Under the price, every design: pay on delivery · 69 wilayas · check before paying */
export function TrustStrip({ lang }: { lang: Lang }) {
  const items = [
    { d: ICONS.cod, label: t(lang, "trust_cod") },
    { d: ICONS.truck, label: t(lang, "trust_69") },
    { d: ICONS.check, label: t(lang, "trust_check") },
  ];
  return (
    <ul className="store-trust grid grid-cols-3 gap-2" aria-label={t(lang, "cod")}>
      {items.map((it) => (
        <li key={it.label} className="store-trust-item flex flex-col items-center gap-1 rounded-xl px-1 py-2 text-center text-xs font-semibold leading-tight">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="store-trust-icon">
            <path d={it.d} />
          </svg>
          {it.label}
        </li>
      ))}
    </ul>
  );
}
