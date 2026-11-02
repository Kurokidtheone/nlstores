"use client";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Bi, BiInline, FieldError } from "@/components/dash/ui";
import { Switch } from "@/components/dash/Switch";
import { UploadField } from "@/components/UploadField";
import { VideoEmbed } from "@/designs/shared/VideoEmbed";
import { formatDA } from "@/lib/format";
import { mediaUrl } from "@/lib/media";
import { LIMITS, slugify, type FieldErrors, type ProductInput } from "@/lib/products";
import type { FaqItem, Offer, Product, SectionKey, Sections, VariantGroup } from "@/lib/types";
import { videoEmbed } from "@/lib/video";
import { deleteProduct, duplicateProduct, saveProduct } from "../../../actions";

// Everything is edited in this one state object and sent in one saveProduct() call.
// Numbers stay strings while typing; the server validates and converts them.
type Form = {
  name: string;
  slug: string;
  description: string;
  price: string;
  old_price: string;
  stock: string;
  visible: boolean;
  images: string[];
  video_url: string;
  variants: VariantGroup[];
  offers: { qty: string; total_price: string }[];
  sections: Sections;
};

const toForm = (p: Product | ProductInput, offers: Offer[]): Form => ({
  name: p.name,
  slug: p.slug,
  description: p.description,
  price: String(p.price),
  old_price: p.old_price == null ? "" : String(p.old_price),
  stock: p.stock == null ? "" : String(p.stock),
  visible: p.visible,
  images: p.images,
  video_url: p.video_url ?? "",
  variants: p.variants,
  offers: offers.map((o) => ({ qty: String(o.qty), total_price: String(o.total_price) })),
  sections: p.sections,
});

const num = (s: string) => {
  const d = s.replace(/[\s,.]/g, "");
  return /^\d+$/.test(d) ? Number(d) : null;
};
const digits = (s: string) => s.replace(/[^\d\s]/g, "");

// Order used to scroll to the first error after a failed save
const FIELD_ORDER = ["form", "name", "slug", "description", "price", "old_price", "stock", "images", "video_url", "variants", "offers", "benefits", "steps", "reviews", "faq"];

const JUMPS = [
  { id: "basics", fr: "Infos", ar: "المعلومات" },
  { id: "photos", fr: "Photos", ar: "الصور" },
  { id: "video", fr: "Vidéo", ar: "فيديو" },
  { id: "variants", fr: "Variantes", ar: "الخيارات" },
  { id: "offers", fr: "Offres", ar: "العروض" },
  { id: "landing", fr: "Page", ar: "الصفحة" },
];

