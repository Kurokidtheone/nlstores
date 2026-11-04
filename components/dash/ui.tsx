// Small building blocks for the seller dashboard: French first, Arabic underneath.
import type { Msg } from "@/lib/types";

/** Two-line label: French, then Arabic */
export function Bi({ fr, ar, className = "" }: { fr: string; ar: string; className?: string }) {
  return (
    <span className={`block ${className}`}>
      <span className="block font-semibold leading-tight">{fr}</span>
      <span className="ar block text-[0.85em] font-normal leading-tight text-gray-500">{ar}</span>
    </span>
  );
}

/** Inline "Français · عربي" for buttons */
export function BiInline({ fr, ar }: { fr: string; ar: string }) {
  return (
    <span>
      {fr} · <span className="ar">{ar}</span>
    </span>
  );
}

export function FieldError({ msg, id }: { msg?: Msg; id?: string }) {
  if (!msg) return null;
  return (
    <p id={id} role="alert" className="mt-1 text-sm font-medium text-red-600">
      {msg.fr}
      <span className="ar block">{msg.ar}</span>
    </p>
  );
}

export function PageTitle({ fr, ar, children }: { fr: string; ar: string; children?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3">
      <h1 className="text-2xl">
        <Bi fr={fr} ar={ar} className="[&>span:first-child]:font-extrabold" />
      </h1>
      {children}
    </div>
  );
}
