"use client";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { t } from "@/lib/i18n";
import type { Lang } from "@/lib/types";

type C = { fr: string; ar: string; a: string[] };
const cache = new Map<number, Promise<C[]>>();

function load(wilaya: number): Promise<C[]> {
  if (!cache.has(wilaya)) {
    cache.set(
      wilaya,
      fetch(`/api/communes/${wilaya}`)
        .then((r) => (r.ok ? (r.json() as Promise<C[]>) : []))
        .catch(() => {
          cache.delete(wilaya);
          return [];
        }),
    );
  }
  return cache.get(wilaya)!;
}

/** Lowercase, no accents, Arabic letter variants unified: "Aïn" ~ "ain", "أ/إ/آ" ~ "ا", "ة" ~ "ه" */
function norm(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ًͯ-ٟـ]/g, "")
    .toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/[^a-z0-9؀-ۿ]+/g, "");
}

type Props = {
  lang: Lang;
  wilaya: number;
  value: string;
  onChange: (commune: string) => void;
  inputClass?: string;
  invalid?: boolean;
  id?: string;
};

/**
 * Searchable commune dropdown filtered by the chosen wilaya, with "Other" + free text as a fallback.
 * The value is plain text (orders.commune): the French name of the chosen commune, or what was typed.
 */
export function CommuneSelect({ lang, wilaya, value, onChange, inputClass = "store-input", invalid, id }: Props) {
  const [list, setList] = useState<C[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [other, setOther] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const firstLoad = useRef(true);
  const listId = useId();

  useEffect(() => {
    if (!wilaya) {
      setList([]);
      return;
    }
    let stale = false;
    const first = firstLoad.current;
    firstLoad.current = false;
    // Wilaya changed by the user: the old commune does not belong to the new wilaya, clear it now
    if (!first && value) {
      setOther(false);
      onChange("");
    }
    setList([]); // never show the previous wilaya's communes while the new list loads
    setLoading(true);
    load(wilaya).then((l) => {
      if (stale) return;
      setList(l);
      setLoading(false);
      // First load (editing an existing order): a commune typed by hand stays, in "Other" mode
      if (first && value && !l.some((c) => c.fr === value)) setOther(true);
    });
    return () => {
      stale = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wilaya]);

  // Close when tapping outside
  useEffect(() => {
    const onDown = (e: PointerEvent) => box.current && !box.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, []);

  const filtered = useMemo(() => {
    const q = norm(query);
    if (!q) return list;
    return list.filter((c) => [c.fr, c.ar, ...c.a].some((n) => norm(n).includes(q)));
  }, [list, query]);

  const label = (c: C) => (lang === "ar" ? c.ar : c.fr);
  const sub = (c: C) => (lang === "ar" ? c.fr : c.ar);
  const selected = list.find((c) => c.fr === value);

  if (!wilaya) {
    return <input id={id} className={inputClass} disabled placeholder={t(lang, "commune_choose_wilaya")} aria-invalid={invalid} />;
  }

  if (other) {
    return (
      <div className="space-y-1">
        <input
          id={id}
          className={inputClass}
          dir="auto"
          autoFocus
          value={value}
          maxLength={80}
          placeholder={t(lang, "commune_other")}
          aria-invalid={invalid}
          onChange={(e) => onChange(e.target.value)}
        />
        <button
          type="button"
          className="text-xs underline opacity-70"
          onClick={() => {
            setOther(false);
            onChange("");
          }}
        >
          ↩ {t(lang, "commune_search")}
        </button>
      </div>
    );
  }

  return (
    <div ref={box} className="relative">
      <input
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-invalid={invalid}
        className={inputClass}
        dir="auto"
        autoComplete="off"
        placeholder={loading ? "…" : t(lang, "commune_search")}
        value={open ? query : selected ? label(selected) : value}
        onFocus={() => {
          setQuery("");
          setOpen(true);
        }}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
      />
      {open && (
        <ul
          id={listId}
          role="listbox"
          className="absolute inset-x-0 top-full z-40 mt-1 max-h-64 overflow-y-auto rounded-xl border border-gray-200 bg-white text-start text-gray-900 shadow-lg"
        >
          {filtered.map((c) => (
            <li key={c.fr} role="option" aria-selected={c.fr === value}>
              <button
                type="button"
                className={`flex w-full items-baseline justify-between gap-3 px-4 py-3 text-start ${c.fr === value ? "bg-gray-100 font-semibold" : ""}`}
                onClick={() => {
                  onChange(c.fr);
                  setOpen(false);
                }}
              >
                <span>{label(c)}</span>
                <span className="text-xs text-gray-500" dir="auto">{sub(c)}</span>
              </button>
            </li>
          ))}
          {!loading && filtered.length === 0 && <li className="px-4 py-3 text-sm text-gray-500">{t(lang, "commune_none")}</li>}
          <li role="option" aria-selected={false} className="border-t border-gray-100">
            <button
              type="button"
              className="w-full px-4 py-3 text-start font-semibold"
              onClick={() => {
                setOther(true);
                setOpen(false);
                onChange(query.trim());
              }}
            >
              ✏️ {t(lang, "commune_other")}
            </button>
          </li>
        </ul>
      )}
    </div>
  );
}
