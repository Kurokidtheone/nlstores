"use client";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { DesignThumb } from "@/components/dash/DesignThumb";
import { UploadField } from "@/components/UploadField";
import { DESIGNS } from "@/designs/registry";
import { getTemplate } from "@/designs/templates";
import { WILAYAS } from "@/lib/algeria/wilayas";
import { formatDA } from "@/lib/format";
import { QUICK_PHOTOS, QUICK_PRODUCTS, normalizeCustomDomain } from "@/lib/onboarding";
import { PAYMENT_METHODS, plusOneYear, planAmount } from "@/lib/plans";
import { slugify } from "@/lib/products";
import type { Lang } from "@/lib/types";
import { checkSlug, createStoreFull, type SlugCheck, type Welcome } from "../../actions";
import { WelcomePanel } from "../../WelcomePanel";

type ProductRow = { name: string; price: string; old_price: string; photos: string[] };
const emptyRow = (): ProductRow => ({ name: "", price: "", old_price: "", photos: [] });
const today = () => new Date().toISOString().slice(0, 10);
const dmy = (iso: string) => iso.slice(0, 10).split("-").reverse().join("/");
const adminMedia = (key: string) => `/api/admin/media/${key}`;

function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="dash-card space-y-4 p-4">
      <h2 className="flex items-center gap-2 text-lg font-extrabold">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--brand)] text-sm text-white">{n}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function Field({ label, error, hint, children }: { label: string; error?: string; hint?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <label className="block space-y-1">
        <span className="block font-semibold">{label}</span>
        {children}
      </label>
      {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
      {error && <p role="alert" className="mt-1 text-sm font-medium text-red-600">{error}</p>}
    </div>
  );
}