export function ProductEditor({ product, offers }: { product: Product; offers: Offer[] }) {
  const initial = useMemo(() => toForm(product, offers), [product, offers]);
  const [form, setForm] = useState<Form>(initial);
  const [saved, setSaved] = useState<Form>(initial);
  const [slugTouched, setSlugTouched] = useState(product.slug !== slugify(product.name));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [discarded, setDiscarded] = useState<string[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isSample, setIsSample] = useState(product.is_sample); // saving makes it the seller's own
  const [saving, startSaving] = useTransition();
  const [busy, startBusy] = useTransition();
  const dirty = JSON.stringify(form) !== JSON.stringify(saved);

  // Warn before leaving with unsaved changes
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  // Scroll to the first field in error
  const scrollToError = useRef(false);
  useEffect(() => {
    if (!scrollToError.current) return;
    scrollToError.current = false;
    const first = FIELD_ORDER.find((k) => errors[k]);
    if (first) document.querySelector(`[data-field="${first}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [errors]);

  // ---- state helpers
  const clearError = (...keys: string[]) =>
    setErrors((e) => (keys.some((k) => e[k]) ? Object.fromEntries(Object.entries(e).filter(([k]) => !keys.includes(k))) : e));
  function set<K extends keyof Form>(key: K, value: Form[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setStatus("idle");
    clearError(key);
  }
  function setSection<K extends keyof Sections>(key: K, value: Sections[K]) {
    setForm((f) => ({ ...f, sections: { ...f.sections, [key]: value } }));
    setStatus("idle");
    clearError(key);
  }
  const toggleSection = (key: SectionKey, on: boolean) =>
    setSection("hide", on ? form.sections.hide.filter((k) => k !== key) : [...form.sections.hide, key]);
  const discard = (key: string) => setDiscarded((d) => [...d, key]);

  function onName(name: string) {
    setForm((f) => ({ ...f, name, slug: slugTouched ? f.slug : slugify(name) || f.slug }));
    setStatus("idle");
    clearError("name", "slug");
  }

  // ---- actions
  function save() {
    startSaving(async () => {
      try {
        const res = await saveProduct(product.id, form, discarded);
        if (res.ok) {
          const next = toForm(res.saved, res.saved.offers);
          setForm(next);
          setSaved(next);
          setDiscarded([]);
          setErrors({});
          setStatus("saved");
          setIsSample(false);
        } else {
          scrollToError.current = true;
          setErrors(res.errors);
          setStatus("error");
        }
      } catch {
        scrollToError.current = true;
        setErrors({ form: { fr: "Erreur réseau, réessayez", ar: "خطأ في الشبكة، أعد المحاولة" } });
        setStatus("error");
      }
    });
  }

  function duplicate() {
    if (dirty && !confirm("Les modifications non enregistrées ne seront pas copiées. Continuer ?\nالتغييرات غير المحفوظة لن تنسخ. متابعة؟")) return;
    startBusy(() => duplicateProduct(product.id));
  }

  // ---- derived hints (the server checks the same rules again)
  const price = num(form.price);
  const oldPrice = num(form.old_price);
  const oldPriceWarning = oldPrice !== null && price !== null && oldPrice <= price;

  return (
    <div className="space-y-4 pb-24">
      {/* Header: plain <a> so the "unsaved changes" warning also fires here */}
      <div className="flex items-center justify-between gap-2">
        <a href="/dashboard/products" className="text-sm text-gray-600">← Produits · المنتجات</a>
        <a href={`/p/${saved.slug}`} target="_blank" rel="noopener" className="dash-btn dash-btn-ghost !min-h-10 text-sm">
          👁️ Aperçu · <span className="ar">معاينة</span>
        </a>
      </div>
      <h1 className="truncate text-2xl font-extrabold">{form.name || "Produit"}</h1>
      {isSample && (
        <p className="rounded-xl border-2 border-amber-300 bg-amber-50 p-3 text-sm font-semibold text-amber-900" data-testid="sample-banner">
          ✏️ Remplacez ce produit exemple par le vôtre : nom, photos, prix… puis Enregistrer.
          <span className="ar mt-1 block">استبدل هذا المنتج التجريبي بمنتجك: الاسم، الصور، السعر… ثم احفظ.</span>
        </p>
      )}

      <nav className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" aria-label="Sections">
        {JUMPS.map((j) => (
          <a key={j.id} href={`#${j.id}`} className="flex-none rounded-full border border-gray-300 bg-white px-3 py-1.5 text-center text-xs leading-tight">
            <span className="block font-semibold">{j.fr}</span>
            <span className="ar block text-gray-500">{j.ar}</span>
          </a>
        ))}
      </nav>

      <div data-field="form">
        <FieldError msg={errors.form} />
      </div>

      {/* 1. BASICS */}
      <Card id="basics" icon="📝" fr="Informations" ar="المعلومات الأساسية">
        <Field name="name" fr="Nom du produit" ar="اسم المنتج" error={errors.name}>
          <input className="dash-input" dir="auto" value={form.name} maxLength={LIMITS.name} onChange={(e) => onName(e.target.value)} aria-invalid={!!errors.name} />
        </Field>

        <Field
          name="slug"
          fr="Lien du produit"
          ar="رابط المنتج"
          error={errors.slug}
          hint={<>Changer le lien casse les anciennes publicités. <span className="ar">تغيير الرابط يوقف الإعلانات القديمة.</span></>}
        >
          <div className="flex items-stretch overflow-hidden rounded-xl border border-gray-300 bg-gray-50" dir="ltr">
            <span className="flex items-center px-3 text-gray-500">/p/</span>
            <input
              className="dash-input !rounded-none !border-0 !border-l"
              value={form.slug}
              maxLength={LIMITS.slug}
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              onChange={(e) => {
                setSlugTouched(true);
                set("slug", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"));
              }}
              onBlur={() => set("slug", slugify(form.slug) || form.slug)}
              aria-invalid={!!errors.slug}
            />
          </div>
        </Field>

        <Field name="description" fr="Description" ar="الوصف" error={errors.description}>
          <textarea className="dash-input min-h-32" dir="auto" value={form.description} maxLength={LIMITS.description} onChange={(e) => set("description", e.target.value)} />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field name="price" fr="Prix (DA)" ar="السعر (دج)" error={errors.price}>
            <input className="dash-input" inputMode="numeric" value={form.price} onChange={(e) => set("price", digits(e.target.value))} aria-invalid={!!errors.price} />
          </Field>
          <Field
            name="old_price"
            fr="Ancien prix"
            ar="السعر القديم"
            error={errors.old_price ?? (oldPriceWarning ? { fr: "Doit être plus élevé que le prix", ar: "يجب أن يكون أعلى من السعر" } : undefined)}
            hint={<>Facultatif, barré · <span className="ar">اختياري، مشطوب</span></>}
          >
            <input className="dash-input" inputMode="numeric" value={form.old_price} onChange={(e) => set("old_price", digits(e.target.value))} aria-invalid={!!errors.old_price || oldPriceWarning} />
          </Field>
        </div>

        <Field name="stock" fr="Stock" ar="المخزون" error={errors.stock} hint={<>Vide = pas suivi · <span className="ar">فارغ = غير محسوب</span></>}>
          <input className="dash-input" inputMode="numeric" value={form.stock} onChange={(e) => set("stock", e.target.value.replace(/\D/g, ""))} aria-invalid={!!errors.stock} />
        </Field>

        <div className="flex items-center justify-between gap-3 rounded-xl bg-gray-50 p-3">
          <Bi fr={form.visible ? "Visible dans la boutique" : "Masqué aux clients"} ar={form.visible ? "ظاهر في المتجر" : "مخفي عن الزبائن"} />
          <Switch checked={form.visible} onChange={(v) => set("visible", v)} label="Visible" />
        </div>
      </Card>

      {/* 2. PHOTOS */}
      <Card id="photos" icon="📷" fr="Photos" ar="الصور">
        <p className="text-sm text-gray-500">
          La 1ʳᵉ photo est la photo principale. Glissez ou utilisez les flèches. <span className="ar block">الصورة الأولى هي الرئيسية. اسحب أو استعمل الأسهم.</span>
        </p>
        <div data-field="images">
          <ImageList
            images={form.images}
            onChange={(images) => set("images", images)}
            onRemove={discard}
          />
          <FieldError msg={errors.images} />
        </div>
        <UploadField
          multiple
          remaining={LIMITS.images - form.images.length}
          onUploaded={(key) => setForm((f) => ({ ...f, images: [...f.images, key].slice(0, LIMITS.images) }))}
        />
        <p className="text-center text-xs text-gray-400">{form.images.length}/{LIMITS.images}</p>
      </Card>

      {/* 3. VIDEO */}
      <Card id="video" icon="🎬" fr="Vidéo" ar="فيديو">
        <Field name="video_url" fr="Lien YouTube ou Facebook" ar="رابط يوتيوب أو فيسبوك" error={errors.video_url}>
          <input
            className="dash-input"
            dir="ltr"
            inputMode="url"
            placeholder="https://youtube.com/watch?v=…"
            value={form.video_url}
            onChange={(e) => set("video_url", e.target.value.trim())}
            aria-invalid={!!errors.video_url}
          />
        </Field>
        {form.video_url && !videoEmbed(form.video_url) && (
          <p className="text-sm text-amber-700">Lien non reconnu · <span className="ar">رابط غير معروف</span></p>
        )}
        {videoEmbed(form.video_url) && (
          <>
            <VideoEmbed url={form.video_url} title="Aperçu" />
            <button type="button" onClick={() => set("video_url", "")} className="dash-btn dash-btn-danger w-full">
              🗑️ <BiInline fr="Retirer la vidéo" ar="حذف الفيديو" />
            </button>
          </>
        )}
      </Card>

      {/* 4. VARIANTS */}
      <Card id="variants" icon="🎨" fr="Variantes" ar="الخيارات (اللون، المقاس…)">
        <div data-field="variants" className="space-y-3">
          {form.variants.map((g, gi) => (
            <div key={gi} className="space-y-2 rounded-xl border border-gray-200 bg-gray-50 p-3">
              <div className="flex gap-2">
                <input
                  className="dash-input font-semibold"
                  dir="auto"
                  value={g.name}
                  maxLength={LIMITS.groupName}
                  placeholder="Couleur, Taille…"
                  aria-label="Nom du groupe"
                  onChange={(e) => set("variants", form.variants.map((x, i) => (i === gi ? { ...x, name: e.target.value } : x)))}
                />
                <button
                  type="button"
                  className="dash-icon-btn flex-none text-red-700"
                  aria-label="Supprimer le groupe"
                  onClick={() => set("variants", form.variants.filter((_, i) => i !== gi))}
                >
                  🗑️
                </button>
              </div>
              <ul className="space-y-2 ps-4">
                {g.options.map((o, oi) => (
                  <li key={oi} className="flex gap-2">
                    <input
                      className="dash-input"
                      dir="auto"
                      value={o}
                      maxLength={LIMITS.optionName}
                      placeholder="Option"
                      aria-label={`Option ${oi + 1}`}
                      autoFocus={o === "" && oi === g.options.length - 1}
                      onChange={(e) =>
                        set("variants", form.variants.map((x, i) => (i === gi ? { ...x, options: x.options.map((y, j) => (j === oi ? e.target.value : y)) } : x)))
                      }
                    />
                    <button
                      type="button"
                      className="dash-icon-btn flex-none"
                      aria-label="Supprimer l'option"
                      onClick={() => set("variants", form.variants.map((x, i) => (i === gi ? { ...x, options: x.options.filter((_, j) => j !== oi) } : x)))}
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
              {g.options.length < LIMITS.options && (
                <button
                  type="button"
                  className="dash-btn dash-btn-ghost w-full !min-h-11 text-sm"
                  onClick={() => set("variants", form.variants.map((x, i) => (i === gi ? { ...x, options: [...x.options, ""] } : x)))}
                >
                  ➕ <BiInline fr="Ajouter une option" ar="إضافة خيار" />
                </button>
              )}
            </div>
          ))}
          <FieldError msg={errors.variants} />
          {form.variants.length < LIMITS.groups && (
            <div>
              <p className="mb-2 text-sm text-gray-600">➕ Ajouter un groupe · <span className="ar">إضافة مجموعة</span></p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { fr: "Couleur", ar: "اللون" },
                  { fr: "Taille", ar: "المقاس" },
                  { fr: "", ar: "", label: "Autre · آخر" },
                ].map((s) => (
                  <button
                    key={s.fr || "other"}
                    type="button"
                    className="dash-btn dash-btn-ghost !min-h-12 !px-2 text-sm"
                    onClick={() => set("variants", [...form.variants, { name: s.fr, options: [""] }])}
                  >
                    {s.label ?? `${s.fr} · ${s.ar}`}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* 5. OFFERS */}
      <Card id="offers" icon="🎁" fr="Offres" ar="العروض (2 قطع، 3 قطع…)">
        <div data-field="offers" className="space-y-3">
          {form.offers.length === 0 && (
            <p className="text-sm text-gray-500">Ex. : 2 pièces → 5 200 DA · <span className="ar">مثال: قطعتان ← 5,200 دج</span></p>
          )}
          {form.offers.map((o, i) => {
            const qty = num(o.qty);
            const total = num(o.total_price);
            const normal = qty && price ? qty * price : null;
            const bad = normal !== null && total !== null && total >= normal;
            return (
              <div key={i} className={`rounded-xl border p-3 ${bad ? "border-red-300 bg-red-50" : "border-gray-200 bg-gray-50"}`}>
                <div className="flex items-end gap-2">
                  <label className="w-20 flex-none space-y-1">
                    <Bi fr="Qté" ar="الكمية" className="text-xs" />
                    <input
                      className="dash-input text-center"
                      inputMode="numeric"
                      value={o.qty}
                      onChange={(e) => set("offers", form.offers.map((x, j) => (j === i ? { ...x, qty: e.target.value.replace(/\D/g, "") } : x)))}
                    />
                  </label>
                  <span className="pb-3 text-xl text-gray-400">→</span>
                  <label className="min-w-0 flex-1 space-y-1">
                    <Bi fr="Prix total (DA)" ar="السعر الإجمالي" className="text-xs" />
                    <input
                      className="dash-input"
                      inputMode="numeric"
                      value={o.total_price}
                      autoFocus={o.total_price === "" && i === form.offers.length - 1}
                      onChange={(e) => set("offers", form.offers.map((x, j) => (j === i ? { ...x, total_price: digits(e.target.value) } : x)))}
                      aria-invalid={bad}
                    />
                  </label>
                  <button type="button" className="dash-icon-btn flex-none" aria-label="Supprimer l'offre" onClick={() => set("offers", form.offers.filter((_, j) => j !== i))}>
                    🗑️
                  </button>
                </div>
                {normal !== null && (
                  <p className={`mt-2 text-sm ${bad ? "font-semibold text-red-700" : "text-gray-600"}`}>
                    {bad ? (
                      <>
                        Doit être moins que <bdi>{formatDA(normal)}</bdi> ({qty} × {price}) · <span className="ar">يجب أن يكون أقل</span>
                      </>
                    ) : total !== null ? (
                      <>
                        Au lieu de <bdi>{formatDA(normal)}</bdi> · le client économise <bdi className="font-semibold text-green-700">{formatDA(normal - total)}</bdi>
                      </>
                    ) : (
                      <>Prix normal : <bdi>{formatDA(normal)}</bdi></>
                    )}
                  </p>
                )}
              </div>
            );
          })}
          <FieldError msg={errors.offers} />
          {form.offers.length < LIMITS.offers && (
            <button
              type="button"
              className="dash-btn dash-btn-ghost w-full"
              onClick={() => {
                const next = Math.max(1, ...form.offers.map((o) => num(o.qty) ?? 1)) + 1;
                set("offers", [...form.offers, { qty: String(Math.min(next, LIMITS.offerQty)), total_price: "" }]);
              }}
            >
              ➕ <BiInline fr="Ajouter une offre" ar="إضافة عرض" />
            </button>
          )}
        </div>
      </Card>

      {/* 6. LANDING PAGE SECTIONS */}
      <div id="landing" className="scroll-mt-4 pt-2">
        <h2 className="text-lg">
          <Bi fr="📄 Sections de la page produit" ar="أقسام صفحة المنتج" className="[&>span:first-child]:font-extrabold" />
        </h2>
      </div>

      <SectionCard k="benefits" fr="Avantages" ar="المميزات" hide={form.sections.hide} onToggle={toggleSection}>
        <LinesEditor
          field="benefits"
          items={form.sections.benefits}
          max={LIMITS.listItems}
          maxLength={LIMITS.line}
          placeholder="Ex. : Résultat dès la 1ʳᵉ semaine"
          addLabel={{ fr: "Ajouter un avantage", ar: "إضافة ميزة" }}
          onChange={(v) => setSection("benefits", v)}
          error={errors.benefits}
        />
      </SectionCard>

      <SectionCard k="steps" fr="Mode d'emploi" ar="طريقة الاستعمال" hide={form.sections.hide} onToggle={toggleSection}>
        <LinesEditor
          field="steps"
          numbered
          multiline
          items={form.sections.steps}
          max={LIMITS.listItems}
          maxLength={LIMITS.step}
          placeholder="Étape · خطوة"
          addLabel={{ fr: "Ajouter une étape", ar: "إضافة خطوة" }}
          onChange={(v) => setSection("steps", v)}
          error={errors.steps}
        />
      </SectionCard>

      <SectionCard k="reviews" fr="Avis clients (captures d'écran)" ar="آراء الزبائن (لقطات شاشة)" hide={form.sections.hide} onToggle={toggleSection}>
        <div data-field="reviews" className="space-y-3">
          {form.sections.reviews.length > 0 && (
            <ul className="grid grid-cols-3 gap-2">
              {form.sections.reviews.map((k) => (
                <li key={k} className="relative overflow-hidden rounded-xl border border-gray-200 bg-gray-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={mediaUrl(k)} alt="" className="aspect-[3/4] w-full object-cover" />
                  <button
                    type="button"
                    aria-label="Supprimer l'avis"
                    className="absolute end-1 top-1 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow"
                    onClick={() => {
                      setSection("reviews", form.sections.reviews.filter((x) => x !== k));
                      discard(k);
                    }}
                  >
                    🗑️
                  </button>
                </li>
              ))}
            </ul>
          )}
          <FieldError msg={errors.reviews} />
          <UploadField
            multiple
            remaining={LIMITS.reviews - form.sections.reviews.length}
            label={{ fr: "Ajouter des captures", ar: "إضافة لقطات" }}
            onUploaded={(key) => setForm((f) => ({ ...f, sections: { ...f.sections, reviews: [...f.sections.reviews, key].slice(0, LIMITS.reviews) } }))}
          />
        </div>
      </SectionCard>

      <SectionCard k="faq" fr="Questions fréquentes" ar="الأسئلة الشائعة" hide={form.sections.hide} onToggle={toggleSection}>
        <FaqEditor items={form.sections.faq} onChange={(v) => setSection("faq", v)} error={errors.faq} />
      </SectionCard>

      {/* 7. OTHER ACTIONS */}
      <Card id="actions" icon="⚙️" fr="Actions" ar="إجراءات">
        <a href={`/p/${saved.slug}`} target="_blank" rel="noopener" className="dash-btn dash-btn-ghost w-full">
          👁️ <BiInline fr="Aperçu" ar="معاينة" />
        </a>
        {dirty && <p className="-mt-2 text-center text-xs text-gray-500">L&apos;aperçu montre la dernière version enregistrée · المعاينة تعرض آخر نسخة محفوظة</p>}
        <button type="button" disabled={busy} onClick={duplicate} className="dash-btn dash-btn-ghost w-full">
          📄 <BiInline fr="Dupliquer le produit" ar="نسخ المنتج" />
        </button>
        {!confirmDelete ? (
          <button type="button" onClick={() => setConfirmDelete(true)} className="dash-btn dash-btn-danger w-full">
            🗑️ <BiInline fr="Supprimer" ar="حذف" />
          </button>
        ) : (
          <div className="space-y-3 rounded-xl border-2 border-red-300 bg-red-50 p-3" role="alertdialog" aria-label="Confirmer la suppression">
            <p className="text-center font-semibold text-red-800">
              Supprimer « {saved.name} » et ses photos pour toujours ?
              <span className="ar block">حذف المنتج وصوره نهائيا؟</span>
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setConfirmDelete(false)} className="dash-btn dash-btn-ghost">
                Annuler · <span className="ar">إلغاء</span>
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => startBusy(() => deleteProduct(product.id))}
                className="dash-btn bg-red-600 text-white"
              >
                Oui, supprimer · <span className="ar">نعم</span>
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* Sticky Save bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-gray-200 bg-white/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] backdrop-blur">
        <div className="mx-auto max-w-2xl">
          <p className="mb-1 min-h-5 text-center text-xs font-semibold" aria-live="polite">
            {saving ? (
              <span className="text-gray-500">Enregistrement… · جاري الحفظ</span>
            ) : status === "error" ? (
              <span className="text-red-700">Corrigez les champs en rouge · صحح الخانات باللون الأحمر</span>
            ) : dirty ? (
              <span className="text-amber-700">Modifications non enregistrées · تغييرات غير محفوظة</span>
            ) : status === "saved" ? (
              <span className="text-green-700">Enregistré ✓ Visible tout de suite · تم الحفظ</span>
            ) : null}
          </p>
          <button type="button" onClick={save} disabled={saving || busy} className="dash-btn dash-btn-primary min-h-14 w-full text-lg">
            💾 Enregistrer · <span className="ar">حفظ</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ pieces

function Card({ id, icon, fr, ar, children }: { id: string; icon: string; fr: string; ar: string; children: React.ReactNode }) {
  return (
    <section id={id} className="dash-card scroll-mt-4 space-y-4 p-4">
      <h2 className="flex items-center gap-2 text-lg">
        <span aria-hidden>{icon}</span>
        <Bi fr={fr} ar={ar} className="[&>span:first-child]:font-extrabold" />
      </h2>
      {children}
    </section>
  );
}

function Field({
  name,
  fr,
  ar,
  error,
  hint,
  children,
}: {
  name: string;
  fr: string;
  ar: string;
  error?: { fr: string; ar: string };
  hint?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div data-field={name}>
      <label className="block space-y-1">
        <Bi fr={fr} ar={ar} />
        {children}
      </label>
      {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
      <FieldError msg={error} />
    </div>
  );
}

function SectionCard({
  k,
  fr,
  ar,
  hide,
  onToggle,
  children,
}: {
  k: SectionKey;
  fr: string;
  ar: string;
  hide: SectionKey[];
  onToggle: (k: SectionKey, on: boolean) => void;
  children: React.ReactNode;
}) {
  const on = !hide.includes(k);
  return (
    <section className={`dash-card space-y-3 p-4 ${on ? "" : "bg-gray-50"}`}>
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base">
          <Bi fr={fr} ar={ar} className="[&>span:first-child]:font-bold" />
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">{on ? "Affiché · ظاهر" : "Masqué · مخفي"}</span>
          <Switch checked={on} onChange={(v) => onToggle(k, v)} label={`${fr} : afficher`} />
        </div>
      </div>
      <div className={on ? "" : "opacity-60"}>{children}</div>
    </section>
  );
}

/** Photos: drag (desktop) or arrows (phone) to reorder, trash to remove. First = main. */
function ImageList({ images, onChange, onRemove }: { images: string[]; onChange: (v: string[]) => void; onRemove: (key: string) => void }) {
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const move = (from: number, to: number) => {
    if (to < 0 || to >= images.length || from === to) return;
    const next = [...images];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  };
  if (images.length === 0)
    return <p className="rounded-xl bg-gray-50 py-6 text-center text-sm text-gray-500">Aucune photo · <span className="ar">لا توجد صور</span></p>;
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {images.map((k, i) => (
        <li
          key={k}
          draggable
          onDragStart={() => setDragFrom(i)}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(i);
          }}
          onDragLeave={() => setDragOver(null)}
          onDrop={(e) => {
            e.preventDefault();
            if (dragFrom !== null) move(dragFrom, i);
            setDragFrom(null);
            setDragOver(null);
          }}
          onDragEnd={() => {
            setDragFrom(null);
            setDragOver(null);
          }}
          className={`overflow-hidden rounded-xl border-2 bg-white ${dragOver === i ? "border-[var(--brand)]" : i === 0 ? "border-green-500" : "border-gray-200"} ${dragFrom === i ? "opacity-50" : ""}`}
        >
          <div className="relative cursor-grab active:cursor-grabbing">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={mediaUrl(k)} alt={`Photo ${i + 1}`} className="aspect-square w-full object-cover" draggable={false} />
            <span className={`absolute start-1 top-1 rounded-full px-2 py-0.5 text-xs font-bold ${i === 0 ? "bg-green-600 text-white" : "bg-white/90 text-gray-700"}`}>
              {i === 0 ? "Principale · رئيسية" : i + 1}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-1 p-1">
            <button type="button" className="dash-icon-btn !min-w-0" disabled={i === 0} onClick={() => move(i, i - 1)} aria-label="Vers la gauche">
              ←
            </button>
            <button type="button" className="dash-icon-btn !min-w-0" disabled={i === images.length - 1} onClick={() => move(i, i + 1)} aria-label="Vers la droite">
              →
            </button>
            <button
              type="button"
              className="dash-icon-btn !min-w-0 text-red-700"
              aria-label="Supprimer la photo"
              onClick={() => {
                onChange(images.filter((x) => x !== k));
                onRemove(k);
              }}
            >
              🗑️
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}

function LinesEditor({
  field,
  items,
  onChange,
  max,
  maxLength,
  placeholder,
  addLabel,
  numbered,
  multiline,
  error,
}: {
  field: string;
  items: string[];
  onChange: (v: string[]) => void;
  max: number;
  maxLength: number;
  placeholder: string;
  addLabel: { fr: string; ar: string };
  numbered?: boolean;
  multiline?: boolean;
  error?: { fr: string; ar: string };
}) {
  const update = (i: number, v: string) => onChange(items.map((x, j) => (j === i ? v : x)));
  return (
    <div data-field={field} className="space-y-2">
      {items.map((it, i) => (
        <div key={i} className="flex items-start gap-2">
          <span className="w-6 flex-none pt-3 text-center font-bold text-gray-400">{numbered ? i + 1 : "✓"}</span>
          {multiline ? (
            <textarea
              className="dash-input min-h-12"
              dir="auto"
              rows={2}
              value={it}
              maxLength={maxLength}
              placeholder={placeholder}
              autoFocus={it === "" && i === items.length - 1}
              onChange={(e) => update(i, e.target.value)}
            />
          ) : (
            <input
              className="dash-input"
              dir="auto"
              value={it}
              maxLength={maxLength}
              placeholder={placeholder}
              autoFocus={it === "" && i === items.length - 1}
              onChange={(e) => update(i, e.target.value)}
            />
          )}
          <button type="button" className="dash-icon-btn flex-none" aria-label="Supprimer" onClick={() => onChange(items.filter((_, j) => j !== i))}>
            ✕
          </button>
        </div>
      ))}
      <FieldError msg={error} />
      {items.length < max && (
        <button type="button" className="dash-btn dash-btn-ghost w-full" onClick={() => onChange([...items, ""])}>
          ➕ <BiInline fr={addLabel.fr} ar={addLabel.ar} />
        </button>
      )}
    </div>
  );
}

function FaqEditor({ items, onChange, error }: { items: FaqItem[]; onChange: (v: FaqItem[]) => void; error?: { fr: string; ar: string } }) {
  const update = (i: number, patch: Partial<FaqItem>) => onChange(items.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  return (
    <div data-field="faq" className="space-y-3">
      {items.map((f, i) => (
        <div key={i} className="space-y-2 rounded-xl border border-gray-200 bg-gray-50 p-3">
          <div className="flex gap-2">
            <input
              className="dash-input font-semibold"
              dir="auto"
              value={f.q}
              maxLength={LIMITS.faqQ}
              placeholder="Question · السؤال"
              aria-label={`Question ${i + 1}`}
              autoFocus={f.q === "" && f.a === "" && i === items.length - 1}
              onChange={(e) => update(i, { q: e.target.value })}
            />
            <button type="button" className="dash-icon-btn flex-none" aria-label="Supprimer la question" onClick={() => onChange(items.filter((_, j) => j !== i))}>
              🗑️
            </button>
          </div>
          <textarea
            className="dash-input min-h-20"
            dir="auto"
            value={f.a}
            maxLength={LIMITS.faqA}
            placeholder="Réponse · الجواب"
            aria-label={`Réponse ${i + 1}`}
            onChange={(e) => update(i, { a: e.target.value })}
          />
        </div>
      ))}
      <FieldError msg={error} />
      {items.length < LIMITS.listItems && (
        <button type="button" className="dash-btn dash-btn-ghost w-full" onClick={() => onChange([...items, { q: "", a: "" }])}>
          ➕ <BiInline fr="Ajouter une question" ar="إضافة سؤال" />
        </button>
      )}
    </div>
  );
}