export function NewStoreForm({ rootDomain }: { rootDomain: string }) {
  // Client
  const [clientName, setClientName] = useState("");
  const [phone, setPhone] = useState("");
  const [wilaya, setWilaya] = useState(0);
  const [facebook, setFacebook] = useState("");
  const [requestRef, setRequestRef] = useState("");
  // Store
  const [storeName, setStoreName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [slugCheck, setSlugCheck] = useState<SlugCheck | null>(null);
  const [design, setDesign] = useState("glow");
  const [lang, setLang] = useState<Lang>("ar");
  const [domain, setDomain] = useState("");
  // Payment
  const [amount, setAmount] = useState(String(planAmount(false)));
  const [amountTouched, setAmountTouched] = useState(false);
  const [method, setMethod] = useState("ccp");
  const [receipt, setReceipt] = useState<string | null>(null);
  const [start, setStart] = useState(today());
  // Quick products
  const [rows, setRows] = useState<ProductRow[]>([]);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [welcome, setWelcome] = useState<Welcome | null>(null);
  const [pending, startTransition] = useTransition();

  // Slug follows the store name until edited by hand
  useEffect(() => {
    if (!slugTouched) setSlug(slugify(storeName).slice(0, 32).replace(/-+$/, ""));
  }, [storeName, slugTouched]);

  // Live "available / taken" check (debounced)
  useEffect(() => {
    if (!slug) {
      setSlugCheck(null);
      return;
    }
    let stale = false;
    const t = setTimeout(async () => {
      const res = await checkSlug(slug);
      if (!stale) setSlugCheck(res);
    }, 350);
    return () => {
      stale = true;
      clearTimeout(t);
    };
  }, [slug]);

  // Amount follows the plan until typed by hand: 20,000 DA, 25,000 DA with a custom domain
  const normalizedDomain = domain.trim() ? normalizeCustomDomain(domain) : null;
  useEffect(() => {
    if (!amountTouched) setAmount(String(planAmount(!!domain.trim())));
  }, [domain, amountTouched]);

  const endDate = /^\d{4}-\d{2}-\d{2}$/.test(start) ? plusOneYear(start) : null;
  const setRow = (i: number, patch: Partial<ProductRow>) => setRows((r) => r.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const template = getTemplate(design);

  function submit() {
    setErrors({});
    startTransition(async () => {
      try {
        const res = await createStoreFull({
          client: { name: clientName, phone, wilaya, facebook, request_ref: requestRef },
          store: { name: storeName, slug, design, lang, custom_domain: domain },
          payment: { amount, method, receipt_key: receipt, start },
          products: rows,
        });
        if (res.ok) {
          setWelcome(res.welcome);
          window.scrollTo({ top: 0 });
        } else {
          setErrors(res.errors);
          requestAnimationFrame(() => document.querySelector('[role="alert"]')?.scrollIntoView({ behavior: "smooth", block: "center" }));
        }
      } catch (e) {
        setErrors({ form: `Erreur réseau : ${String(e)}` });
      }
    });
  }

  if (welcome) {
    return (
      <div className="space-y-4">
        <WelcomePanel welcome={welcome} title="✅ Boutique en ligne !" />
        <div className="grid gap-2">
          <a href="/stores/new" className="dash-btn dash-btn-primary">➕ Créer une autre boutique</a>
          <Link href="/" className="dash-btn dash-btn-ghost">← Liste des boutiques</Link>
        </div>
      </div>
    );
  }

  const slugStatus = !slug ? null : slugCheck?.slug !== slug ? (
    <span className="text-gray-500">Vérification…</span>
  ) : slugCheck.available ? (
    <span className="font-semibold text-green-700">✓ Disponible</span>
  ) : (
    <span className="font-semibold text-red-700">✗ {slugCheck.reason}</span>
  );

  return (
    <div className="space-y-4 pb-28">
      {errors.form && <p role="alert" className="rounded-xl bg-red-100 p-3 font-semibold text-red-800">{errors.form}</p>}

      <Section n={1} title="Client">
        <Field label="Nom du client" error={errors["client.name"]}>
          <input className="dash-input" dir="auto" value={clientName} onChange={(e) => setClientName(e.target.value)} autoComplete="off" />
        </Field>
        <Field label="Téléphone (identifiant de connexion)" error={errors["client.phone"]}>
          <input className="dash-input" dir="ltr" inputMode="tel" placeholder="05 / 06 / 07 …" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </Field>
        <Field label="Wilaya" error={errors["client.wilaya"]}>
          <select className="dash-input" value={wilaya} onChange={(e) => setWilaya(Number(e.target.value))}>
            <option value={0}>Choisir…</option>
            {WILAYAS.map((w) => (
              <option key={w.code} value={w.code}>
                {String(w.code).padStart(2, "0")} - {w.fr}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Page Facebook (facultatif)" error={errors["client.facebook"]}>
          <input className="dash-input" dir="ltr" inputMode="url" placeholder="https://facebook.com/…" value={facebook} onChange={(e) => setFacebook(e.target.value)} />
        </Field>
        <Field label="N° de demande Next Level (facultatif)" error={errors["client.request_ref"]}>
          <input className="dash-input" dir="ltr" placeholder="ST-0042" value={requestRef} onChange={(e) => setRequestRef(e.target.value.toUpperCase())} />
        </Field>
      </Section>

      <Section n={2} title="Boutique">
        <Field label="Nom de la boutique" error={errors["store.name"]}>
          <input className="dash-input" dir="auto" value={storeName} onChange={(e) => setStoreName(e.target.value)} />
        </Field>
        <Field label="Adresse" error={errors["store.slug"]} hint={slugStatus}>
          <div className="flex items-center overflow-hidden rounded-xl border border-gray-300 bg-gray-50" dir="ltr">
            <input
              className="dash-input !rounded-none !border-0"
              value={slug}
              autoCapitalize="off"
              spellCheck={false}
              aria-label="Sous-domaine"
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
              }}
            />
            <span className="flex-none px-2 text-sm text-gray-500">.{rootDomain}</span>
          </div>
        </Field>
        <div>
          <p className="mb-2 font-semibold">Design</p>
          <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Design">
            {DESIGNS.map((d) => {
              const t = getTemplate(d.id);
              const on = d.id === design;
              return (
                <button
                  key={d.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setDesign(d.id)}
                  className={`rounded-2xl border-2 p-2 text-left ${on ? "border-[var(--brand)] bg-indigo-50" : "border-transparent bg-gray-50"}`}
                >
                  <DesignThumb design={d} primary={t.colors.primary} accent={t.colors.accent} />
                  <span className="mt-1 block font-bold">{on && "✓ "}{d.name}</span>
                  <span className="block text-xs leading-tight text-gray-500">{d.tagline.fr}</span>
                </button>
              );
            })}
          </div>
          {errors["store.design"] && <p role="alert" className="mt-1 text-sm text-red-600">{errors["store.design"]}</p>}
        </div>
        <div>
          <p className="mb-2 font-semibold">Langue de la boutique</p>
          <div className="grid grid-cols-2 gap-2">
            {(["ar", "fr"] as const).map((l) => (
              <button key={l} type="button" aria-pressed={lang === l} onClick={() => setLang(l)} className={`dash-btn ${lang === l ? "dash-btn-primary" : "dash-btn-ghost"}`}>
                {l === "ar" ? "العربية" : "Français"}
              </button>
            ))}
          </div>
        </div>
        <Field
          label="Domaine .com du client (facultatif)"
          error={errors["store.custom_domain"]}
          hint={normalizedDomain && normalizedDomain !== "invalid" ? <>Sera branché sur <b>{normalizedDomain}</b> (+5 000 DA)</> : "Ex. maboutique.com — laissez vide pour le sous-domaine seul"}
        >
          <input className="dash-input" dir="ltr" inputMode="url" autoCapitalize="off" placeholder="maboutique.com" value={domain} onChange={(e) => setDomain(e.target.value)} />
        </Field>
        <p className="rounded-xl bg-gray-50 p-3 text-xs text-gray-600">
          Contenu de départ ({lang === "ar" ? "arabe" : "français"}) : bandeau « {template.announcement[lang]} », textes livraison/retours, FAQ, prix de livraison 600 / 400 DA (Sud 900 / 600 DA)
          {rows.some((r) => r.name) ? ", vos produits rapides." : <>, produit exemple « {template.sample[lang].name} ».</>}
        </p>
      </Section>

      <Section n={3} title="Paiement">
        <Field label="Montant (DA)" error={errors["payment.amount"]} hint={`Formule : ${formatDA(planAmount(false))} · avec domaine ${formatDA(planAmount(true))}`}>
          <input
            className="dash-input"
            inputMode="numeric"
            value={amount}
            onChange={(e) => {
              setAmountTouched(true);
              setAmount(e.target.value.replace(/[^\d\s]/g, ""));
            }}
          />
        </Field>
        <div>
          <p className="mb-2 font-semibold">Moyen de paiement</p>
          <div className="grid grid-cols-2 gap-2">
            {PAYMENT_METHODS.map((m) => (
              <button key={m.id} type="button" aria-pressed={method === m.id} onClick={() => setMethod(m.id)} className={`dash-btn !min-h-12 ${method === m.id ? "dash-btn-primary" : "dash-btn-ghost"}`}>
                {m.fr}
              </button>
            ))}
          </div>
          {errors["payment.method"] && <p role="alert" className="mt-1 text-sm text-red-600">{errors["payment.method"]}</p>}
        </div>
        <div className="space-y-2">
          <p className="font-semibold">Reçu de paiement</p>
          {receipt && (
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={adminMedia(receipt)} alt="Reçu" className="h-20 w-20 rounded-xl border object-cover" />
              <button type="button" onClick={() => setReceipt(null)} className="dash-btn dash-btn-danger !min-h-11 text-sm">Retirer</button>
            </div>
          )}
          <UploadField endpoint="/api/admin/upload?kind=receipt" label={{ fr: receipt ? "Changer le reçu" : "Photo du reçu", ar: "صورة الوصل" }} onUploaded={setReceipt} />
          {errors["payment.receipt_key"] && <p role="alert" className="text-sm text-red-600">{errors["payment.receipt_key"]}</p>}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Début" error={errors["payment.start"]}>
            <input type="date" className="dash-input" value={start} onChange={(e) => setStart(e.target.value)} />
          </Field>
          <div>
            <p className="mb-1 font-semibold">Fin (1 an)</p>
            <p className="flex min-h-12 items-center rounded-xl bg-gray-100 px-3 font-bold" data-testid="end-date">{endDate ? dmy(endDate) : "—"}</p>
          </div>
        </div>
      </Section>

      <Section n={4} title="Produits rapides (facultatif)">
        <p className="text-sm text-gray-500">S&apos;ils sont remplis, ils remplacent le produit exemple. Le client complète le reste dans son tableau de bord.</p>
        {rows.map((r, i) => (
          <div key={i} className="space-y-2 rounded-xl border border-gray-200 bg-gray-50 p-3" data-testid={`product-row-${i}`}>
            <div className="flex items-center justify-between">
              <p className="font-bold">Produit {i + 1}</p>
              <button type="button" className="dash-icon-btn" aria-label={`Retirer le produit ${i + 1}`} onClick={() => setRows((x) => x.filter((_, j) => j !== i))}>🗑️</button>
            </div>
            <input className="dash-input" dir="auto" placeholder="Nom" aria-label={`Nom du produit ${i + 1}`} value={r.name} onChange={(e) => setRow(i, { name: e.target.value })} />
            <div className="grid grid-cols-2 gap-2">
              <input className="dash-input" inputMode="numeric" placeholder="Prix DA" aria-label={`Prix du produit ${i + 1}`} value={r.price} onChange={(e) => setRow(i, { price: e.target.value.replace(/[^\d\s]/g, "") })} />
              <input className="dash-input" inputMode="numeric" placeholder="Ancien prix" aria-label={`Ancien prix du produit ${i + 1}`} value={r.old_price} onChange={(e) => setRow(i, { old_price: e.target.value.replace(/[^\d\s]/g, "") })} />
            </div>
            {r.photos.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {r.photos.map((k) => (
                  <div key={k} className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={adminMedia(k)} alt="" className="h-16 w-16 rounded-lg object-cover" />
                    <button type="button" aria-label="Retirer la photo" onClick={() => setRow(i, { photos: r.photos.filter((x) => x !== k) })} className="absolute -right-1 -top-1 h-6 w-6 rounded-full bg-white text-xs shadow">✕</button>
                  </div>
                ))}
              </div>
            )}
            <UploadField
              multiple
              endpoint="/api/admin/upload"
              remaining={QUICK_PHOTOS - r.photos.length}
              onUploaded={(key) => setRows((x) => x.map((row, j) => (j === i ? { ...row, photos: [...row.photos, key].slice(0, QUICK_PHOTOS) } : row)))}
            />
            {errors[`products.${i}`] && <p role="alert" className="text-sm font-medium text-red-600">{errors[`products.${i}`]}</p>}
          </div>
        ))}
        {errors.products && <p role="alert" className="text-sm text-red-600">{errors.products}</p>}
        {rows.length < QUICK_PRODUCTS && (
          <button type="button" className="dash-btn dash-btn-ghost w-full" onClick={() => setRows((x) => [...x, emptyRow()])}>
            ➕ Ajouter un produit ({rows.length}/{QUICK_PRODUCTS})
          </button>
        )}
      </Section>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-gray-200 bg-white/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur">
        <div className="mx-auto max-w-3xl">
          <button type="button" onClick={submit} disabled={pending} className="dash-btn dash-btn-primary min-h-14 w-full text-lg">
            {pending ? "Création…" : "🚀 Créer et mettre en ligne"}
          </button>
        </div>
      </div>
    </div>
  );
}
